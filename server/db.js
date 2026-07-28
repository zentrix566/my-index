/**
 * 统一数据层：生产使用 PostgreSQL，本地验证使用 SQLite。
 * - 存储层隔离：业务代码只调用本文件导出的干净接口，不碰 SQL
 * - 连接参数来自环境变量（默认值适合常见托管 PG）：
 *     PG_HOST      必填（如 rds.xxx.aliyuncs.com）
 *     PG_PASS      必填，建议经 Secret 注入
 *     PG_USER      默认 postgres
 *     PG_DATABASE  默认 zentrix
 *     PG_PORT      默认 5432
 *     PG_SSL       设 "false" 关闭；否则默认 sslmode=require（rejectUnauthorized:false，兼容自签证书）
 * - 业务接口均为 async（pg 基于回调/Promise），调用点需 await
 */
import pg from 'pg'
import path from 'node:path'
import { getAchievementMeta } from './achievements-meta.js'

const { Pool } = pg
const isLocalDevMode =
  process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'

let localStorePromise

async function getLocalStore() {
  if (!localStorePromise) {
    const filePath = path.resolve(
      process.env.LOCAL_SQLITE_PATH || path.join('data', 'app.local.db')
    )
    localStorePromise = import('./db/local-sqlite.js').then(
      ({ createLocalSqliteStore }) => createLocalSqliteStore(filePath)
    )
  }
  return localStorePromise
}

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  database: process.env.PG_DATABASE || 'zentrix',
  password: process.env.PG_PASS,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

let poolClosed = false

/** 停止接收 HTTP 请求后关闭数据库连接池。 */
export async function closeDatabase() {
  if (poolClosed) return
  poolClosed = true
  if (isLocalDevMode) {
    const localStore = await getLocalStore()
    localStore.close()
    return
  }
  await pool.end()
}

// ========== 建表（幂等，首次部署自动执行）==========
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 邮箱：找回密码用。可空（旧账号/所有者可能没绑），唯一性在应用层保证（兼容 SQLite 加约束的方言差异）。
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- 密码重置令牌：存原始 token 的 SHA-256，原始 token 只出现在邮件链接里
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_reset_tokens(user_id);

-- 邮箱激活：未激活用户不算「正式用户」。无邮箱账号始终未激活。
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emailverify_user ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS achievement_progress (
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL,
  stages_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  count           INT NOT NULL DEFAULT 0,
  achievement_name TEXT,
  version         TEXT,
  hero_class      TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- 兼容已存在的旧表：补上后加的可读列（幂等）
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS achievement_name TEXT;
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS hero_class TEXT;

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);

CREATE TABLE IF NOT EXISTS ai_advisor_usage (
  user_key    TEXT NOT NULL,
  day         TEXT NOT NULL,
  fixed_count INT NOT NULL DEFAULT 0,
  free_count  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

let schemaReady = false
export async function ensureSchema() {
  if (isLocalDevMode) {
    await getLocalStore()
    return
  }
  if (schemaReady) return
  await pool.query(SCHEMA_SQL)
  schemaReady = true
}

// ========== 干净接口（业务层只调用这些，均为 async）==========

// 按用户名查用户（含 password_hash，仅内部鉴权用）
export async function getUserByUsername(username) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getUserByUsername(username)
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
  return rows[0] || null
}

// 按 id 查用户（对外脱敏，不含 password_hash；含 email 供本人查看）
export async function getUserById(id) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getUserById(id)
  }
  const { rows } = await pool.query(
    'SELECT id, username, email, email_verified, has_password, created_at FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

// 创建用户，返回新 id；email 可选（注册时可不填）
export async function createUser(username, passwordHash, email = null) {
  if (isLocalDevMode) {
    return (await getLocalStore()).createUser(username, passwordHash, email)
  }
  const { rows } = await pool.query(
    'INSERT INTO users(username, password_hash, email) VALUES($1, $2, $3) RETURNING id',
    [username, passwordHash, email || null]
  )
  return rows[0].id
}

// 按邮箱查用户（找回密码与邮箱唯一校验；邮箱忽略大小写）
export async function getUserByEmail(email) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getUserByEmail(email)
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])
  return rows[0] || null
}

// 按用户名或邮箱查用户（找回密码入口；邮箱忽略大小写）
export async function getUserByIdentifier(identifier) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getUserByIdentifier(identifier)
  }
  const { rows } = await pool.query(
    'SELECT id, username, email FROM users WHERE username = $1 OR LOWER(email) = LOWER($1)',
    [identifier]
  )
  return rows[0] || null
}

// 按 id 查用户（含 password_hash 与 email，仅供改密码校验/发信，不外泄）
export async function getUserAuthById(id) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getUserAuthById(id)
  }
  const { rows } = await pool.query(
    'SELECT id, username, password_hash, email, has_password FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

// 设置/清空邮箱；空串或 null 视为清空
export async function setUserEmail(userId, email) {
  if (isLocalDevMode) {
    return (await getLocalStore()).setUserEmail(userId, email)
  }
  await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email || null, userId])
}

