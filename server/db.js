/**
 * PostgreSQL 数据层（node-postgres / pg）
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
import { getAchievementMeta } from './achievements-meta.js'

const { Pool } = pg
const isLocalDevMode =
  process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'

// 显式开启的本地验证模式：数据只存在当前 Node 进程中，重启即清空。
const localUsersById = new Map()
const localUserIdsByName = new Map()
const localProgressByUser = new Map()
let localNextUserId = 1

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

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

let schemaReady = false
export async function ensureSchema() {
  if (isLocalDevMode) return
  if (schemaReady) return
  await pool.query(SCHEMA_SQL)
  schemaReady = true
}

// 启动时确保表存在（失败仅记录，不阻塞服务启动）
ensureSchema().catch((e) => console.error('[db] 建表失败:', e))

// ========== 干净接口（业务层只调用这些，均为 async）==========

// 按用户名查用户（含 password_hash，仅内部鉴权用）
export async function getUserByUsername(username) {
  if (isLocalDevMode) {
    const id = localUserIdsByName.get(username)
    return id ? { ...localUsersById.get(id) } : null
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
  return rows[0] || null
}

// 按 id 查用户（对外脱敏，不含 password_hash）
export async function getUserById(id) {
  if (isLocalDevMode) {
    const user = localUsersById.get(Number(id))
    if (!user) return null
    const { password_hash: _passwordHash, ...safeUser } = user
    return { ...safeUser }
  }
  const { rows } = await pool.query(
    'SELECT id, username, created_at FROM users WHERE id = $1',
    [id]
  )
  return rows[0] || null
}

// 创建用户，返回新 id
export async function createUser(username, passwordHash) {
  if (isLocalDevMode) {
    if (localUserIdsByName.has(username)) {
      const error = new Error('用户名已存在')
      error.code = '23505'
      throw error
    }
    const id = localNextUserId++
    const user = {
      id,
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    }
    localUsersById.set(id, user)
    localUserIdsByName.set(username, id)
    return id
  }
  const { rows } = await pool.query(
    'INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id',
    [username, passwordHash]
  )
  return rows[0].id
}

// 写回单条进度（upsert），自动带入成就名称与版本（便于查库排查）
// 可选传入 client（事务内复用同一连接）；不传则用连接池
export async function upsertProgress(userId, achievementId, stages, count, client) {
  const meta = getAchievementMeta(achievementId)
  if (isLocalDevMode) {
    const normalizedUserId = Number(userId)
    const userProgress = localProgressByUser.get(normalizedUserId) || new Map()
    userProgress.set(achievementId, {
      stages: { ...(stages || {}) },
      count: count || 0,
      achievement_name: meta.name,
      version: meta.version,
      hero_class: meta.heroClass,
      updated_at: new Date().toISOString()
    })
    localProgressByUser.set(normalizedUserId, userProgress)
    return
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

// 读取某用户全部进度，返回结构 { [achievementId]: { stages, count } }
// 与前端现有 progressData 结构完全一致，前端零改造复用
export async function getProgress(userId) {
  if (isLocalDevMode) {
    const rows = localProgressByUser.get(Number(userId)) || new Map()
    const out = {}
    for (const [achievementId, progress] of rows) {
      out[achievementId] = {
        stages: { ...progress.stages },
        count: progress.count
      }
    }
    return out
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

export default pool
