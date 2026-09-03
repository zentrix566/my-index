/**
 * 「日程管理」(Todo) 模块的独立数据层。
 * - 与炉石、心魔模块完全隔离：独立连接池、独立建表、独立 SQLite 文件 data/todo.local.db
 * - 生产连独立的 PostgreSQL 库（TODO_PG_DATABASE，默认 zentrix_todo）
 * - 两种方言共用同一份业务 SQL：占位符统一写 $1/$2，SQLite 驱动内部转成 ?
 * - 时间列统一用 TEXT 存 ISO 8601 北京时间字符串（带 +08:00）：跨库读出来永远是字符串
 * - 布尔统一用 SMALLINT 0/1：better-sqlite3 不接受 boolean 绑定
 *
 * 认证完全复用站点统一登录（server/auth.js 的 requireAuth，基于 site_token Cookie），
 * 本模块不维护用户表，业务表只保存独立认证库签发的主账号 user_id。
 */
import pg from 'pg'
import path from 'node:path'

const { Pool } = pg

const isLocalDevMode =
  process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'

/** 心魔库的连接参数：主机/账号默认沿用主库配置，只有库名必须独立。 */
function readPgConfig() {
  return {
    host: process.env.TODO_PG_HOST || process.env.PG_HOST,
    port: parseInt(process.env.TODO_PG_PORT || process.env.PG_PORT || '5432', 10),
    user: process.env.TODO_PG_USER || process.env.PG_USER || 'postgres',
    database: process.env.TODO_PG_DATABASE || 'zentrix_todo',
    password: process.env.TODO_PG_PASS || process.env.PG_PASS,
    ssl:
      (process.env.TODO_PG_SSL || process.env.PG_SSL) === 'false'
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
CREATE TABLE IF NOT EXISTS todo_lists (
  id ${pk},
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS todos (
  id ${pk},
  user_id INTEGER NOT NULL,
  list_id INTEGER,
  title TEXT NOT NULL,
  note TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  is_harvest SMALLINT NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todo_user ON todos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_todo_due ON todos(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_todo_list ON todos(user_id, list_id);
`
}

let driverPromise = null

async function createSqliteDriver() {
  const filePath = path.resolve(
    process.env.TODO_LOCAL_SQLITE_PATH || path.join('data', 'todo.local.db')
  )
  const [{ default: Database }, fs] = await Promise.all([
    import('better-sqlite3'),
    import('node:fs')
  ])
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const database = new Database(filePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.exec(buildSchema('sqlite'))
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
export async function ensureTodoSchema() {
  await getDriver()
}

/** 优雅停机时释放连接。 */
export async function closeTodoDatabase() {
  if (!driverPromise) return
  const driver = await driverPromise
  driverPromise = null
  await driver.close()
}

// ========== 时间工具（北京时间 Asia/Shanghai, UTC+8）==========

/** 北京时间 ISO 字符串（带 +08:00 偏移）。 */
export function nowIso(ts = Date.now()) {
  const d = new Date(ts + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const pad3 = (n) => String(n).padStart(3, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad3(d.getUTCMilliseconds())}+08:00`
  )
}

/** 今天（北京时间）日期键 YYYY-MM-DD。 */
export function todayKey(ts = Date.now()) {
  const d = new Date(ts + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 从 ISO 字符串提取北京时间日期键（nowIso 存的就是 +08:00，前 10 位即日期）。 */
export function dateKeyOf(iso) {
  return (iso || '').slice(0, 10)
}

/** 将前端传入的"完成日期"归一化为北京时间 ISO（带 +08:00）。
 *  - 纯日期 YYYY-MM-DD → 当天 00:00:00.000+08:00
 *  - 完整 ISO（含 T 与时间）→ 直接采用
 *  - 非法格式返回 false，由调用方抛错。 */
export function normalizeCompletedAt(value) {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00.000+08:00`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v
  return false
}

// ========== 分组（todo_lists）==========

const LIST_NAME_MAX = 20

export async function listLists(userId) {
  const { rows } = await query(
    'SELECT * FROM todo_lists WHERE user_id = $1 ORDER BY sort_order ASC, id ASC',
    [userId]
  )
  return rows
}

export async function createList(userId, { name, color, icon, sortOrder }) {
  const row = await queryOne(
    `INSERT INTO todo_lists(user_id, name, color, icon, sort_order, created_at)
     VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      userId,
      name,
      color || '#3b82f6',
      icon || null,
      sortOrder ?? Math.floor(Date.now() / 1000),
      nowIso()
    ]
  )
  return row
}

export async function updateList(userId, id, patch) {
  const allowed = {
    name: patch.name,
    color: patch.color,
    icon: patch.icon
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
  if (!sets.length) return getList(userId, id)
  params.push(id, userId)
  const row = await queryOne(
    `UPDATE todo_lists SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    params
  )
  return row
}

export async function getList(userId, id) {
  return queryOne('SELECT * FROM todo_lists WHERE id = $1 AND user_id = $2', [id, userId])
}

/** 默认分组：全新用户首次进入时自动创建，也可在「分组设置」里一键恢复。 */
export const DEFAULT_LISTS = [
  { name: '工作', color: '#3b82f6', icon: '💼', sortOrder: 0 },
  { name: '学习', color: '#8b5cf6', icon: '📚', sortOrder: 1 },
  { name: '生活', color: '#16a34a', icon: '🏡', sortOrder: 2 }
]

/** 统计用户任务总数（用于判断是否为「从未用过」的全新用户）。 */
export async function countTasks(userId) {
  const row = await queryOne('SELECT COUNT(*) AS cnt FROM todos WHERE user_id = $1', [userId])
  return Number(row?.cnt ?? 0)
}

/**
 * 补齐缺失的默认分组。
 * - force=false（默认，用于 GET /lists）：仅当用户既没有分组、也没有任何任务时才种入，
 *   避免老用户主动删光分组后又被塞回来。
 * - force=true（用于「恢复默认分组」按钮）：按名称补齐缺失项，已存在的不动。
 */
export async function ensureDefaultLists(userId, { force = false } = {}) {
  const existing = await listLists(userId)
  if (!force) {
    if (existing.length) return existing
    if ((await countTasks(userId)) > 0) return existing
  }
  const have = new Set(existing.map((r) => r.name))
  const missing = DEFAULT_LISTS.filter((d) => !have.has(d.name))
  if (!missing.length) return existing
  for (const item of missing) {
    try {
      await createList(userId, item)
    } catch {
      // 名称冲突等忽略，继续补齐其余项
    }
  }
  return listLists(userId)
}

/** 删除分组，同时把该组任务的 list_id 置空（任务不丢）。 */
export async function deleteList(userId, id) {
  const { rowCount } = await query('DELETE FROM todo_lists WHERE id = $1 AND user_id = $2', [
    id,
    userId
  ])
  if (rowCount) {
    await query('UPDATE todos SET list_id = NULL WHERE list_id = $1 AND user_id = $2', [id, userId])
  }
  return rowCount || 0
}

// ========== 任务（todos）==========

const TITLE_MAX = 200
const NOTE_MAX = 2000
export const VALID_STATUS = new Set([
  'pending',
  'in_progress',
  'deferred',
  'waiting',
  'done',
  'cancelled'
])
const VALID_PRIORITY = new Set(['low', 'medium', 'high'])

export async function createTask(userId, payload) {
  // 完成时间维护与 updateTask 一致：显式传入 completedAt（补记/撤销恢复）以传入值为准；
  // status=done 且未传 → 写当前时间；其余为 NULL
  let completedAt = null
  if (payload.completedAt !== undefined && payload.completedAt !== null && payload.completedAt !== '') {
    const norm = normalizeCompletedAt(payload.completedAt)
    if (norm === false) throw new Error('完成日期格式应为 YYYY-MM-DD 或 ISO 时间')
    completedAt = norm
  } else if (payload.status === 'done') {
    completedAt = nowIso()
  }
  const row = await queryOne(
    `INSERT INTO todos(user_id, list_id, title, note, due_date, status, priority, is_harvest, position, completed_at, created_at, updated_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      userId,
      payload.listId ?? null,
      payload.title,
      payload.note || null,
      payload.dueDate || null,
      VALID_STATUS.has(payload.status) ? payload.status : 'pending',
      payload.priority && VALID_PRIORITY.has(payload.priority) ? payload.priority : 'medium',
      payload.isHarvest ? 1 : 0,
      0,
      completedAt,
      nowIso(),
      nowIso()
    ]
  )
  return row
}

export async function getTask(userId, id) {
  return queryOne('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [id, userId])
}

/**
 * 按视图过滤任务。
 * view 取值：
 *   today_todo    → 今天到期且未完成
 *   today_done    → 今天完成
 *   today_harvest → 今天完成且标记"收获"
 *   list:<id>     → 指定分组
 *   all           → 全部
 */
export async function listTasks(userId, view) {
  const tk = todayKey()
  let where = 'user_id = $1'
  const params = [userId]
  if (view === 'today_todo') {
    // 今日待办 = 今天到期且处于活跃态（未完成、非已取消）
    where +=
      " AND due_date = $2 AND status IN ('pending','in_progress','deferred','waiting')"
    params.push(tk)
  } else if (view === 'today_done') {
    where += " AND status = 'done' AND substr(completed_at, 1, 10) = $2"
    params.push(tk)
  } else if (view === 'today_harvest') {
    where += " AND status = 'done' AND is_harvest = 1 AND substr(completed_at, 1, 10) = $2"
    params.push(tk)
  } else if (typeof view === 'string' && view.startsWith('list:')) {
    const listId = parseInt(view.slice(5), 10)
    if (Number.isInteger(listId)) {
      where += ' AND list_id = $2'
      params.push(listId)
    }
  }
  const { rows } = await query(
    `SELECT * FROM todos WHERE ${where} ORDER BY position ASC, id DESC`,
    params
  )
  return rows
}

/** 单日明细：已完成任务按完成日期，其余任务按计划日期归属。 */
export async function dayTasks(userId, date) {
  const { rows } = await query(
    `SELECT * FROM todos
     WHERE user_id = $1
       AND CASE
         WHEN status = 'done' AND completed_at IS NOT NULL AND completed_at <> '' THEN substr(completed_at, 1, 10)
         ELSE due_date
       END = $2
     ORDER BY position ASC, id DESC`,
    [userId, date]
  )
  return rows
}

/**
 * 日历区间任务：已完成任务按完成日期归属，其余任务按计划日期归属。
 * 缺少完成时间的历史已完成任务保留按计划日期显示。
 */
export async function listCalendarTasksInRange(userId, from, to) {
  const { rows } = await query(
    `SELECT * FROM todos
     WHERE user_id = $1
       AND CASE
         WHEN status = 'done' AND completed_at IS NOT NULL AND completed_at <> '' THEN substr(completed_at, 1, 10)
         ELSE due_date
       END >= $2
       AND CASE
         WHEN status = 'done' AND completed_at IS NOT NULL AND completed_at <> '' THEN substr(completed_at, 1, 10)
         ELSE due_date
       END <= $3
     ORDER BY CASE
       WHEN status = 'done' AND completed_at IS NOT NULL AND completed_at <> '' THEN substr(completed_at, 1, 10)
       ELSE due_date
     END ASC, position ASC`,
    [userId, from, to]
  )
  return rows
}

/** 区间任务（按 due_date 在 [from,to]）。用于计划日期相关的分析。 */
export async function listTasksInRange(userId, from, to) {
  const { rows } = await query(
    'SELECT * FROM todos WHERE user_id = $1 AND due_date >= $2 AND due_date <= $3 ORDER BY due_date ASC, position ASC',
    [userId, from, to]
  )
  return rows
}

export async function updateTask(userId, id, patch) {
  const allowed = {
    title: patch.title,
    note: patch.note,
    due_date: patch.dueDate,
    list_id: patch.listId,
    status: patch.status,
    priority: patch.priority,
    is_harvest: patch.isHarvest === undefined ? undefined : patch.isHarvest ? 1 : 0,
    position: patch.position
  }
  const sets = []
  const params = []
  let i = 1
  for (const [col, val] of Object.entries(allowed)) {
    if (val !== undefined) {
      if (col === 'status' && !VALID_STATUS.has(val)) continue
      if (col === 'priority' && !VALID_PRIORITY.has(val)) continue
      sets.push(`${col} = $${i}`)
      params.push(val)
      i += 1
    }
  }
  // 完成时间维护：
  // - 显式传入 completedAt（前端仅在"已完成"时提供，并已预填原完成日期）→ 以传入值为准
  // - 状态切到 done 且未传 completedAt → 自动写 nowIso()
  // - 状态切到非 done（含已取消）→ 清空
  if (patch.completedAt !== undefined) {
    if (patch.completedAt === null || patch.completedAt === '') {
      sets.push('completed_at = NULL')
    } else {
      const norm = normalizeCompletedAt(patch.completedAt)
      if (norm === false) throw new Error('完成日期格式应为 YYYY-MM-DD 或 ISO 时间')
      sets.push(`completed_at = $${i}`)
      params.push(norm)
      i += 1
    }
  } else if (patch.status === 'done') {
    sets.push(`completed_at = $${i}`)
    params.push(nowIso())
    i += 1
  } else if (patch.status) {
    sets.push('completed_at = NULL')
  }
  sets.push(`updated_at = $${i}`)
  params.push(nowIso())
  i += 1
  params.push(id, userId)
  const row = await queryOne(
    `UPDATE todos SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    params
  )
  return row
}

export async function deleteTask(userId, id) {
  const { rowCount } = await query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, userId])
  return rowCount || 0
}

// 导出常量供路由层校验用
export const TODO_CONST = {
  LIST_NAME_MAX,
  TITLE_MAX,
  NOTE_MAX
}