// 设置邮箱激活状态（true=已激活）。改邮箱/清空邮箱时置 false。
export async function setEmailVerified(userId, verified) {
  if (isLocalDevMode) {
    return (await getLocalStore()).setEmailVerified(userId, verified)
  }
  await pool.query('UPDATE users SET email_verified = $1 WHERE id = $2', [verified, userId])
}

// 设置是否已有密码（无密码账号在个人中心走「设置密码」）
export async function setHasPassword(userId, value) {
  if (isLocalDevMode) {
    return (await getLocalStore()).setHasPassword(userId, value)
  }
  await pool.query('UPDATE users SET has_password = $1 WHERE id = $2', [value, userId])
}

// 创建邮箱激活令牌（仅存 token 的 SHA-256，原始 token 只出现在邮件链接）
export async function createVerificationToken(userId, tokenHash, expiresAt) {
  if (isLocalDevMode) {
    return (await getLocalStore()).createVerificationToken(userId, tokenHash, expiresAt)
  }
  await pool.query(
    'INSERT INTO email_verification_tokens(token_hash, user_id, expires_at) VALUES($1, $2, $3)',
    [tokenHash, userId, expiresAt]
  )
}

// 取有效（未用且未过期）激活令牌；无效返回 null
export async function getValidVerificationToken(tokenHash) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getValidVerificationToken(tokenHash)
  }
  const { rows } = await pool.query(
    'SELECT token_hash, user_id, expires_at, consumed_at FROM email_verification_tokens WHERE token_hash = $1',
    [tokenHash]
  )
  const row = rows[0]
  if (!row || row.consumed_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return row
}

// 消费激活令牌（标记已用），并把用户标记为已激活、作废其余未完成令牌
export async function consumeVerificationToken(tokenHash, userId) {
  if (isLocalDevMode) {
    return (await getLocalStore()).consumeVerificationToken(tokenHash, userId)
  }
  await pool.query(
    'UPDATE email_verification_tokens SET consumed_at = now() WHERE token_hash = $1',
    [tokenHash]
  )
  if (userId) {
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId])
    await pool.query(
      'UPDATE email_verification_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL AND token_hash <> $2',
      [userId, tokenHash]
    )
  }
}

// 作废某用户全部未完成激活令牌，避免更换邮箱后旧链接仍可激活。
export async function invalidateUserVerificationTokens(userId) {
  if (isLocalDevMode) {
    return (await getLocalStore()).invalidateUserVerificationTokens(userId)
  }
  await pool.query(
    'UPDATE email_verification_tokens SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL',
    [userId]
  )
}

// 按 id 更新密码哈希
export async function updatePasswordById(userId, passwordHash) {
  if (isLocalDevMode) {
    return (await getLocalStore()).updatePasswordById(userId, passwordHash)
  }
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
}

// 创建重置令牌（只存 token 的 SHA-256，原始 token 仅在邮件链接出现）
export async function createResetToken(userId, tokenHash, expiresAt) {
  if (isLocalDevMode) {
    return (await getLocalStore()).createResetToken(userId, tokenHash, expiresAt)
  }
  await pool.query(
    'INSERT INTO password_reset_tokens(token_hash, user_id, expires_at) VALUES($1, $2, $3)',
    [tokenHash, userId, expiresAt]
  )
}

// 取有效（未用且未过期）重置令牌；无效返回 null
export async function getValidResetToken(tokenHash) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getValidResetToken(tokenHash)
  }
  const { rows } = await pool.query(
    'SELECT token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1',
    [tokenHash]
  )
  const row = rows[0]
  if (!row || row.used_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return row
}

// 消费令牌（标记已用），并作废该用户其余未完成令牌，避免旧链接复用
export async function consumeResetToken(tokenHash, userId) {
  if (isLocalDevMode) {
    return (await getLocalStore()).consumeResetToken(tokenHash, userId)
  }
  await pool.query(
    'UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1',
    [tokenHash]
  )
  if (userId) {
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL AND token_hash <> $2',
      [userId, tokenHash]
    )
  }
}

// 作废某用户全部未完成重置令牌（改密成功后调用）
export async function invalidateUserResetTokens(userId) {
  if (isLocalDevMode) {
    return (await getLocalStore()).invalidateUserResetTokens(userId)
  }
  await pool.query(
    'UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
    [userId]
  )
}

