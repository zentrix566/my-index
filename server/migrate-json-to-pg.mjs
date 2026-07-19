// 一次性迁移：把「从旧 SQLite Pod 导出的 JSON」灌入 PostgreSQL。
// 只依赖 pg（纯 JS，无需编译），不依赖 better-sqlite3，便于在无 git / 无编译环境的服务器或本机运行。
//
// 用法（从导出的 JSON 目录读取）：
//   EXPORT_DIR=./remote-data PG_HOST=39.106.136.18 PG_PASS='密码' PG_USER=postgres \
//   PG_DATABASE=zentrix PG_PORT=5432 PG_SSL=false node server/migrate-json-to-pg.mjs
//
// 导出 JSON 的方式（在现有 SQLite Pod 内执行，零安装）：
//   kubectl exec $POD -- sh -c 'cd /app && node -e "..."'   # 见下方说明 / 或仓库文档
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const {
  PG_HOST,
  PG_PASS,
  PG_USER = 'postgres',
  PG_DATABASE = 'zentrix',
  PG_PORT = '5432',
  PG_SSL,
  EXPORT_DIR = '.'
} = process.env

if (!PG_HOST || !PG_PASS) {
  console.error('缺少必填环境变量：PG_HOST / PG_PASS')
  process.exit(1)
}

// 兼容两种格式：JSON 数组（[ {...} ]）或 sqlite3 JSON 模式的一行一个对象（JSON Lines）
// EXPORT_DIR 优先按「当前工作目录」解析（用户在项目根目录运行），回退到脚本所在目录
function loadRows(fileName) {
  const candidates = [
    path.resolve(process.cwd(), EXPORT_DIR, fileName),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), EXPORT_DIR, fileName)
  ]
  let raw
  for (const p of candidates) {
    try {
      raw = readFileSync(p, 'utf8')
      break
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
    }
  }
  if (raw === undefined) {
    console.error(`找不到导出文件：${fileName}（已尝试：\n  ${candidates.join('\n  ')}）`)
    process.exit(1)
  }
  raw = raw.trim()
  if (!raw) return []
  if (raw.startsWith('[')) return JSON.parse(raw)
  return raw.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
}

const exportUsers = loadRows('export-users.json')
const exportProgress = loadRows('export-progress.json')

const pool = new pg.Pool({
  host: PG_HOST,
  port: Number(PG_PORT),
  user: PG_USER,
  password: PG_PASS,
  database: PG_DATABASE,
  ssl: PG_SSL === 'false' || PG_SSL === '0' ? false : { rejectUnauthorized: false },
  max: 5
})

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS achievement_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  stages_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ,
  achievement_name TEXT,
  version TEXT,
  PRIMARY KEY (user_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);
`

async function run() {
  const client = await pool.connect()
  try {
    await client.query(SCHEMA_SQL)

    // 1) 用户：按原 id 插入，跳过冲突；并修正 SERIAL 序列
    let usersInserted = 0
    for (const u of exportUsers) {
      const r = await client.query(
        `INSERT INTO users (id, username, password_hash, created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [u.id, u.username, u.password_hash, u.created_at]
      )
      if (r.rowCount > 0) usersInserted++
    }
    const maxId = exportUsers.reduce((m, u) => Math.max(m, u.id || 0), 0)
    if (maxId > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('users','id'), GREATEST($1, (SELECT COALESCE(MAX(id),0) FROM users)), true)`,
        [maxId]
      )
    }

    // 2) 进度：按 (user_id, achievement_id) 去重，冲突跳过（不覆盖）
    let progInserted = 0
    const conflicts = exportProgress.length
    for (const p of exportProgress) {
      const r = await client.query(
        `INSERT INTO achievement_progress (user_id, achievement_id, stages_json, count, updated_at, achievement_name, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, achievement_id) DO NOTHING
         RETURNING user_id`,
        [
          p.user_id,
          p.achievement_id,
          typeof p.stages_json === 'string' ? p.stages_json : JSON.stringify(p.stages_json || {}),
          p.count || 0,
          p.updated_at || null,
          p.achievement_name || null,
          p.version || null
        ]
      )
      if (r.rowCount > 0) progInserted++
    }

    console.log(`用户：共 ${exportUsers.length} 条，新导入 ${usersInserted} 条，已存在跳过 ${exportUsers.length - usersInserted} 条`)
    console.log(`进度：共 ${conflicts} 条，新导入 ${progInserted} 条，冲突跳过 ${conflicts - progInserted} 条`)
    console.log('迁移完成（幂等，可重复运行）')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((e) => {
  console.error('迁移失败：', e.message)
  process.exit(1)
})
