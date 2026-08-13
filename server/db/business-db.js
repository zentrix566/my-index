/**
 * 业务数据层：炉石进度、个人配置、AI 额度等。与认证层（auth-db.js）物理隔离，
 * 仅通过 user_id（主站 uid）关联，不持有任何用户身份字段、不建跨库外键。
 */
import pg from 'pg'
import path from 'node:path'
import { getAchievementMeta } from '../achievements-meta.js'
import {
  normalizeCosmeticCollection,
  normalizePinnedAchievementIds
} from '../hearthstone-profile.js'

const { Pool } = pg
const isLocalDevMode =
  process.env.NODE_ENV !== 'production' && process.env.LOCAL_DEV_MODE === 'true'

export const db = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER || 'postgres',
  database: process.env.PG_DATABASE || 'zentrix',
  password: process.env.PG_PASS,
  ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})
let businessPoolClosed = false

let businessStorePromise
async function getLocalBusinessStore() {
  if (!businessStorePromise) {
    const filePath = path.resolve(
      process.env.LOCAL_SQLITE_PATH || path.join('data', 'app.local.db')
    )
    businessStorePromise = import('./local-sqlite.js').then(({ createLocalBusinessStore }) =>
      createLocalBusinessStore(filePath)
    )
  }
  return businessStorePromise
}

export async function closeBusinessDatabase() {
  if (businessPoolClosed) return
  businessPoolClosed = true
  if (isLocalDevMode) {
    const s = await getLocalBusinessStore()
    s.close()
    return
  }
  await db.end()
}

// 业务表：user_id 为普通整数列，不引用认证库 users 表（跨库无法建外键，关联在应用层保证）
const BUSINESS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS achievement_progress (
  user_id         INT NOT NULL,
  achievement_id  TEXT NOT NULL,
  stages_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  count           INT NOT NULL DEFAULT 0,
  achievement_name TEXT,
  version         TEXT,
  hero_class      TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS achievement_name TEXT;
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE achievement_progress ADD COLUMN IF NOT EXISTS hero_class TEXT;

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);

CREATE TABLE IF NOT EXISTS hearthstone_profiles (
  user_id                INT PRIMARY KEY,
  pinned_achievement_id  TEXT,
  preferences_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hearthstone_cosmetic_collection (
  user_id        INT NOT NULL,
  cosmetic_type  TEXT NOT NULL CHECK (cosmetic_type IN ('heroSkins', 'coins', 'cardBacks')),
  cosmetic_id    TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cosmetic_type, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_hearthstone_cosmetics_user_type
  ON hearthstone_cosmetic_collection(user_id, cosmetic_type);

INSERT INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
SELECT profile.user_id, source.cosmetic_type, source.cosmetic_id
FROM hearthstone_profiles AS profile
CROSS JOIN LATERAL (
  SELECT 'heroSkins' AS cosmetic_type, jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(profile.preferences_json->'collection'->'heroSkins') = 'array'
      THEN profile.preferences_json->'collection'->'heroSkins' ELSE '[]'::jsonb END
  ) AS cosmetic_id
  UNION ALL
  SELECT 'coins', jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(profile.preferences_json->'collection'->'coins') = 'array'
      THEN profile.preferences_json->'collection'->'coins' ELSE '[]'::jsonb END
  )
  UNION ALL
  SELECT 'cardBacks', jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(profile.preferences_json->'collection'->'cardBacks') = 'array'
      THEN profile.preferences_json->'collection'->'cardBacks' ELSE '[]'::jsonb END
  )
) AS source
ON CONFLICT DO NOTHING;

UPDATE hearthstone_profiles
SET preferences_json = preferences_json - 'collection'
WHERE preferences_json ? 'collection';

CREATE TABLE IF NOT EXISTS ai_advisor_usage (
  user_key    TEXT NOT NULL,
  day         TEXT NOT NULL,
  fixed_count INT NOT NULL DEFAULT 0,
  free_count  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_key, day)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

let businessSchemaReady = false
export async function ensureBusinessSchema() {
  if (isLocalDevMode) {
    await getLocalBusinessStore()
    return
  }
  if (businessSchemaReady) return
  await db.query(BUSINESS_SCHEMA_SQL)
  businessSchemaReady = true
}

// ========== 炉石进度 ==========

