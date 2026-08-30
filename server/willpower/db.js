/**
 * 「抵御心魔」模块的独立数据层。
 * - 与炉石模块的 server/db.js 完全隔离：独立连接池、独立建表、独立 SQLite 文件
 * - 生产连独立的 PostgreSQL 库（WILLPOWER_PG_DATABASE，默认 zentrix_willpower）
 * - 本地开发（LOCAL_DEV_MODE=true）落 SQLite 文件，接口行为与 PG 一致
 * - 两种方言共用同一份业务 SQL：占位符统一写 $1/$2，SQLite 驱动内部转成 ?
 * - 时间列统一用 TEXT 存 ISO 8601 UTC 字符串：跨库读出来永远是字符串，
 *   避免 pg 返回 Date、SQLite 返回字符串导致的两套处理逻辑
 * - 布尔统一用 SMALLINT 0/1：better-sqlite3 不接受 boolean 绑定
 */
import pg from 'pg'
import path from 'node:path'
import { getBuiltinDemon, isBuiltinDemon } from './catalog.js'
import { buildDropLegacyUserForeignKeysSql } from '../db/schema-compat.js'

const { Pool } = pg

const isLocalDevMode =
  process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'

/** 心魔库的连接参数：主机/账号默认沿用主库配置，只有库名必须独立。 */
function readPgConfig() {
  return {
    host: process.env.WILLPOWER_PG_HOST || process.env.PG_HOST,
    port: parseInt(process.env.WILLPOWER_PG_PORT || process.env.PG_PORT || '5432', 10),
    user: process.env.WILLPOWER_PG_USER || process.env.PG_USER || 'postgres',
    database: process.env.WILLPOWER_PG_DATABASE || 'zentrix_willpower',
    password: process.env.WILLPOWER_PG_PASS || process.env.PG_PASS,
    ssl:
      (process.env.WILLPOWER_PG_SSL || process.env.PG_SSL) === 'false'
        ? false
        : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  }
}

// better-sqlite3 不接受 boolean / undefined / Date 绑定，统一在驱动层归一化
function normalizeParams(params) {
  return (params || []).map((value) => {
    if (value === undefined) return null
    if (typeof value === 'boolean') return value ? 1 : 0
    if (value instanceof Date) return value.toISOString()
    return value
  })
}

// $1/$2 占位符转成 SQLite 的 ?，并按出现顺序重排参数（同一个 $n 可重复出现）
function toSqliteStatement(sql, params) {
  const values = []
  const text = sql.replace(/\$(\d+)/g, (_, index) => {
    values.push(params[Number(index) - 1])
    return '?'
  })
  return { text, values }
}

function buildSchema(dialect) {
  const pk = dialect === 'pg' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'
  return `
CREATE TABLE IF NOT EXISTS demons (
  id ${pk},
  user_id INTEGER NOT NULL,
  demon_key TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  description TEXT,
  is_builtin SMALLINT NOT NULL DEFAULT 0,
  archived SMALLINT NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, demon_key)
);

CREATE TABLE IF NOT EXISTS resistances (
  id ${pk},
  user_id INTEGER NOT NULL,
  demon_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT NOT NULL DEFAULT 'quick',
  intensity SMALLINT NOT NULL DEFAULT 3,
  duration_sec INTEGER NOT NULL DEFAULT 600,
  started_at TEXT NOT NULL,
  resolved_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_resist_user ON resistances(user_id, started_at);

CREATE TABLE IF NOT EXISTS positive_logs (
  id ${pk},
  user_id INTEGER NOT NULL,
  activity_key TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  unit TEXT,
  note TEXT,
  happened_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_positive_user ON positive_logs(user_id, happened_at);

CREATE TABLE IF NOT EXISTS positive_activities (
  id ${pk},
  user_id INTEGER NOT NULL,
  activity_key TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  unit TEXT,
  input_mode TEXT NOT NULL DEFAULT 'count',
  archived SMALLINT NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, activity_key)
);

CREATE INDEX IF NOT EXISTS idx_wp_activity_user ON positive_activities(user_id, sort_order);

CREATE TABLE IF NOT EXISTS custom_achievements (
  id ${pk},
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_json TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  hidden SMALLINT NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, code)
);

CREATE TABLE IF NOT EXISTS achievement_unlocks (
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 0,
  unlocked_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, code)
);

CREATE TABLE IF NOT EXISTS ai_report_usage (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS ai_reports (
  id ${pk},
  user_id INTEGER NOT NULL,
  scope TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  report TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_scope ON ai_reports(user_id, scope, date_from DESC);
`
}

