/**
 * 灵感备忘独立数据层：业务数据只保存统一认证账号的 user_id。
 */
import pg from 'pg'
import path from 'node:path'

const { Pool } = pg
const isLocalDevMode = process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'
let driverPromise = null

function normalizeParams(params = []) {
  return params.map((value) => value === undefined ? null : value)
}

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
CREATE TABLE IF NOT EXISTS idea_notes (
  id ${pk},
  user_id INTEGER NOT NULL,
  month_key TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'idea',
  status TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (category IN ('idea', 'vibe_coding', 'memo', 'dream')),
  CHECK (status IS NULL OR status IN ('done', 'impossible', 'uncertain'))
);
CREATE INDEX IF NOT EXISTS idx_idea_notes_user_month ON idea_notes(user_id, month_key DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_idea_notes_user_category ON idea_notes(user_id, category);
CREATE TABLE IF NOT EXISTS idea_note_images (
  id ${pk},
  note_id INTEGER NOT NULL REFERENCES idea_notes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_idea_note_images_user_note ON idea_note_images(user_id, note_id, id);
`
}

async function createSqliteDriver() {
  const filePath = path.resolve(process.env.NOTES_LOCAL_SQLITE_PATH || path.join('data', 'notes.local.db'))
  const [{ default: Database }, fs] = await Promise.all([import('better-sqlite3'), import('node:fs')])
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const database = new Database(filePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.exec(buildSchema('sqlite'))
  const columns = database.prepare('PRAGMA table_info(idea_notes)').all()
  if (!columns.some((column) => column.name === 'tags')) {
    database.exec("ALTER TABLE idea_notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
  }
  const imageColumns = database.prepare('PRAGMA table_info(idea_note_images)').all()
  if (!imageColumns.some((column) => column.name === 'deleted_at')) {
    database.exec('ALTER TABLE idea_note_images ADD COLUMN deleted_at TEXT')
  }
  const schema = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'idea_notes'").get()?.sql || ''
  if (!schema.includes("'dream'")) {
    database.exec(buildSchema('sqlite').replaceAll('idea_notes', 'idea_notes_upgrade'))
    database.exec('INSERT INTO idea_notes_upgrade(id,user_id,month_key,category,status,tags,title,content,created_at,updated_at) SELECT id,user_id,month_key,category,status,tags,title,content,created_at,updated_at FROM idea_notes')
    database.exec('DROP TABLE idea_notes; ALTER TABLE idea_notes_upgrade RENAME TO idea_notes')
  }
  return {
    async query(sql, params = []) {
      const { text, values } = toSqliteStatement(sql, normalizeParams(params))
      const statement = database.prepare(text)
      if (/^\s*(select|with)\b/i.test(text) || /\breturning\b/i.test(text)) return { rows: statement.all(...values) }
      const info = statement.run(...values)
      return { rows: [], rowCount: info.changes }
    },
    async close() { database.close() }
  }
}

async function createPgDriver() {
  const pool = new Pool({
    host: process.env.NOTES_PG_HOST || process.env.PG_HOST,
    port: Number(process.env.NOTES_PG_PORT || process.env.PG_PORT || 5432),
    user: process.env.NOTES_PG_USER || process.env.PG_USER || 'postgres',
    database: process.env.NOTES_PG_DATABASE || 'zentrix_notes',
    password: process.env.NOTES_PG_PASS || process.env.PG_PASS,
    ssl: (process.env.NOTES_PG_SSL || process.env.PG_SSL) === 'false' ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  })
  await pool.query(buildSchema('pg'))
  const { rows } = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'idea_notes' AND column_name = 'tags'")
  if (!rows.length) await pool.query("ALTER TABLE idea_notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
  const imageColumns = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'idea_note_images' AND column_name = 'deleted_at'")
  if (!imageColumns.rows.length) await pool.query('ALTER TABLE idea_note_images ADD COLUMN deleted_at TEXT')
  const constraints = await pool.query("SELECT conname FROM pg_constraint WHERE conrelid = 'idea_notes'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%category%'")
  for (const { conname } of constraints.rows) await pool.query(`ALTER TABLE idea_notes DROP CONSTRAINT "${conname.replaceAll('"', '""')}"`)
  await pool.query("ALTER TABLE idea_notes ADD CONSTRAINT idea_notes_category_check CHECK (category IN ('idea', 'vibe_coding', 'memo', 'dream'))")
  return { query: (sql, params = []) => pool.query(sql, normalizeParams(params)), close: () => pool.end() }
}

function getDriver() {
  if (!driverPromise) {
    driverPromise = (isLocalDevMode ? createSqliteDriver() : createPgDriver()).catch((error) => {
      driverPromise = null
      throw error
    })
  }
  return driverPromise
}

async function query(sql, params) { return (await getDriver()).query(sql, params) }
async function queryOne(sql, params) { return (await query(sql, params)).rows[0] || null }
const nowIso = () => new Date().toISOString()

export async function ensureNotesSchema() { await getDriver() }
export async function closeNotesDatabase() {
  if (!driverPromise) return
  const driver = await driverPromise
  driverPromise = null
  await driver.close()
}

export async function listNotes(userId, monthKey) {
  const params = [userId]
  let where = 'user_id = $1'
  if (monthKey) { where += ' AND month_key = $2'; params.push(monthKey) }
  return (await query(`SELECT * FROM idea_notes WHERE ${where} ORDER BY month_key DESC, id DESC`, params)).rows
}

export async function getNote(userId, id) {
  return queryOne('SELECT * FROM idea_notes WHERE id = $1 AND user_id = $2', [id, userId])
}

export async function listNoteImages(userId, noteIds) {
  if (!noteIds.length) return []
  const placeholders = noteIds.map((_, index) => `$${index + 2}`).join(',')
  return (await query(
    `SELECT * FROM idea_note_images WHERE user_id = $1 AND note_id IN (${placeholders}) AND deleted_at IS NULL ORDER BY id ASC`,
    [userId, ...noteIds]
  )).rows
}

export async function getNoteImage(userId, noteId, imageId) {
  return queryOne(
    'SELECT * FROM idea_note_images WHERE id = $1 AND note_id = $2 AND user_id = $3 AND deleted_at IS NULL',
    [imageId, noteId, userId]
  )
}

export async function createNoteImage(userId, noteId, image) {
  return queryOne(
    `INSERT INTO idea_note_images(note_id, user_id, object_key, file_name, content_type, byte_size, created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [noteId, userId, image.objectKey, image.fileName, image.contentType, image.byteSize, nowIso()]
  )
}

export async function hideNoteImage(userId, noteId, imageId) {
  const deletedAt = nowIso()
  const image = await queryOne(
    'UPDATE idea_note_images SET deleted_at = $1 WHERE id = $2 AND note_id = $3 AND user_id = $4 AND deleted_at IS NULL RETURNING *',
    [deletedAt, imageId, noteId, userId]
  )
  if (image) await query('UPDATE idea_notes SET updated_at = $1 WHERE id = $2 AND user_id = $3', [deletedAt, noteId, userId])
  return image
}

export async function createNote(userId, note) {
  const now = note.createdAt || nowIso()
  return queryOne(
    `INSERT INTO idea_notes(user_id, month_key, category, status, tags, title, content, created_at, updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [userId, note.monthKey, note.category, note.status, JSON.stringify(note.tags), note.title, note.content, now, note.updatedAt || now]
  )
}

export async function updateNote(userId, id, note) {
  return queryOne(
    `UPDATE idea_notes SET month_key=$1, category=$2, status=$3, tags=$4, title=$5, content=$6, updated_at=$7
     WHERE id=$8 AND user_id=$9 RETURNING *`,
    [note.monthKey, note.category, note.status, JSON.stringify(note.tags), note.title, note.content, nowIso(), id, userId]
  )
}

export async function deleteNote(userId, id) {
  return (await query('DELETE FROM idea_notes WHERE id = $1 AND user_id = $2', [id, userId])).rowCount || 0
}

export async function countNotes(userId) {
  return Number((await queryOne('SELECT COUNT(*) AS count FROM idea_notes WHERE user_id = $1', [userId]))?.count || 0)
}
