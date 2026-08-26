import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import {
  normalizeCosmeticCollection,
  normalizePinnedAchievementIds
} from '../hearthstone-profile.js'

// 两个独立 store：认证库（用户/令牌/模块使用）与业务库（炉石进度/AI 额度）。
// 本地开发用两个 sqlite 文件分别模拟，对应生产环境的独立认证库与业务库。

// ============ 认证库 schema ============
const AUTH_SCHEMA = `
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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS module_activity (
  user_id      INTEGER NOT NULL,
  module       TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, module)
);
`

// ============ 业务库 schema ============
const BUSINESS_SCHEMA = `
CREATE TABLE IF NOT EXISTS achievement_progress (
  user_id INTEGER NOT NULL,
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
  user_id INTEGER PRIMARY KEY,
  pinned_achievement_id TEXT,
  preferences_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hearthstone_cosmetic_collection (
  user_id INTEGER NOT NULL,
  cosmetic_type TEXT NOT NULL CHECK (cosmetic_type IN ('heroSkins', 'coins', 'cardBacks', 'pets')),
  cosmetic_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, cosmetic_type, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_hearthstone_cosmetics_user_type
  ON hearthstone_cosmetic_collection(user_id, cosmetic_type);

CREATE TABLE IF NOT EXISTS ai_advisor_usage (
  user_key TEXT NOT NULL,
  day TEXT NOT NULL,
  fixed_count INTEGER NOT NULL DEFAULT 0,
  free_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);
`

function openSqlite(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const database = new Database(filePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = OFF')
  return database
}

/** 创建本地认证库 SQLite 存储，接口与 PostgreSQL 认证层保持一致。 */
export function createLocalAuthStore(filePath) {
  const database = openSqlite(filePath)
  database.exec(AUTH_SCHEMA)

  // 兼容旧库：补新增列（老 SQLite 不支持 ADD COLUMN IF NOT EXISTS）
  try { database.exec('ALTER TABLE users ADD COLUMN email TEXT') } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0') } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN has_password INTEGER NOT NULL DEFAULT 1') } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN display_name TEXT') } catch {}
  try { database.exec('ALTER TABLE users ADD COLUMN avatar TEXT') } catch {}

  const st = {
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
    trackModuleAccess: database.prepare(`
      INSERT INTO module_activity(user_id, module, first_seen_at, last_seen_at)
      VALUES(?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, module) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP
    `),
    getModuleUsageRaw: database.prepare(`
      SELECT u.id, u.username, u.display_name, u.email, u.email_verified, u.created_at,
             GROUP_CONCAT(m.module) AS modules,
             MAX(m.last_seen_at) AS last_seen
      FROM users u
      LEFT JOIN module_activity m ON m.user_id = u.id
      GROUP BY u.id, u.username, u.display_name, u.email, u.email_verified, u.created_at
      ORDER BY last_seen DESC, u.id
    `)
  }

  return {
    close() {
      database.close()
    },
    getUserByUsername(username) {
      return st.getUserByUsername.get(username) || null
    },
    getUserById(id) {
      return st.getUserById.get(Number(id)) || null
    },
    createUser(username, passwordHash, email = null) {
      try {
        return Number(st.createUser.run(username, passwordHash, email || null).lastInsertRowid)
      } catch (error) {
        if (error.code?.startsWith('SQLITE_CONSTRAINT')) error.code = '23505'
        throw error
      }
    },
    getUserByEmail(email) {
      return st.getUserByEmail.get(email) || null
    },
    getUserByIdentifier(identifier) {
      return st.getUserByIdentifier.get(identifier, identifier) || null
    },
    getUserAuthById(id) {
      return st.getUserAuthById.get(Number(id)) || null
    },
    setUserEmail(userId, email) {
      st.setUserEmail.run(email || null, Number(userId))
    },
    setEmailVerified(userId, verified) {
      st.setEmailVerified.run(verified ? 1 : 0, Number(userId))
    },
    setHasPassword(userId, value) {
      st.setHasPassword.run(value ? 1 : 0, Number(userId))
    },
    setDisplayName(userId, displayName) {
      st.setDisplayName.run(displayName || null, Number(userId))
    },
    setAvatar(userId, avatarUrl) {
      st.setAvatar.run(avatarUrl || null, Number(userId))
    },
    createVerificationToken(userId, tokenHash, expiresAt) {
      st.createVerificationToken.run(tokenHash, Number(userId), expiresAt)
    },
    getValidVerificationToken(tokenHash) {
      const row = st.getVerificationTokenRaw.get(tokenHash)
      if (!row || row.consumed_at) return null
      if (new Date(row.expires_at).getTime() <= Date.now()) return null
      return row
    },
    consumeVerificationToken(tokenHash, userId) {
      st.consumeVerificationToken.run(tokenHash)
      if (userId) {
        st.setEmailVerified.run(1, Number(userId))
        st.invalidateOtherVerificationTokens.run(Number(userId), tokenHash)
      }
    },
    invalidateUserVerificationTokens(userId) {
      st.invalidateUserVerificationTokens.run(Number(userId))
    },
    updatePasswordById(userId, passwordHash) {
      st.updatePasswordById.run(passwordHash, Number(userId))
    },
    createResetToken(userId, tokenHash, expiresAt) {
      st.createResetToken.run(tokenHash, Number(userId), expiresAt)
    },
    getValidResetToken(tokenHash) {
      const row = st.getResetTokenRaw.get(tokenHash)
      if (!row || row.used_at) return null
      if (new Date(row.expires_at).getTime() <= Date.now()) return null
      return row
    },
    consumeResetToken(tokenHash, userId) {
      st.consumeResetToken.run(tokenHash)
      if (userId) st.invalidateUserResetTokens.run(Number(userId))
    },
    invalidateUserResetTokens(userId) {
      st.invalidateUserResetTokens.run(Number(userId))
    },
    trackModuleAccess(userId, module) {
      st.trackModuleAccess.run(Number(userId), module)
    },
    getModuleUsage() {
      // SQLite 的 CURRENT_TIMESTAMP 是不带时区标记的 UTC 字符串，
      // 补成 ISO 8601（带 Z）后前端 new Date() 才与 PG 的 timestamptz 行为一致
      const toIso = (v) => (v ? `${String(v).replace(' ', 'T')}Z` : null)
      return st.getModuleUsageRaw.all().map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        email: r.email,
        emailVerified: Boolean(r.email_verified),
        createdAt: toIso(r.created_at),
        modules: r.modules ? r.modules.split(',') : [],
        lastSeen: toIso(r.last_seen)
      }))
    }
  }
}