let driverPromise = null

async function createSqliteDriver() {
  const filePath = path.resolve(
    process.env.WILLPOWER_LOCAL_SQLITE_PATH || path.join('data', 'willpower.local.db')
  )
  const [{ default: Database }, fs] = await Promise.all([
    import('better-sqlite3'),
    import('node:fs')
  ])
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const database = new Database(filePath)
  database.pragma('journal_mode = WAL')
  database.exec(buildSchema('sqlite'))
  // 旧版 SQLite 心魔库的业务表曾引用本库 users；账号统一后 users 已不再维护，
  // SQLite 又不能直接 DROP FOREIGN KEY，因此关闭本业务库的旧外键 enforcement。
  // 当前 schema 没有任何仍需保留的业务外键。
  database.pragma('foreign_keys = OFF')

  // 存量库可能没有 sort_order 列（旧表结构），这里补齐，不影响新库
  const hasSort = database.prepare("PRAGMA table_info(demons)").all().some((c) => c.name === 'sort_order')
  if (!hasSort) {
    database.exec('ALTER TABLE demons ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
  }

  return {
    async query(sql, params = []) {
      const { text, values } = toSqliteStatement(sql, normalizeParams(params))
      const statement = database.prepare(text)
      const returnsRows = /^\s*(select|with)\b/i.test(text) || /\breturning\b/i.test(text)
      if (returnsRows) return { rows: statement.all(...values) }
      const info = statement.run(...values)
      return { rows: [], rowCount: info.changes }
    },
    async close() {
      database.close()
    }
  }
}

async function createPgDriver() {
  const pool = new Pool(readPgConfig())
  await pool.query(buildSchema('pg'))
  await pool.query(buildDropLegacyUserForeignKeysSql([
    'demons',
    'resistances',
    'positive_logs',
    'positive_activities',
    'custom_achievements',
    'achievement_unlocks',
    'ai_report_usage',
    'ai_reports'
  ]))
  // 旧版 ai_reports 在 PG 中使用 INTEGER PRIMARY KEY，却没有序列默认值；
  // INSERT 又不传 id，生成 AI 报告时会因 id 为 NULL 保存失败。
  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS ai_reports_id_seq;
    ALTER SEQUENCE ai_reports_id_seq OWNED BY ai_reports.id;
    ALTER TABLE ai_reports ALTER COLUMN id SET DEFAULT nextval('ai_reports_id_seq');
    SELECT setval(
      'ai_reports_id_seq',
      COALESCE((SELECT max(id) FROM ai_reports), 1),
      EXISTS (SELECT 1 FROM ai_reports)
    );
  `)
  // 存量库补齐 sort_order 列
  const { rows: cols } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'demons' AND column_name = 'sort_order'"
  )
  if (!cols.length) {
    await pool.query('ALTER TABLE demons ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
  }
  return {
    async query(sql, params = []) {
      return pool.query(sql, normalizeParams(params))
    },
    async close() {
      await pool.end()
    }
  }
}

function getDriver() {
  if (!driverPromise) {
    // 失败时清空缓存：新库尚未创建时不至于让整个模块永久不可用，下次请求会重试
    driverPromise = (isLocalDevMode ? createSqliteDriver() : createPgDriver()).catch((err) => {
      driverPromise = null
      throw err
    })
  }
  return driverPromise
}

async function query(sql, params) {
  const driver = await getDriver()
  return driver.query(sql, params)
}

async function queryOne(sql, params) {
  const { rows } = await query(sql, params)
  return rows[0] || null
}

/** 建表（幂等）。驱动初始化时即执行 schema，这里只负责触发初始化。 */
export async function ensureWillpowerSchema() {
  await getDriver()
}

/** 优雅停机时释放连接。 */
export async function closeWillpowerDatabase() {
  if (!driverPromise) return
  const driver = await driverPromise
  driverPromise = null
  await driver.close()
}

/**
 * 入库时间统一存为「北京时间（Asia/Shanghai, UTC+8）」的 ISO 字符串（带 +08:00 偏移）。
 * 这样数据库里看到的就是北京时间，且 new Date() 仍能正确还原绝对时刻，
 * 聚合层 zonedParts 按 Asia/Shanghai 重算时不会重复偏移。
 */
export function nowIso(ts = Date.now()) {
  const d = new Date(ts + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const pad3 = (n) => String(n).padStart(3, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad3(d.getUTCMilliseconds())}+08:00`
  )
}

