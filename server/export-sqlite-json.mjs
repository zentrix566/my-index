// 在现有 SQLite Pod 内运行：把 users / progress 表导出为 JSON。
// 用法（拷进 pod 后）：node /app/export-sqlite-json.mjs
// 依赖 pod 内已有的 better-sqlite3，无需安装。
import Database from 'better-sqlite3'
import { writeFileSync } from 'node:fs'

const DB_PATH = process.env.SQLITE_PATH || '/app/data/app.db'
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })

const users = db.prepare('SELECT id, username, password_hash, created_at FROM users').all()
const progress = db.prepare(
  'SELECT user_id, achievement_id, stages_json, count, updated_at, achievement_name, version FROM progress'
).all()

const outDir = process.env.OUT_DIR || '/app/data'
writeFileSync(`${outDir}/export-users.json`, JSON.stringify(users))
writeFileSync(`${outDir}/export-progress.json`, JSON.stringify(progress))
console.log(`导出完成：users=${users.length} 条，progress=${progress.length} 条 -> ${outDir}/export-*.json`)
db.close()
