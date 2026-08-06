-- ============================================================================
-- 认证库独立化：把主库（zentrix）中的账号体系整体搬到独立库（zentrix_auth）
-- ----------------------------------------------------------------------------
-- 目标：
--   认证库 zentrix_auth ← users / password_reset_tokens / email_verification_tokens
--                        / module_activity（新增，记录「谁用了哪些模块」）
--   业务库 zentrix      ← achievement_progress / hearthstone_profiles / ai_advisor_usage
--                        （数据原地不动，只把 user_id 上的外键去掉）
--
-- 原则：
--   * 业务数据不搬家。炉石进度是业务数据、不是身份数据，留在业务库。
--   * 拆库后跨库无法建外键，user_id 仅作普通整数列，关联在应用层保证。
--   * 用户 id 不变，因此所有业务行的 user_id 天然继续对得上，零重映射。
--
-- 执行顺序总览：
--   1) 主库跑「第 0 段」预检，记下各表行数
--   2) 建库：CREATE DATABASE zentrix_auth;
--   3) 新库跑「第 1 段」建表
--   4) 终端跑「第 2 段」的 pg_dump 命令搬数据
--   5) 新库跑「第 3 段」修序列并校验
--   6) 主库跑「第 4 段」删外键、「第 5 段」DROP 认证表
--   7) 给服务配 AUTH_DB_URL=postgres://用户:密码@主机:5432/zentrix_auth
--   8) 重建镜像 + kubectl rollout restart（server/ 有改动必须重建）
--   9) 登录验证 + 访问炉石/心魔各一次 + 查 /api/auth/admin/module-usage
--
-- 回滚：第 5 段 DROP 之前都可以随时中止（新库直接 DROP DATABASE 即可，
--       主库数据尚未动过）。DROP 之后回滚需从备份恢复，故第 5 段前务必先
--       pg_dump 全库备份一次。
-- ============================================================================


-- ============================================================================
-- 第 0 段：在主库（zentrix）执行 —— 迁移前预检，记下这些数字
-- ============================================================================

SELECT
  (SELECT count(*) FROM users)                       AS users_rows,
  (SELECT max(id)  FROM users)                       AS users_max_id,
  (SELECT count(*) FROM password_reset_tokens)       AS reset_tokens_rows,
  (SELECT count(*) FROM email_verification_tokens)   AS verify_tokens_rows,
  (SELECT count(*) FROM achievement_progress)        AS progress_rows,
  (SELECT count(*) FROM hearthstone_profiles)        AS profile_rows;

-- 业务表里是否存在「孤儿 user_id」（指向已不存在的用户）。拆库后没有外键兜底，
-- 建议先清理干净；下列两个计数都应为 0。
SELECT
  (SELECT count(*) FROM achievement_progress p
     WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id)) AS orphan_progress,
  (SELECT count(*) FROM hearthstone_profiles f
     WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = f.user_id)) AS orphan_profiles;

-- 现有账号清单（迁移后要能一一对上）
SELECT id, username, email, display_name, email_verified, has_password, created_at
FROM users ORDER BY id;


-- ============================================================================
-- 第 1 段：在新建的认证库（zentrix_auth）执行 —— 建表
-- ----------------------------------------------------------------------------
-- 先在 psql 里：CREATE DATABASE zentrix_auth;  然后 \c zentrix_auth
-- 本段与 server/db/auth-db.js 里的 AUTH_SCHEMA_SQL 保持一致，
-- 即使不手动执行，服务启动时 ensureAuthSchema() 也会自动建出同样的结构。
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emailverify_user ON email_verification_tokens(user_id);

-- 新增：模块使用记录（谁用过炉石 / 心魔 / 以后的新模块）
CREATE TABLE IF NOT EXISTS module_activity (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module        TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module)
);