export async function upsertProgress(userId, achievementId, stages, count, client) {
  const meta = getAchievementMeta(achievementId)
  if (isLocalDevMode) {
    return (await getLocalBusinessStore()).upsertProgress(userId, {
      achievementId,
      stages,
      count,
      name: meta.name,
      version: meta.version,
      heroClass: meta.heroClass
    })
  }
  const q = client || db
  await q.query(
    `INSERT INTO achievement_progress(user_id, achievement_id, stages_json, count, achievement_name, version, hero_class, updated_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT(user_id, achievement_id)
     DO UPDATE SET stages_json = EXCLUDED.stages_json, count = EXCLUDED.count,
                   achievement_name = EXCLUDED.achievement_name, version = EXCLUDED.version,
                   hero_class = EXCLUDED.hero_class, updated_at = now()`,
    [userId, achievementId, JSON.stringify(stages || {}), count || 0, meta.name, meta.version, meta.heroClass]
  )
}

export async function bulkUpsertProgress(userId, entries, client) {
  if (!entries || entries.length === 0) return
  if (isLocalDevMode) {
    return (await getLocalBusinessStore()).bulkUpsertProgress(userId, entries)
  }
  const achievementIds = []
  const stagesArr = []
  const counts = []
  const names = []
  const versions = []
  const heroClasses = []
  for (const e of entries) {
    achievementIds.push(e.achievementId)
    stagesArr.push(JSON.stringify(e.stages || {}))
    counts.push(e.count || 0)
    names.push(e.name)
    versions.push(e.version)
    heroClasses.push(e.heroClass)
  }
  const q = client || db
  await q.query(
    `INSERT INTO achievement_progress (user_id, achievement_id, stages_json, count, achievement_name, version, hero_class, updated_at)
     SELECT $1, u.achievement_id, u.stages_json::jsonb, u.count, u.achievement_name, u.version, u.hero_class, now()
     FROM UNNEST($2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::text[])
       AS u(achievement_id, stages_json, count, achievement_name, version, hero_class)
     ON CONFLICT (user_id, achievement_id) DO UPDATE SET
       stages_json = EXCLUDED.stages_json,
       count = EXCLUDED.count,
       achievement_name = EXCLUDED.achievement_name,
       version = EXCLUDED.version,
       hero_class = EXCLUDED.hero_class,
       updated_at = now()`,
    [userId, achievementIds, stagesArr, counts, names, versions, heroClasses]
  )
}

export async function getProgress(userId) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).getProgress(userId)
  const { rows } = await db.query(
    'SELECT achievement_id, stages_json, count, updated_at FROM achievement_progress WHERE user_id = $1',
    [userId]
  )
  const out = {}
  for (const r of rows) {
    const stages = typeof r.stages_json === 'string' ? JSON.parse(r.stages_json) : (r.stages_json || {})
    out[r.achievement_id] = {
      stages,
      count: r.count,
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at
    }
  }
  return out
}

export async function getHearthstoneProfile(userId) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).getHearthstoneProfile(userId)
  const { rows } = await db.query(
    'SELECT pinned_achievement_id, preferences_json, updated_at FROM hearthstone_profiles WHERE user_id = $1',
    [userId]
  )
  const { rows: collectionRows } = await db.query(
    `SELECT cosmetic_type, cosmetic_id FROM hearthstone_cosmetic_collection
     WHERE user_id = $1 ORDER BY cosmetic_type, created_at, cosmetic_id`,
    [userId]
  )
  const collection = normalizeCosmeticCollection()
  for (const item of collectionRows) collection[item.cosmetic_type].push(item.cosmetic_id)
  const row = rows[0]
  if (!row) return { pinnedAchievementIds: [], preferences: {}, collection, updatedAt: null }
  const preferences =
    typeof row.preferences_json === 'string' ? JSON.parse(row.preferences_json) : (row.preferences_json || {})
  const pinnedAchievementIds = normalizePinnedAchievementIds(
    preferences.pinnedAchievementIds ?? row.pinned_achievement_id
  )
  delete preferences.pinnedAchievementIds
  delete preferences.collection
  return {
    pinnedAchievementIds,
    preferences,
    collection,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  }
}

