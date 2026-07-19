/**
 * 一次性迁移脚本：把旧 SQLite 数据灌入 PostgreSQL。
 *
 * 前置：
 *   - 已按前面说明把服务器上的 /app/data 目录 kubectl cp 到本地（含 app.db / -wal / -shm），
 *     或导出单文件 app.db。
 *   - 已在目标 PG 创建数据库（如 zentrix）。本脚本只建表，不建库。
 *
 * 用法：
 *   PG_HOST=xxx.rds.aliyuncs.com \
 *   PG_PASS='******' \
 *   PG_USER=postgres PG_DATABASE=zentrix PG_PORT=5432 \
 *   SQLITE_PATH=./remote-data/app.db \
 *   node server/migrate-sqlite-to-pg.mjs
 *
 * 幂等性：
 *   - 用户按 id 插入，ON CONFLICT(id) DO NOTHING，重复运行不报错、不覆盖。
 *   - 进度按 (user_id, achievement_id) 插入，ON CONFLICT DO NOTHING，冲突跳过。
 *   - 插入用户后修正 SERIAL 序列，保证后续新注册用户 id 不冲突。
 */
import Database from 'better-sqlite3'
import pg from 'pg'

const sqlitePath = process.env.SQLITE_PATH || './data/app.db'

if (!sqlitePath) {
  console.error('[migrate] 请通过 SQLITE_PATH 指定 SQLite 文件路径')
  process.exit(1)
}

const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true })

const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  database: process.env.PG_DATABASE || 'zentrix',
  password: process.env.PG_PASS,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
})

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS progress (
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL,
  stages_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  count           INT NOT NULL DEFAULT 0,
  achievement_name TEXT,
  version         TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
`

async function main() {
  await pool.query(SCHEMA_SQL)
  console.log('[migrate] 表结构已确保')

  // ---- 用户 ----
  const users = sqlite
    .prepare('SELECT id, username, password_hash, created_at FROM users')
    .all()
  for (const u of users) {
    await pool.query(
      `INSERT INTO users(id, username, password_hash, created_at)
       VALUES($1, $2, $3, $4)
       ON CONFLICT(id) DO NOTHING`,
      [u.id, u.username, u.password_hash, u.created_at]
    )
  }
  // 修正 SERIAL 序列，使后续自增 id 不与已导入的 id 冲突
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1), true)`
  )
  console.log(`[migrate] 用户 ${users.length} 条已处理`)

  // ---- 进度 ----
  const progs = sqlite
    .prepare(
      'SELECT user_id, achievement_id, stages_json, count, achievement_name, version, updated_at FROM progress'
    )
    .all()
  let inserted = 0
  for (const p of progs) {
    const stages =
      typeof p.stages_json === 'string' ? JSON.parse(p.stages_json) : (p.stages_json || {})
    const r = await pool.query(
      `INSERT INTO progress(user_id, achievement_id, stages_json, count, achievement_name, version, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(user_id, achievement_id) DO NOTHING`,
      [
        p.user_id,
        p.achievement_id,
        JSON.stringify(stages),
        p.count,
        p.achievement_name,
        p.version,
        p.updated_at
      ]
    )
    if (r.rowCount) inserted++
  }
  console.log(
    `[migrate] 进度共 ${progs.length} 条，新导入 ${inserted} 条，冲突跳过 ${progs.length - inserted} 条`
  )
}

main()
  .then(() => {
    console.log('[migrate] 完成')
    process.exit(0)
  })
  .catch((e) => {
    console.error('[migrate] 失败:', e)
    process.exit(1)
  })