-- ============================================================================
-- 第 2 段：在终端执行 —— 把三张表的数据从主库搬到认证库
-- ----------------------------------------------------------------------------
-- 只搬数据（表结构第 1 段已建好），--data-only 保证不覆盖上面的 schema。
-- 顺序不能乱：users 必须先于两张 token 表（外键依赖）。
--
--   pg_dump "postgres://用户:密码@主机:5432/zentrix" \
--     --data-only --no-owner --no-privileges \
--     -t users -t password_reset_tokens -t email_verification_tokens \
--     > /tmp/auth-data.sql
--
--   psql "postgres://用户:密码@主机:5432/zentrix_auth" \
--     -v ON_ERROR_STOP=1 -f /tmp/auth-data.sql
--
-- 若 psql 报唯一键冲突，说明新库里已有数据（例如服务已启动过并注册了账号），
-- 先在新库 TRUNCATE users CASCADE; 清空后重来。
-- 搬完记得删掉 /tmp/auth-data.sql（内含密码哈希）。
-- ============================================================================


-- ============================================================================
-- 第 3 段：在认证库（zentrix_auth）执行 —— 修正序列 + 校验
-- ============================================================================

-- --data-only 不会同步 SERIAL 序列的当前值，不修的话下次注册会主键冲突
SELECT setval(
  pg_get_serial_sequence('users', 'id'),
  COALESCE((SELECT max(id) FROM users), 0) + 1,
  false
);

-- 校验：三个行数应与第 0 段完全一致
SELECT
  (SELECT count(*) FROM users)                     AS users_rows,
  (SELECT max(id)  FROM users)                     AS users_max_id,
  (SELECT count(*) FROM password_reset_tokens)     AS reset_tokens_rows,
  (SELECT count(*) FROM email_verification_tokens) AS verify_tokens_rows;

-- 账号清单也应与第 0 段逐行一致（尤其 id 不能变）
SELECT id, username, email, display_name, email_verified, has_password, created_at
FROM users ORDER BY id;


-- ============================================================================
-- 第 4 段：在主库（zentrix）执行 —— 摘掉业务表指向 users 的外键
-- ----------------------------------------------------------------------------
-- 拆库后 users 不在本库，外键必须先删，否则第 5 段 DROP 会失败。
-- 与 server/db/business-db.js 里 BUSINESS_SCHEMA_SQL 的定义对齐（user_id 为普通 INT）。
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'users 表已不存在，推测迁移已执行过，跳过外键清理。';
    RETURN;
  END IF;

  FOR rec IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
      -- token 表本身要整表 DROP，不必单独摘外键
      AND tc.table_name NOT IN ('password_reset_tokens', 'email_verification_tokens')
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', rec.table_name, rec.constraint_name);
    RAISE NOTICE 'DROP FK %.%', rec.table_name, rec.constraint_name;
  END LOOP;
END $$;


-- ============================================================================
-- 第 5 段：在主库（zentrix）执行 —— 丢弃已搬走的认证表
-- ----------------------------------------------------------------------------
-- 危险操作，不可逆。执行前必须满足：
--   * 第 3 段校验已通过（新库行数与账号清单完全对得上）
--   * 已用 pg_dump 做过主库全库备份
--   * 服务已配好 AUTH_DB_URL 并验证过能登录（建议先切流量再删表，
--     即先执行第 7～9 步验证无误，隔一两天再回来执行本段）
-- ============================================================================

-- DROP TABLE IF EXISTS email_verification_tokens;
-- DROP TABLE IF EXISTS password_reset_tokens;
-- DROP TABLE IF EXISTS users;


-- ============================================================================
-- 第 6 段：在主库（zentrix）执行 —— 最终校验
-- ============================================================================

-- users_table_exists 应为 0（第 5 段已执行时）；业务行数应与第 0 段一致
SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users') AS users_table_exists,
  (SELECT count(*) FROM achievement_progress)                AS progress_rows,
  (SELECT count(*) FROM hearthstone_profiles)                AS profile_rows,
  (SELECT count(*) FROM ai_advisor_usage)                    AS ai_usage_rows;

-- 确认业务表已无任何指向 users 的外键（应为 0 行）
SELECT tc.table_name, tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND tc.table_schema = 'public';
