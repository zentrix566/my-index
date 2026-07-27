import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievement_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  stages_json TEXT NOT NULL DEFAULT '{}',
  count INTEGER NOT NULL DEFAULT 0,
  achievement_name TEXT,
  version TEXT,
  hero_class TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user
  ON achievement_progress(user_id);

CREATE TABLE IF NOT EXISTS ai_advisor_usage (
  user_key TEXT NOT NULL,
  day TEXT NOT NULL,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  free_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);
`

/** 创建本地 SQLite 数据存储，接口与 PostgreSQL 数据层保持一致。 */
export function createLocalSqliteStore(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const database = new Database(filePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.exec(SQLITE_SCHEMA)

  const statements = {
    getUserByUsername: database.prepare('SELECT * FROM users WHERE username = ?'),
    getUserById: database.prepare(
      'SELECT id, username, created_at FROM users WHERE id = ?'
    ),
    createUser: database.prepare(
      'INSERT INTO users(username, password_hash) VALUES(?, ?)'
    ),
    upsertProgress: database.prepare(`
      INSERT INTO achievement_progress(
        user_id, achievement_id, stages_json, count,
        achievement_name, version, hero_class, updated_at
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, achievement_id) DO UPDATE SET
        stages_json = excluded.stages_json,
        count = excluded.count,
        achievement_name = excluded.achievement_name,
        version = excluded.version,
        hero_class = excluded.hero_class,
        updated_at = CURRENT_TIMESTAMP
    `),
    getProgress: database.prepare(`
      SELECT achievement_id, stages_json, count
      FROM achievement_progress
      WHERE user_id = ?
    `),
    getAiUsage: database.prepare(`
      SELECT fixed_count, free_count
      FROM ai_advisor_usage
      WHERE user_key = ? AND day = ?
    `)
  }

  const saveProgressEntry = (userId, entry) => {
    statements.upsertProgress.run(
      userId,
      entry.achievementId,
      JSON.stringify(entry.stages || {}),
      entry.count || 0,
      entry.name,
      entry.version,
      entry.heroClass
    )
  }
  const saveProgressBatch = database.transaction((userId, entries) => {
    for (const entry of entries) saveProgressEntry(userId, entry)
  })

  return {
    close() {
      database.close()
    },

    getUserByUsername(username) {
      return statements.getUserByUsername.get(username) || null
    },

    getUserById(id) {
      return statements.getUserById.get(Number(id)) || null
    },

    createUser(username, passwordHash) {
      try {
        return Number(statements.createUser.run(username, passwordHash).lastInsertRowid)
      } catch (error) {
        if (error.code?.startsWith('SQLITE_CONSTRAINT')) error.code = '23505'
        throw error
      }
    },

    upsertProgress(userId, entry) {
      saveProgressEntry(Number(userId), entry)
    },

    bulkUpsertProgress(userId, entries) {
      saveProgressBatch(Number(userId), entries)
    },

    getProgress(userId) {
      const output = {}
      for (const row of statements.getProgress.all(Number(userId))) {
        output[row.achievement_id] = {
          stages: JSON.parse(row.stages_json || '{}'),
          count: row.count
        }
      }
      return output
    },

    getAiUsage(userKey, day) {
      const row = statements.getAiUsage.get(userKey, day)
      return {
        fixedCount: row?.fixed_count || 0,
        freeCount: row?.free_count || 0
      }
    },

    incrementAiUsage(userKey, day, type) {
      const column = type === 'free' ? 'free_count' : 'fixed_count'
      database.prepare(`
        INSERT INTO ai_advisor_usage(user_key, day, ${column})
        VALUES(?, ?, 1)
        ON CONFLICT(user_key, day) DO UPDATE SET
          ${column} = ai_advisor_usage.${column} + 1
      `).run(userKey, day)
      return this.getAiUsage(userKey, day)
    }
  }
}