/** 创建本地业务库 SQLite 存储，接口与 PostgreSQL 业务层保持一致。 */
export function createLocalBusinessStore(filePath) {
  const database = openSqlite(filePath)
  database.exec(BUSINESS_SCHEMA)

  const migrateLegacyCollection = database.transaction(() => {
    const insert = database.prepare(`
      INSERT OR IGNORE INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
      VALUES(?, ?, ?)
    `)
    const update = database.prepare(`
      UPDATE hearthstone_profiles SET preferences_json = ? WHERE user_id = ?
    `)
    for (const row of database.prepare(`
      SELECT user_id, preferences_json FROM hearthstone_profiles
    `).all()) {
      const preferences = JSON.parse(row.preferences_json || '{}')
      if (!Object.hasOwn(preferences, 'collection')) continue
      const collection = normalizeCosmeticCollection(preferences.collection)
      for (const [type, ids] of Object.entries(collection)) {
        for (const id of ids) insert.run(row.user_id, type, id)
      }
      delete preferences.collection
      update.run(JSON.stringify(preferences), row.user_id)
    }
  })
  migrateLegacyCollection()

  const st = {
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
      FROM achievement_progress WHERE user_id = ?
    `),
    getHearthstoneProfile: database.prepare(`
      SELECT pinned_achievement_id, preferences_json, updated_at
      FROM hearthstone_profiles WHERE user_id = ?
    `),
    getCosmeticCollection: database.prepare(`
      SELECT cosmetic_type, cosmetic_id FROM hearthstone_cosmetic_collection
      WHERE user_id = ? ORDER BY cosmetic_type, created_at, cosmetic_id
    `),
    insertCosmeticCollection: database.prepare(`
      INSERT OR IGNORE INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
      VALUES(?, ?, ?)
    `),
    deleteCosmeticItem: database.prepare(`
      DELETE FROM hearthstone_cosmetic_collection
      WHERE user_id = ? AND cosmetic_type = ? AND cosmetic_id = ?
    `),
    deleteCosmeticType: database.prepare(`
      DELETE FROM hearthstone_cosmetic_collection
      WHERE user_id = ? AND cosmetic_type = ?
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
      SELECT fixed_count, free_count FROM ai_advisor_usage
      WHERE user_key = ? AND day = ?
    `)
  }

  const saveProgressEntry = (userId, entry) => {
    st.upsertProgress.run(
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
  const saveProfile = database.transaction((userId, profile) => {
    const pinnedAchievementIds = normalizePinnedAchievementIds(profile.pinnedAchievementIds)
    const row = st.saveHearthstoneProfile.get(
      userId,
      pinnedAchievementIds[0] || null,
      JSON.stringify({ ...(profile.preferences || {}), pinnedAchievementIds })
    )
    return { row, pinnedAchievementIds }
  })

  const mergeCollection = database.transaction((userId, collection) => {
    for (const [type, ids] of Object.entries(normalizeCosmeticCollection(collection))) {
      for (const id of ids) st.insertCosmeticCollection.run(userId, type, id)
    }
  })

  return {
    close() {
      database.close()
    },
    upsertProgress(userId, entry) {
      saveProgressEntry(Number(userId), entry)
    },
    bulkUpsertProgress(userId, entries) {
      saveProgressBatch(Number(userId), entries)
    },
    getProgress(userId) {
      const output = {}
      for (const row of st.getProgress.all(Number(userId))) {
        output[row.achievement_id] = {
          stages: JSON.parse(row.stages_json || '{}'),
          count: row.count,
          updatedAt: row.updated_at
        }
      }
      return output
    },
    getHearthstoneProfile(userId) {
      const row = st.getHearthstoneProfile.get(Number(userId))
      const collection = normalizeCosmeticCollection()
      for (const item of st.getCosmeticCollection.all(Number(userId))) {
        collection[item.cosmetic_type].push(item.cosmetic_id)
      }
      if (!row) return { pinnedAchievementIds: [], preferences: {}, collection, updatedAt: null }
      const preferences = JSON.parse(row.preferences_json || '{}')
      const pinnedAchievementIds = normalizePinnedAchievementIds(
        preferences.pinnedAchievementIds ?? row.pinned_achievement_id
      )
      delete preferences.pinnedAchievementIds
      delete preferences.collection
      return { pinnedAchievementIds, preferences, collection, updatedAt: row.updated_at }
    },
    saveHearthstoneProfile(userId, profile) {
      saveProfile(Number(userId), profile)
      return this.getHearthstoneProfile(userId)
    },
    mergeHearthstoneCollection(userId, collection) {
      mergeCollection(Number(userId), collection)
      return this.getHearthstoneProfile(userId)
    },
    setHearthstoneCosmeticOwned(userId, type, id, owned) {
      const numericUserId = Number(userId)
      if (owned) st.insertCosmeticCollection.run(numericUserId, type, id)
      else st.deleteCosmeticItem.run(numericUserId, type, id)
      return this.getHearthstoneProfile(userId)
    },
    clearHearthstoneCollectionType(userId, type) {
      st.deleteCosmeticType.run(Number(userId), type)
      return this.getHearthstoneProfile(userId)
    },
    getAiUsage(userKey, day) {
      const row = st.getAiUsage.get(userKey, day)
      return { fixedCount: row?.fixed_count || 0, freeCount: row?.free_count || 0 }
    },
    incrementAiUsage(userKey, day, type) {
      const column = type === 'free' ? 'free_count' : 'fixed_count'
      database.prepare(`
        INSERT INTO ai_advisor_usage(user_key, day, ${column})
        VALUES(?, ?, 1)
        ON CONFLICT(user_key, day) DO UPDATE SET ${column} = ai_advisor_usage.${column} + 1
      `).run(userKey, day)
      return this.getAiUsage(userKey, day)
    },
    reserveAiUsage(userKey, day, type, limit) {
      if (!Number.isInteger(limit) || limit <= 0) return null
      const column = type === 'free' ? 'free_count' : 'fixed_count'
      const row = database.prepare(`
        INSERT INTO ai_advisor_usage(user_key, day, ${column})
        VALUES(?, ?, 1)
        ON CONFLICT(user_key, day) DO UPDATE SET ${column} = ai_advisor_usage.${column} + 1
        WHERE ai_advisor_usage.${column} < ?
        RETURNING fixed_count, free_count
      `).get(userKey, day, limit)
      if (!row) return null
      return { fixedCount: row.fixed_count || 0, freeCount: row.free_count || 0 }
    },
    releaseAiUsage(userKey, day, type) {
      const column = type === 'free' ? 'free_count' : 'fixed_count'
      database.prepare(`
        UPDATE ai_advisor_usage SET ${column} = MAX(${column} - 1, 0)
        WHERE user_key = ? AND day = ?
      `).run(userKey, day)
      return this.getAiUsage(userKey, day)
    }
  }
}