// ========== 心魔（用户自定义 / 对内置项的覆盖）==========
// 注意：心魔的认证已统一到站点主账号体系（server/auth.js + zentrix_auth），
// 本模块不再维护独立用户表，业务表只保存认证库签发的主账号 uid。

export async function listUserDemons(userId) {
  const { rows } = await query(
    'SELECT * FROM demons WHERE user_id = $1 ORDER BY id ASC',
    [userId]
  )
  return rows
}

export async function upsertDemon(userId, demon) {
  const row = await queryOne(
    `INSERT INTO demons(user_id, demon_key, name, emoji, color, description, is_builtin, archived, created_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, demon_key) DO UPDATE SET
       name = EXCLUDED.name,
       emoji = EXCLUDED.emoji,
       color = EXCLUDED.color,
       description = EXCLUDED.description,
       archived = EXCLUDED.archived
     RETURNING *`,
    [
      userId,
      demon.demonKey,
      demon.name,
      demon.emoji || null,
      demon.color || null,
      demon.description || null,
      demon.isBuiltin ? 1 : 0,
      demon.archived ? 1 : 0,
      nowIso()
    ]
  )
  return row
}

export async function deleteDemon(userId, demonKey) {
  const { rowCount } = await query(
    'DELETE FROM demons WHERE user_id = $1 AND demon_key = $2 AND is_builtin = 0',
    [userId, demonKey]
  )
  return rowCount || 0
}

/** 按 sort_order 升序返回用户自定义心魔（用于拖拽排序后回写）。 */
export async function listCustomDemonsOrdered(userId) {
  const { rows } = await query(
    'SELECT demon_key FROM demons WHERE user_id = $1 AND is_builtin = 0 ORDER BY sort_order ASC, id ASC',
    [userId]
  )
  return rows.map((r) => r.demon_key)
}

/** 回写全部心魔的排序（keys 为期望顺序的 demon_key 数组，含内置与自定义）。 */
export async function reorderDemons(userId, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    const builtin = getBuiltinDemon(key)
    await query(
      `INSERT INTO demons(user_id, demon_key, name, emoji, color, is_builtin, sort_order, created_at)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, demon_key) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [
        userId,
        key,
        builtin?.name || '',
        builtin?.emoji || '',
        builtin?.color || '',
        builtin ? 1 : 0,
        i,
        nowIso()
      ]
    )
  }
}

// ========== 正能量活动（用户自定义 / 对内置项的覆盖）==========

export async function listPositiveActivities(userId) {
  const { rows } = await query(
    'SELECT * FROM positive_activities WHERE user_id = $1 ORDER BY sort_order ASC, id ASC',
    [userId]
  )
  return rows
}

export async function upsertPositiveActivity(userId, activity) {
  const row = await queryOne(
    `INSERT INTO positive_activities(user_id, activity_key, name, emoji, unit, input_mode, archived, sort_order, created_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, activity_key) DO UPDATE SET
       name = EXCLUDED.name,
       emoji = EXCLUDED.emoji,
       unit = EXCLUDED.unit,
       input_mode = EXCLUDED.input_mode,
       archived = EXCLUDED.archived
     RETURNING *`,
    [
      userId,
      activity.activityKey,
      activity.name,
      activity.emoji || null,
      activity.unit || null,
      activity.inputMode || 'count',
      activity.archived ? 1 : 0,
      activity.sortOrder || 0,
      nowIso()
    ]
  )
  return row
}

export async function deletePositiveActivity(userId, activityKey) {
  const { rowCount } = await query(
    'DELETE FROM positive_activities WHERE user_id = $1 AND activity_key = $2',
    [userId, activityKey]
  )
  return rowCount || 0
}

// ========== 抵御记录 ==========

export async function createResistance(userId, entry) {
  return queryOne(
    `INSERT INTO resistances(
       user_id, demon_key, status, mode, intensity, duration_sec, started_at, resolved_at, note, created_at
     ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      userId,
      entry.demonKey,
      entry.status,
      entry.mode,
      entry.intensity,
      entry.durationSec,
      entry.startedAt,
      entry.resolvedAt || null,
      entry.note || null,
      nowIso()
    ]
  )
}