export async function saveHearthstoneProfile(userId, profile) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).saveHearthstoneProfile(userId, profile)
  const pinnedAchievementIds = normalizePinnedAchievementIds(profile.pinnedAchievementIds)
  const collection = normalizeCosmeticCollection(profile.collection)
  const storedPreferences = { ...(profile.preferences || {}), pinnedAchievementIds }
  const collectionTypes = []
  const collectionIds = []
  for (const [type, ids] of Object.entries(collection)) {
    for (const id of ids) {
      collectionTypes.push(type)
      collectionIds.push(id)
    }
  }
  const client = await db.connect()
  let row
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO hearthstone_profiles(user_id, pinned_achievement_id, preferences_json, updated_at)
       VALUES($1, $2, $3::jsonb, now())
       ON CONFLICT(user_id) DO UPDATE SET
         pinned_achievement_id = EXCLUDED.pinned_achievement_id,
         preferences_json = EXCLUDED.preferences_json,
         updated_at = now()
       RETURNING pinned_achievement_id, preferences_json, updated_at`,
      [userId, pinnedAchievementIds[0] || null, JSON.stringify(storedPreferences)]
    )
    row = result.rows[0]
    await client.query('DELETE FROM hearthstone_cosmetic_collection WHERE user_id = $1', [userId])
    if (collectionIds.length) {
      await client.query(
        `INSERT INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
         SELECT $1, source.cosmetic_type, source.cosmetic_id
         FROM UNNEST($2::text[], $3::text[]) AS source(cosmetic_type, cosmetic_id)`,
        [userId, collectionTypes, collectionIds]
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  const preferences = row.preferences_json || {}
  delete preferences.pinnedAchievementIds
  delete preferences.collection
  return {
    pinnedAchievementIds,
    preferences,
    collection,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  }
}

export async function transaction(fn) {
  if (isLocalDevMode) return fn(null)
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

// ========== AI 建议每日额度（按 用户/IP + 日期 限流）==========

export async function getAiUsage(userKey, day) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).getAiUsage(userKey, day)
  const { rows } = await db.query(
    'SELECT fixed_count, free_count FROM ai_advisor_usage WHERE user_key = $1 AND day = $2',
    [userKey, day]
  )
  const row = rows[0]
  return { fixedCount: row?.fixed_count || 0, freeCount: row?.free_count || 0 }
}

export async function incrementAiUsage(userKey, day, type) {
  const col = type === 'free' ? 'free_count' : 'fixed_count'
  if (isLocalDevMode) return (await getLocalBusinessStore()).incrementAiUsage(userKey, day, type)
  const { rows } = await db.query(
    `INSERT INTO ai_advisor_usage(user_key, day, ${col}) VALUES($1, $2, 1)
     ON CONFLICT(user_key, day) DO UPDATE SET ${col} = ai_advisor_usage.${col} + 1
     RETURNING fixed_count, free_count`,
    [userKey, day]
  )
  const row = rows[0]
  return { fixedCount: row.fixed_count || 0, freeCount: row.free_count || 0 }
}

export async function reserveAiUsage(userKey, day, type, limit) {
  if (!Number.isInteger(limit) || limit <= 0) return null
  const col = type === 'free' ? 'free_count' : 'fixed_count'
  if (isLocalDevMode) return (await getLocalBusinessStore()).reserveAiUsage(userKey, day, type, limit)
  const { rows } = await db.query(
    `INSERT INTO ai_advisor_usage(user_key, day, ${col}) VALUES($1, $2, 1)
     ON CONFLICT(user_key, day) DO UPDATE SET ${col} = ai_advisor_usage.${col} + 1
     WHERE ai_advisor_usage.${col} < $3
     RETURNING fixed_count, free_count`,
    [userKey, day, limit]
  )
  const row = rows[0]
  if (!row) return null
  return { fixedCount: row.fixed_count || 0, freeCount: row.free_count || 0 }
}

export async function releaseAiUsage(userKey, day, type) {
  const col = type === 'free' ? 'free_count' : 'fixed_count'
  if (isLocalDevMode) return (await getLocalBusinessStore()).releaseAiUsage(userKey, day, type)
  const { rows } = await db.query(
    `UPDATE ai_advisor_usage
     SET ${col} = GREATEST(${col} - 1, 0)
     WHERE user_key = $1 AND day = $2
     RETURNING fixed_count, free_count`,
    [userKey, day]
  )
  const row = rows[0]
  return { fixedCount: row?.fixed_count || 0, freeCount: row?.free_count || 0 }
}
