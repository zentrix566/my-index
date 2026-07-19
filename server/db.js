/**
 * SQLite 数据层（better-sqlite3）
 * - 单文件数据库：data/app.db（WAL 模式）
 * - 存储层隔离：业务代码只调用本文件导出的干净接口，不碰 SQL
 * - 换引擎（如 Postgres）时只需重写本文件，业务代码不动
 */
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAchievementMeta } from './achievements-meta.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')
const DB_PATH = path.join(DATA_DIR, 'app.db')
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL') // 读写并发更稳
// WAL 模式下用 NORMAL 同步级别：仍保证崩溃不损坏数据库，但避免每次提交都 fsync 一次 WAL 文件，
// 大幅降低写入延迟（在高延迟磁盘/网络卷上尤为明显）。代价仅是断电时可能丢失最近一个事务。
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')

// ========== 迁移机制 ==========
// 启动时按文件名序号补齐未执行的 .sql，记录到 schema_migrations
function runMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return
  // 迁移记录表本身先确保存在，否则下面查询会失败（该表由 001_init.sql 创建，但排在查询之后）
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  )
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((r) => r.version)
  )

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10)
    if (applied.has(version)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
    console.log(`[db] 执行迁移 ${file}`)
    db.exec(sql)
    db.prepare('INSERT INTO schema_migrations(version) VALUES(?)').run(version)
  }
}
runMigrations()
backfillProgressMeta()

// ========== 干净接口（业务层只调用这些）==========

// 按用户名查用户（含 password_hash，仅内部鉴权用）
export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

// 按 id 查用户（对外脱敏，不含 password_hash）
export function getUserById(id) {
  return db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id)
}

// 创建用户，返回新 id
export function createUser(username, passwordHash) {
  const info = db
    .prepare('INSERT INTO users(username, password_hash) VALUES(?, ?)')
    .run(username, passwordHash)
  return Number(info.lastInsertRowid)
}

// 写回单条进度（upsert），自动带入成就名称与版本（便于查库排查）
export function upsertProgress(userId, achievementId, stages, count) {
  const meta = getAchievementMeta(achievementId)
  db.prepare(
    `INSERT INTO progress(user_id, achievement_id, stages_json, count, achievement_name, version, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, achievement_id)
     DO UPDATE SET stages_json = excluded.stages_json, count = excluded.count,
                   achievement_name = excluded.achievement_name, version = excluded.version,
                   updated_at = datetime('now')`
  ).run(
    userId,
    achievementId,
    JSON.stringify(stages || {}),
    count || 0,
    meta.name,
    meta.version
  )
}

// 迁移 002 之后回填历史行的名称/版本（仅处理 achievement_name 为空的行）
function backfillProgressMeta() {
  const rows = db
    .prepare('SELECT DISTINCT achievement_id FROM progress WHERE achievement_name IS NULL')
    .all()
  if (rows.length === 0) return
  const stmt = db.prepare(
    'UPDATE progress SET achievement_name = ?, version = ? WHERE achievement_id = ? AND achievement_name IS NULL'
  )
  const tx = db.transaction((items) => {
    for (const it of items) {
      const meta = getAchievementMeta(it.achievement_id)
      stmt.run(meta.name, meta.version, it.achievement_id)
    }
  })
  tx(rows)
  console.log(`[db] 回填 ${rows.length} 个成就的名称/版本到 progress 表`)
}

// 读取某用户全部进度，返回结构 { [achievementId]: { stages, count } }
// 与前端现有 progressData 结构完全一致，前端零改造复用
export function getProgress(userId) {
  const rows = db
    .prepare('SELECT achievement_id, stages_json, count FROM progress WHERE user_id = ?')
    .all(userId)
  const out = {}
  for (const r of rows) {
    out[r.achievement_id] = {
      stages: JSON.parse(r.stages_json || '{}'),
      count: r.count
    }
  }
  return out
}

export default db