export async function getResistanceById(userId, id) {
  return queryOne('SELECT * FROM resistances WHERE id = $1 AND user_id = $2', [id, userId])
}

export async function resolveResistance(userId, id, status, resolvedAt) {
  return queryOne(
    `UPDATE resistances SET status = $1, resolved_at = $2
     WHERE id = $3 AND user_id = $4 AND status = 'pending' RETURNING *`,
    [status, resolvedAt, id, userId]
  )
}

export async function deleteResistance(userId, id) {
  const { rowCount } = await query('DELETE FROM resistances WHERE id = $1 AND user_id = $2', [
    id,
    userId
  ])
  return rowCount || 0
}

/** 编辑已结算的抵御记录：demonKey / status / note / startedAt 可改；改结果会触发成就重算。 */
export async function updateResistance(userId, id, patch) {
  const allowed = {
    demon_key: patch.demonKey,
    status: patch.status,
    note: patch.note,
    started_at: patch.startedAt
  }
  const sets = []
  const params = []
  let i = 1
  for (const [col, val] of Object.entries(allowed)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i}`)
      params.push(val)
      i += 1
    }
  }
  if (!sets.length) return getResistanceById(userId, id)
  params.push(id, userId)
  return queryOne(
    `UPDATE resistances SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    params
  )
}

export async function listResistances(userId, limit = 100) {
  const { rows } = await query(
    'SELECT * FROM resistances WHERE user_id = $1 ORDER BY started_at DESC, id DESC LIMIT $2',
    [userId, limit]
  )
  return rows
}

export async function listPendingResistances(userId) {
  const { rows } = await query(
    "SELECT * FROM resistances WHERE user_id = $1 AND status = 'pending' ORDER BY started_at ASC",
    [userId]
  )
  return rows
}

/** 成就计算与看板都基于这份全量数据（个人应用量级，直接内存计算最省事）。 */
export async function listAllResistances(userId, limit = 5000) {
  const { rows } = await query(
    'SELECT * FROM resistances WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2',
    [userId, limit]
  )
  return rows
}

// ========== 正能量记录 ==========

export async function createPositiveLog(userId, entry) {
  return queryOne(
    `INSERT INTO positive_logs(user_id, activity_key, name, amount, unit, note, happened_at, created_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId,
      entry.activityKey,
      entry.name,
      entry.amount,
      entry.unit || null,
      entry.note || null,
      entry.happenedAt,
      nowIso()
    ]
  )
}

export async function deletePositiveLog(userId, id) {
  const { rowCount } = await query('DELETE FROM positive_logs WHERE id = $1 AND user_id = $2', [
    id,
    userId
  ])
  return rowCount || 0
}

export async function getPositiveLogById(userId, id) {
  return queryOne('SELECT * FROM positive_logs WHERE id = $1 AND user_id = $2', [id, userId])
}

/** 编辑正能量记录：activityKey / amount / unit / note / happenedAt 可改；改项目或数量会触发成就重算。 */
export async function updatePositiveLog(userId, id, patch) {
  const allowed = {
    activity_key: patch.activityKey,
    amount: patch.amount,
    unit: patch.unit,
    note: patch.note,
    happened_at: patch.happenedAt
  }
  const sets = []
  const params = []
  let i = 1
  for (const [col, val] of Object.entries(allowed)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i}`)
      params.push(val)
      i += 1
    }
  }
  if (!sets.length) return getPositiveLogById(userId, id)
  params.push(id, userId)
  return queryOne(
    `UPDATE positive_logs SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    params
  )
}

export async function listPositiveLogs(userId, limit = 2000) {
  const { rows } = await query(
    'SELECT * FROM positive_logs WHERE user_id = $1 ORDER BY happened_at DESC, id DESC LIMIT $2',
    [userId, limit]
  )
  return rows
}

// ========== 自定义成就 ==========

export async function listCustomAchievements(userId) {
  const { rows } = await query(
    'SELECT * FROM custom_achievements WHERE user_id = $1 ORDER BY id ASC',
    [userId]
  )
  return rows
}

export async function createCustomAchievement(userId, achievement) {
  return queryOne(
    `INSERT INTO custom_achievements(user_id, code, name, description, rule_json, points, hidden, created_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId,
      achievement.code,
      achievement.name,
      achievement.description || null,
      JSON.stringify(achievement.rule),
      achievement.points || 10,
      achievement.hidden ? 1 : 0,
      nowIso()
    ]
  )
}