// 写回单条进度（upsert），自动带入成就名称与版本（便于查库排查）
// 可选传入 client（事务内复用同一连接）；不传则用连接池
export async function upsertProgress(userId, achievementId, stages, count, client) {
  const meta = getAchievementMeta(achievementId)
  if (isLocalDevMode) {
    return (await getLocalStore()).upsertProgress(userId, {
      achievementId,
      stages,
      count,
      name: meta.name,
      version: meta.version,
      heroClass: meta.heroClass
    })
  }
  const q = client || pool
  await q.query(
    `INSERT INTO achievement_progress(user_id, achievement_id, stages_json, count, achievement_name, version, hero_class, updated_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT(user_id, achievement_id)
     DO UPDATE SET stages_json = EXCLUDED.stages_json, count = EXCLUDED.count,
                   achievement_name = EXCLUDED.achievement_name, version = EXCLUDED.version,
                   hero_class = EXCLUDED.hero_class, updated_at = now()`,
    [
      userId,
      achievementId,
      JSON.stringify(stages || {}),
      count || 0,
      meta.name,
      meta.version,
      meta.heroClass
    ]
  )
}

// 批量 upsert 进度：用 UNNEST 把 N 条插入合并为单条 SQL，将 N 次数据库往返降为 1 次。
// 与单条 upsertProgress 语义一致（ON CONFLICT 更新同列），仅减少往返次数，高网络延迟下收益明显。
// entries: [{ achievementId, stages, count, name, version, heroClass }]
export async function bulkUpsertProgress(userId, entries, client) {
  if (!entries || entries.length === 0) return
  if (isLocalDevMode) {
    return (await getLocalStore()).bulkUpsertProgress(userId, entries)
  }
  const achievementIds = []
  const stagesArr = []
  const counts = []
  const names = []
  const versions = []
  const heroClasses = []
  for (const e of entries) {
    achievementIds.push(e.achievementId)
    stagesArr.push(JSON.stringify(e.stages || {}))
    counts.push(e.count || 0)
    names.push(e.name)
    versions.push(e.version)
    heroClasses.push(e.heroClass)
  }
  const q = client || pool
  await q.query(
    `INSERT INTO achievement_progress (user_id, achievement_id, stages_json, count, achievement_name, version, hero_class, updated_at)
     SELECT $1, u.achievement_id, u.stages_json::jsonb, u.count, u.achievement_name, u.version, u.hero_class, now()
     FROM UNNEST($2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::text[])
       AS u(achievement_id, stages_json, count, achievement_name, version, hero_class)
     ON CONFLICT (user_id, achievement_id) DO UPDATE SET
       stages_json = EXCLUDED.stages_json,
       count = EXCLUDED.count,
       achievement_name = EXCLUDED.achievement_name,
       version = EXCLUDED.version,
       hero_class = EXCLUDED.hero_class,
       updated_at = now()`,
    [userId, achievementIds, stagesArr, counts, names, versions, heroClasses]
  )
}

// 读取某用户全部进度，返回结构 { [achievementId]: { stages, count } }
// 与前端现有 progressData 结构完全一致，前端零改造复用
export async function getProgress(userId) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getProgress(userId)
  }
  const { rows } = await pool.query(
    'SELECT achievement_id, stages_json, count FROM achievement_progress WHERE user_id = $1',
    [userId]
  )
  const out = {}
  for (const r of rows) {
    // pg 的 JSONB 默认已解析为对象；个别驱动配置下可能是字符串，统一兜底
    const stages =
      typeof r.stages_json === 'string' ? JSON.parse(r.stages_json) : (r.stages_json || {})
    out[r.achievement_id] = {
      stages,
      count: r.count
    }
  }
  return out
}

// 事务包装：fn(client) 内可执行多条 SQL，自动 BEGIN/COMMIT/ROLLBACK
export async function transaction(fn) {
  if (isLocalDevMode) return fn(null)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ========== AI 建议每日额度（按 用户/IP + 日期 限流）==========
// user_key：登录用户用 userId，匿名用 `ip:<地址>`；day 为本地日期 YYYY-MM-DD
export async function getAiUsage(userKey, day) {
  if (isLocalDevMode) {
    return (await getLocalStore()).getAiUsage(userKey, day)
  }
  const { rows } = await pool.query(
    'SELECT fixed_count, free_count FROM ai_advisor_usage WHERE user_key = $1 AND day = $2',
    [userKey, day]
  )
  const row = rows[0]
  return { fixedCount: row?.fixed_count || 0, freeCount: row?.free_count || 0 }
}

// 累加当日某类型额度（fixed / free），返回更新后的值
export async function incrementAiUsage(userKey, day, type) {
  const col = type === 'free' ? 'free_count' : 'fixed_count'
  if (isLocalDevMode) {
    return (await getLocalStore()).incrementAiUsage(userKey, day, type)
  }
  const { rows } = await pool.query(
    `INSERT INTO ai_advisor_usage(user_key, day, ${col}) VALUES($1, $2, 1)
     ON CONFLICT(user_key, day) DO UPDATE SET ${col} = ai_advisor_usage.${col} + 1
     RETURNING fixed_count, free_count`,
    [userKey, day]
  )
  const row = rows[0]
  return { fixedCount: row.fixed_count || 0, freeCount: row.free_count || 0 }
}

export default pool
