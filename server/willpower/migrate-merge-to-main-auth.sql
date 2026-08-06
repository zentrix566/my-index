-- ============================================================================
-- 心魔并入站点主账号体系：一次性数据合并（针对 owner 的实际账号）
-- ----------------------------------------------------------------------------
-- 背景（按你给的 id 核对）：
--   主库 users 表：Owner(id=1, 有全部炉石等数据) / zentrix566(id=2, 未使用)
--   心魔库 zentrix_willpower：zentrix566(id=1, 有心魔数据)
--
-- 目标：统一为一个「zentrix566」账号，沿用主库 id=1。
--   关键巧合：主库 id=1 与心魔 id=1 恰好同号，因此心魔业务数据的 user_id
--   本就是 1，天然对得上主库 id=1 —— 无需迁移任何业务数据，零风险。
--
-- 本脚本分两段，分别跑在「主库」和「心魔库」两个独立 PG 上：
--   第 1 段（主库）：删掉多余的 id=2，把 Owner(id=1) 改名 zentrix566
--   第 2 段（心魔库）：丢弃心魔独立 users 表，业务数据不动
--
-- 执行顺序：
--   1) psql 连主库，执行「第 1 段」
--   2) psql 连心魔库，执行「第 2 段」
--   3) 部署新代码（server/ 改动需重建镜像 + kubectl rollout restart）
--   4) 用 zentrix566 + Owner 的原密码登录验证
-- ============================================================================


-- ============================================================================
-- 第 1 段：在主库（主站 users 表所在库）执行
-- ============================================================================

-- 0) 先核对账号清单，确认 id=1 是 Owner、id=2 未使用后再继续
SELECT id, username, email, display_name, has_password
FROM users
ORDER BY id;

-- 1) 删除未使用的主站 zentrix566(id=2)
--    先确认它名下确实没有任何业务数据（炉石等业务表若引用 users(id)，id=2 应为 0 行）。
--    若有外键指向 users(id)=2，先清空对应业务行再 DELETE。
DELETE FROM users WHERE id = 2;

-- 2) 把 Owner(id=1) 用户名改为 zentrix566（统一登录身份）
--    注意：务必先执行上面的 DELETE，否则 username 唯一约束会冲突。
UPDATE users SET username = 'zentrix566' WHERE id = 1;

-- 3) 展示昵称 display_name 保持「Owner」不动（仅作昵称，可留）。
--    若想一并改成 zentrix566，取消下一行注释：
-- UPDATE users SET display_name = 'zentrix566' WHERE id = 1;

-- 主库段校验：应只剩一行 id=1，username=zentrix566
SELECT id, username, display_name, has_password FROM users ORDER BY id;


-- ============================================================================
-- 第 2 段：在心魔库（zentrix_willpower）执行
-- ============================================================================

-- 0) 核对心魔业务数据 user_id 分布（预期全部 = 1，与主库 id=1 同号）
--    下列 *_bad 应都为 0；若某行非 0，先人工确认再继续。
SELECT
  (SELECT count(*) FROM demons              WHERE user_id <> 1) AS demons_bad,
  (SELECT count(*) FROM resistances         WHERE user_id <> 1) AS resistances_bad,
  (SELECT count(*) FROM positive_logs       WHERE user_id <> 1) AS positive_logs_bad,
  (SELECT count(*) FROM positive_activities WHERE user_id <> 1) AS positive_activities_bad,
  (SELECT count(*) FROM custom_achievements WHERE user_id <> 1) AS custom_achievements_bad,
  (SELECT count(*) FROM achievement_unlocks WHERE user_id <> 1) AS achievement_unlocks_bad,
  (SELECT count(*) FROM ai_report_usage     WHERE user_id <> 1) AS ai_report_usage_bad,
  (SELECT count(*) FROM ai_reports          WHERE user_id <> 1) AS ai_reports_bad;

-- 1) 删除所有指向心魔 users 表的外键约束（旧 schema 曾写 REFERENCES users(id)）
DO $$
DECLARE
  rec RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'users 表已不存在，推测迁移已完成，跳过外键清理。';
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
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', rec.table_name, rec.constraint_name);
    RAISE NOTICE 'DROP FK %.%', rec.table_name, rec.constraint_name;
  END LOOP;
END $$;

-- 2) 业务表 user_id 重映射：因心魔 uid(1) == 主库 uid(1)，业务数据无需改动。
--    若将来某个心魔账号的 uid 与主库不一致，再执行下方通用重映射（把 1 改成实际主库 uid）：
--    DO $$
--    DECLARE rec RECORD; n INT;
--    BEGIN
--      FOR rec IN
--        SELECT table_name FROM information_schema.columns
--        WHERE column_name = 'user_id' AND table_schema = 'public'
--          AND table_name NOT IN ('users','password_reset_tokens')
--      LOOP
--        EXECUTE format('UPDATE %I SET user_id = 1 WHERE user_id = 1', rec.table_name);
--        GET DIAGNOSTICS n = ROW_COUNT;
--        RAISE NOTICE 'UPDATE %: % 行', rec.table_name, n;
--      END LOOP;
--    END $$;

-- 3) 丢弃心魔独立认证表（账号已并入主站）
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;

-- 心魔库段校验：users 表应已不存在；业务表行数不变
SELECT
  (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users') AS users_table_exists,
  (SELECT count(*) FROM demons)              AS demons_rows,
  (SELECT count(*) FROM resistances)         AS resistances_rows,
  (SELECT count(*) FROM positive_logs)       AS positive_logs_rows,
  (SELECT count(*) FROM positive_activities) AS positive_activities_rows,
  (SELECT count(*) FROM custom_achievements) AS custom_achievements_rows,
  (SELECT count(*) FROM achievement_unlocks) AS achievement_unlocks_rows,
  (SELECT count(*) FROM ai_report_usage)     AS ai_report_usage_rows,
  (SELECT count(*) FROM ai_reports)          AS ai_reports_rows;