export async function deleteCustomAchievement(userId, code) {
  const { rowCount } = await query(
    'DELETE FROM custom_achievements WHERE user_id = $1 AND code = $2',
    [userId, code]
  )
  await query('DELETE FROM achievement_unlocks WHERE user_id = $1 AND code = $2', [userId, code])
  return rowCount || 0
}

// ========== 成就进度 ==========

export async function listUnlocks(userId) {
  const { rows } = await query('SELECT * FROM achievement_unlocks WHERE user_id = $1', [userId])
  return rows
}

export async function upsertUnlock(userId, code, progress, target, unlockedAt) {
  await query(
    `INSERT INTO achievement_unlocks(user_id, code, progress, target, unlocked_at, updated_at)
     VALUES($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, code) DO UPDATE SET
       progress = EXCLUDED.progress,
       target = EXCLUDED.target,
       unlocked_at = COALESCE(achievement_unlocks.unlocked_at, EXCLUDED.unlocked_at),
       updated_at = EXCLUDED.updated_at`,
    [userId, code, progress, target, unlockedAt || null, nowIso()]
  )
}

// ========== AI 报告每日额度 ==========

export async function getWillpowerAiUsage(userId, day) {
  const row = await queryOne('SELECT count FROM ai_report_usage WHERE user_id = $1 AND day = $2', [
    userId,
    day
  ])
  return row?.count || 0
}

/** 预占一次额度；超出上限返回 null（调用方据此返回 429）。 */
export async function reserveWillpowerAiUsage(userId, day, limit) {
  if (!Number.isInteger(limit) || limit <= 0) return null
  const { rows } = await query(
    `INSERT INTO ai_report_usage(user_id, day, count)
     VALUES($1, $2, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET count = ai_report_usage.count + 1
     WHERE ai_report_usage.count < $3
     RETURNING count`,
    [userId, day, limit]
  )
  if (!rows.length) return null
  return rows[0].count
}

/** 调用失败归还额度。count 不会为负（reserve 成功后才可能 release）。 */
export async function releaseWillpowerAiUsage(userId, day) {
  await query('UPDATE ai_report_usage SET count = count - 1 WHERE user_id = $1 AND day = $2', [
    userId,
    day
  ])
  const row = await queryOne('SELECT count FROM ai_report_usage WHERE user_id = $1 AND day = $2', [
    userId,
    day
  ])
  return row?.count || 0
}

// ========== AI 报告缓存 ==========

/** 查找某用户某 scope 的最近一次缓存报告（同一 scope 只保留最新一份）。 */
export async function getCachedAiReport(userId, scope) {
  return queryOne(
    'SELECT * FROM ai_reports WHERE user_id = $1 AND scope = $2 ORDER BY created_at DESC LIMIT 1',
    [userId, scope]
  )
}

/** 查找某用户最近 N 条缓存报告（用于展示历史列表）。 */
export async function listCachedAiReports(userId, limit = 10) {
  const { rows } = await query(
    'SELECT id, scope, date_from, date_to, created_at FROM ai_reports WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  )
  return rows
}

/** 写入/更新 AI 报告缓存（同一 scope 覆盖旧记录）。 */
export async function saveAiReport(userId, scope, dateFrom, dateTo, report) {
  // 先删除同 scope 旧缓存（保持每个 scope 只有一份）
  await query('DELETE FROM ai_reports WHERE user_id = $1 AND scope = $2', [userId, scope])
  const row = await queryOne(
    `INSERT INTO ai_reports(user_id, scope, date_from, date_to, report, created_at)
     VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, scope, dateFrom, dateTo, report, nowIso()]
  )
  return row?.id
}
