import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { normalizePinnedAchievementIds } from '../hearthstone-profile.js'

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  has_password INTEGER NOT NULL DEFAULT 1,
  display_name TEXT,
  avatar TEXT,
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

CREATE TABLE IF NOT EXISTS hearthstone_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pinned_achievement_id TEXT,
  preferences_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_advisor_usage (
  user_key TEXT NOT NULL,
  day TEXT NOT NULL,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  free_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

/** 创建本地 SQLite 数据存储，接口与 PostgreSQL 数据层保持一致。 */
export function createLocalSqliteStore(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const database = new Database(filePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.exec(SQLITE_SCHEMA)

  // 兼容已存在的旧库：补新增列（老 SQLite 不支持 ADD COLUMN IF NOT EXISTS，包裹 try/catch）
  try { database.exec('ALTER TABLE users ADD COLUMN email TEXT') } catch { /* 已存在则忽略 */ }
  try { database.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0') } catch { /* 已存在则忽略 */ }
  try { database.exec('ALTER TABLE users ADD COLUMN has_password INTEGER NOT NULL DEFAULT 1') } catch { /* 已存在则忽略 */ }
  try { database.exec('ALTER TABLE users ADD COLUMN display_name TEXT') } catch { /* 已存在则忽略 */ }
  try { database.exec('ALTER TABLE users ADD COLUMN avatar TEXT') } catch { /* 已存在则忽略 */ }

  const statements = {
    getUserByUsername: database.prepare('SELECT * FROM users WHERE username = ?'),
    getUserByEmail: database.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)'),
    getUserByIdentifier: database.prepare(
      'SELECT id, username, email FROM users WHERE username = ? OR LOWER(email) = LOWER(?)'
    ),
    getUserAuthById: database.prepare(
      'SELECT id, username, password_hash, email, has_password FROM users WHERE id = ?'
    ),
    setUserEmail: database.prepare('UPDATE users SET email = ? WHERE id = ?'),
    updatePasswordById: database.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
    createResetToken: database.prepare(
      'INSERT INTO password_reset_tokens(token_hash, user_id, expires_at) VALUES(?, ?, ?)'
    ),
    getResetTokenRaw: database.prepare(
      'SELECT token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?'
    ),
    consumeResetToken: database.prepare(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?"
    ),
    invalidateUserResetTokens: database.prepare(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL'
    ),
    getUserById: database.prepare(
      'SELECT id, username, email, email_verified, has_password, display_name, avatar, created_at FROM users WHERE id = ?'
    ),
    setEmailVerified: database.prepare('UPDATE users SET email_verified = ? WHERE id = ?'),
    setHasPassword: database.prepare('UPDATE users SET has_password = ? WHERE id = ?'),
    setDisplayName: database.prepare('UPDATE users SET display_name = ? WHERE id = ?'),
    setAvatar: database.prepare('UPDATE users SET avatar = ? WHERE id = ?'),
    createVerificationToken: database.prepare(
      'INSERT INTO email_verification_tokens(token_hash, user_id, expires_at) VALUES(?, ?, ?)'
    ),
    getVerificationTokenRaw: database.prepare(
      'SELECT token_hash, user_id, expires_at, consumed_at FROM email_verification_tokens WHERE token_hash = ?'
    ),
    consumeVerificationToken: database.prepare(
      "UPDATE email_verification_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE token_hash = ?"
    ),
    invalidateOtherVerificationTokens: database.prepare(
      'UPDATE email_verification_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND consumed_at IS NULL AND token_hash <> ?'
    ),
    invalidateUserVerificationTokens: database.prepare(
      'UPDATE email_verification_tokens SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND consumed_at IS NULL'
    ),
    createUser: database.prepare(
      'INSERT INTO users(username, password_hash, email) VALUES(?, ?, ?)'
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
      SELECT achievement_id, stages_json, count, updated_at
      FROM achievement_progress
      WHERE user_id = ?
    `),
    getHearthstoneProfile: database.prepare(`
      SELECT pinned_achievement_id, preferences_json, updated_at
      FROM hearthstone_profiles
      WHERE user_id = ?
    `),
    saveHearthstoneProfile: database.prepare(`
      INSERT INTO hearthstone_profiles(
        user_id, pinned_achievement_id, preferences_json, updated_at
      )
      VALUES(?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        pinned_achievement_id = excluded.pinned_achievement_id,
        preferences_json = excluded.preferences_json,
        updated_at = CURRENT_TIMESTAMP
      RETURNING pinned_achievement_id, preferences_json, updated_at
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

    createUser(username, passwordHash, email = null) {
      try {
        return Number(statements.createUser.run(username, passwordHash, email || null).lastInsertRowid)
      } catch (error) {
        if (error.code?.startsWith('SQLITE_CONSTRAINT')) error.code = '23505'
        throw error
      }
    },

    getUserByEmail(email) {
      return statements.getUserByEmail.get(email) || null
    },

    getUserByIdentifier(identifier) {
      // SQLite 用两个 ? 占位符（username / email 各一），需传两次同一值
      return statements.getUserByIdentifier.get(identifier, identifier) || null
    },

    getUserAuthById(id) {
      return statements.getUserAuthById.get(Number(id)) || null
    },

    setUserEmail(userId, email) {
      statements.setUserEmail.run(email || null, Number(userId))
    },

    setEmailVerified(userId, verified) {
      statements.setEmailVerified.run(verified ? 1 : 0, Number(userId))
    },

    setHasPassword(userId, value) {
      statements.setHasPassword.run(value ? 1 : 0, Number(userId))
    },

    setDisplayName(userId, displayName) {
      statements.setDisplayName.run(displayName || null, Number(userId))
    },

    setAvatar(userId, avatarUrl) {
      statements.setAvatar.run(avatarUrl || null, Number(userId))
    },

    createVerificationToken(userId, tokenHash, expiresAt) {
      statements.createVerificationToken.run(tokenHash, Number(userId), expiresAt)
    },

    getValidVerificationToken(tokenHash) {
      const row = statements.getVerificationTokenRaw.get(tokenHash)
      if (!row || row.consumed_at) return null
      if (new Date(row.expires_at).getTime() <= Date.now()) return null
      return row
    },

    consumeVerificationToken(tokenHash, userId) {
      statements.consumeVerificationToken.run(tokenHash)
      if (userId) {
        statements.setEmailVerified.run(1, Number(userId))
        statements.invalidateOtherVerificationTokens.run(Number(userId), tokenHash)
      }
    },

    invalidateUserVerificationTokens(userId) {
      statements.invalidateUserVerificationTokens.run(Number(userId))
    },

    updatePasswordById(userId, passwordHash) {
      statements.updatePasswordById.run(passwordHash, Number(userId))
    },

    createResetToken(userId, tokenHash, expiresAt) {
      statements.createResetToken.run(tokenHash, Number(userId), expiresAt)
    },

    getValidResetToken(tokenHash) {
      const row = statements.getResetTokenRaw.get(tokenHash)
      if (!row || row.used_at) return null
      if (new Date(row.expires_at).getTime() <= Date.now()) return null
      return row
    },

    consumeResetToken(tokenHash, userId) {
      statements.consumeResetToken.run(tokenHash)
      if (userId) statements.invalidateUserResetTokens.run(Number(userId))
    },

    invalidateUserResetTokens(userId) {
      statements.invalidateUserResetTokens.run(Number(userId))
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
          count: row.count,
          updatedAt: row.updated_at
        }
      }
      return output
    },

    getHearthstoneProfile(userId) {
      const row = statements.getHearthstoneProfile.get(Number(userId))
      if (!row) return { pinnedAchievementIds: [], preferences: {}, updatedAt: null }
      const preferences = JSON.parse(row.preferences_json || '{}')
      const pinnedAchievementIds = normalizePinnedAchievementIds(
        preferences.pinnedAchievementIds ?? row.pinned_achievement_id
      )
      delete preferences.pinnedAchievementIds
      return {
        pinnedAchievementIds,
        preferences,
        updatedAt: row.updated_at
      }
    },

    saveHearthstoneProfile(userId, profile) {
      const pinnedAchievementIds = normalizePinnedAchievementIds(profile.pinnedAchievementIds)
      const row = statements.saveHearthstoneProfile.get(
        Number(userId),
        pinnedAchievementIds[0] || null,
        JSON.stringify({
          ...(profile.preferences || {}),
          pinnedAchievementIds
        })
      )
      const preferences = JSON.parse(row.preferences_json || '{}')
      delete preferences.pinnedAchievementIds
      return {
        pinnedAchievementIds,
        preferences,
        updatedAt: row.updated_at
      }
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
    },

    reserveAiUsage(userKey, day, type, limit) {
      if (!Number.isInteger(limit) || limit <= 0) return null
      const column = type === 'free' ? 'free_count' : 'fixed_count'
      const row = database.prepare(`
        INSERT INTO ai_advisor_usage(user_key, day, ${column})
        VALUES(?, ?, 1)
        ON CONFLICT(user_key, day) DO UPDATE SET
          ${column} = ai_advisor_usage.${column} + 1
        WHERE ai_advisor_usage.${column} < ?
        RETURNING fixed_count, free_count
      `).get(userKey, day, limit)
      if (!row) return null
      return {
        fixedCount: row.fixed_count || 0,
        freeCount: row.free_count || 0
      }
    },

    releaseAiUsage(userKey, day, type) {
      const column = type === 'free' ? 'free_count' : 'fixed_count'
      database.prepare(`
        UPDATE ai_advisor_usage
        SET ${column} = MAX(${column} - 1, 0)
        WHERE user_key = ? AND day = ?
      `).run(userKey, day)
      return this.getAiUsage(userKey, day)
    }
  }
}
