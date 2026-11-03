/**
 * 业务数据层：炉石进度、个人配置、AI 额度等。与认证层（auth-db.js）物理隔离，
 * 仅通过 user_id（主站 uid）关联，不持有任何用户身份字段、不建跨库外键。
 */
import pg from 'pg'
import path from 'node:path'
import { getAchievementMeta } from '../achievements-meta.js'
import { buildDropLegacyUserForeignKeysSql } from './schema-compat.js'
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

${buildDropLegacyUserForeignKeysSql(['achievement_progress', 'hearthstone_profiles', 'hs_decks'])}

CREATE TABLE IF NOT EXISTS hearthstone_cosmetic_collection (
  user_id        INT NOT NULL,
  cosmetic_type  TEXT NOT NULL CHECK (cosmetic_type IN ('heroSkins', 'coins', 'cardBacks', 'pets')),
  cosmetic_id    TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cosmetic_type, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_hearthstone_cosmetics_user_type
  ON hearthstone_cosmetic_collection(user_id, cosmetic_type);

-- CREATE TABLE IF NOT EXISTS 不会更新旧表的 CHECK；只有旧约束仍不支持 pets 时才替换。
DO $$
DECLARE cosmetic_type_check RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_def
    WHERE constraint_def.conrelid = 'hearthstone_cosmetic_collection'::regclass
      AND constraint_def.contype = 'c'
      AND pg_get_constraintdef(constraint_def.oid) LIKE '%pets%'
  ) THEN
    FOR cosmetic_type_check IN
      SELECT constraint_def.conname AS constraint_name
      FROM pg_constraint AS constraint_def
      WHERE constraint_def.conrelid = 'hearthstone_cosmetic_collection'::regclass
        AND constraint_def.contype = 'c'
        AND EXISTS (
          SELECT 1
          FROM unnest(constraint_def.conkey) AS constrained_column(attnum)
          JOIN pg_attribute AS column_def
            ON column_def.attrelid = constraint_def.conrelid
           AND column_def.attnum = constrained_column.attnum
          WHERE column_def.attname = 'cosmetic_type'
        )
    LOOP
      EXECUTE format(
        'ALTER TABLE hearthstone_cosmetic_collection DROP CONSTRAINT %I',
        cosmetic_type_check.constraint_name
      );
    END LOOP;

    ALTER TABLE hearthstone_cosmetic_collection
      ADD CONSTRAINT hearthstone_cosmetic_collection_cosmetic_type_check
      CHECK (cosmetic_type IN ('heroSkins', 'coins', 'cardBacks', 'pets'));
  END IF;
END $$;

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

-- 炉石卡组分享：cards_json 是保存时的卡牌快照（dbfId/名称/费用/稀有度），
-- 保证 dbfId 日后退役时卡组仍可完整渲染；deck_code 仅用于复制导入游戏。
-- achievement_id 是可选的站内成就 slug（如 alterac-001），关联后出现在该成就的「玩家分享」区。
CREATE TABLE IF NOT EXISTS hs_decks (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  deck_code      TEXT NOT NULL,
  cards_json     JSONB NOT NULL,
  hero_class     TEXT NOT NULL DEFAULT '未知',
  game_format    INT NOT NULL DEFAULT 2,
  card_count     INT NOT NULL DEFAULT 0,
  achievement_id TEXT,
  visibility     TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'hidden')),
  author_name    TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_decks_user ON hs_decks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hs_decks_public ON hs_decks(visibility, updated_at DESC);

-- 先补列再建索引：旧结构的表 CREATE TABLE IF NOT EXISTS 会跳过，索引直接建会报 no such column
ALTER TABLE hs_decks ADD COLUMN IF NOT EXISTS achievement_id TEXT;
CREATE INDEX IF NOT EXISTS idx_hs_decks_achievement ON hs_decks(achievement_id);

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
  const storedPreferences = { ...(profile.preferences || {}), pinnedAchievementIds }
  await db.query(
    `INSERT INTO hearthstone_profiles(user_id, pinned_achievement_id, preferences_json, updated_at)
     VALUES($1, $2, $3::jsonb, now())
     ON CONFLICT(user_id) DO UPDATE SET
       pinned_achievement_id = EXCLUDED.pinned_achievement_id,
       preferences_json = EXCLUDED.preferences_json,
       updated_at = now()`,
    [userId, pinnedAchievementIds[0] || null, JSON.stringify(storedPreferences)]
  )
  // 个人档案（置顶/偏好）与收藏分开保存，普通档案更新绝不改动收藏表。
  return getHearthstoneProfile(userId)
}

/** 增量合并一次收藏导入，不删除数据库中已有或暂时不在目录中的 ID。 */
export async function mergeHearthstoneCollection(userId, submittedCollection) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).mergeHearthstoneCollection(userId, submittedCollection)
  const collection = normalizeCosmeticCollection(submittedCollection)
  const types = []
  const ids = []
  for (const [type, typeIds] of Object.entries(collection)) {
    for (const id of typeIds) {
      types.push(type)
      ids.push(id)
    }
  }
  if (ids.length) {
    await db.query(
      `INSERT INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
       SELECT $1, source.cosmetic_type, source.cosmetic_id
       FROM UNNEST($2::text[], $3::text[]) AS source(cosmetic_type, cosmetic_id)
       ON CONFLICT DO NOTHING`,
      [userId, types, ids]
    )
  }
  return getHearthstoneProfile(userId)
}

/** 只修改一个收藏项，避免用客户端快照覆盖其它收藏。 */
export async function setHearthstoneCosmeticOwned(userId, type, id, owned) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).setHearthstoneCosmeticOwned(userId, type, id, owned)
  if (owned) {
    await db.query(
      `INSERT INTO hearthstone_cosmetic_collection(user_id, cosmetic_type, cosmetic_id)
       VALUES($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, type, id]
    )
  } else {
    await db.query(
      `DELETE FROM hearthstone_cosmetic_collection
       WHERE user_id = $1 AND cosmetic_type = $2 AND cosmetic_id = $3`,
      [userId, type, id]
    )
  }
  return getHearthstoneProfile(userId)
}

/** 用户明确确认后，只清空指定收藏类型。 */
export async function clearHearthstoneCollectionType(userId, type) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).clearHearthstoneCollectionType(userId, type)
  await db.query(
    'DELETE FROM hearthstone_cosmetic_collection WHERE user_id = $1 AND cosmetic_type = $2',
    [userId, type]
  )
  return getHearthstoneProfile(userId)
}

// ========== 炉石卡组分享（hs_decks）==========

function deckTimestampIso(value) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    // SQLite CURRENT_TIMESTAMP 是不带时区的 UTC 字符串，补成 ISO 8601（带 Z）后前端才按同一时刻解析
    return `${value.replace(' ', 'T')}Z`
  }
  return value || null
}

/** 统一把数据库行映射为路由层使用的驼峰结构；列表查询不取 deck_code/cards_json 时对应字段为 undefined。 */
function normalizeDeckRow(row) {
  if (!row) return null
  let cards = row.cards_json ?? []
  if (typeof cards === 'string') {
    try { cards = JSON.parse(cards) } catch { cards = [] }
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || '',
    deckCode: row.deck_code,
    cards,
    heroClass: row.hero_class,
    gameFormat: row.game_format,
    cardCount: row.card_count,
    achievementId: row.achievement_id || null,
    visibility: row.visibility,
    authorName: row.author_name || '',
    createdAt: deckTimestampIso(row.created_at),
    updatedAt: deckTimestampIso(row.updated_at)
  }
}

/** 行已按 updated_at 倒序，逐成就截取前 perLimit 套。 */
function groupDecksPerAchievement(rows, perLimit) {
  const grouped = new Map()
  for (const row of rows) {
    const list = grouped.get(row.achievement_id)
    if (list) {
      if (list.length < perLimit) list.push(normalizeDeckRow(row))
    } else {
      grouped.set(row.achievement_id, [normalizeDeckRow(row)])
    }
  }
  return grouped
}

export async function createDeck(userId, deck) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return normalizeDeckRow(store.createDeck(userId, deck))
  }
  const { rows } = await db.query(
    `INSERT INTO hs_decks(user_id, name, description, deck_code, cards_json, hero_class, game_format, card_count, achievement_id, visibility, author_name)
     VALUES($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      userId,
      deck.name,
      deck.description || '',
      deck.deckCode,
      JSON.stringify(deck.cards || []),
      deck.heroClass,
      deck.gameFormat,
      deck.cardCount,
      deck.achievementId || null,
      deck.visibility,
      deck.authorName || ''
    ]
  )
  return normalizeDeckRow(rows[0])
}

export async function getDeckById(id) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return normalizeDeckRow(store.getDeckById(id))
  }
  const { rows } = await db.query('SELECT * FROM hs_decks WHERE id = $1', [id])
  return normalizeDeckRow(rows[0])
}

export async function listUserDecks(userId) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return store.listUserDecks(userId).map(normalizeDeckRow)
  }
  const { rows } = await db.query(
    'SELECT * FROM hs_decks WHERE user_id = $1 ORDER BY updated_at DESC, id DESC',
    [userId]
  )
  return rows.map(normalizeDeckRow)
}

export async function countUserDecks(userId) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return store.countUserDecks(userId)
  }
  const { rows } = await db.query('SELECT COUNT(*) AS cnt FROM hs_decks WHERE user_id = $1', [userId])
  return Number(rows[0]?.cnt ?? 0)
}

/** 用户在同一成就下已分享的卡组数（含私密的，配额按全部计）。 */
export async function countUserDecksByAchievement(userId, achievementId) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return store.countUserDecksByAchievement(userId, achievementId)
  }
  const { rows } = await db.query(
    'SELECT COUNT(*) AS cnt FROM hs_decks WHERE user_id = $1 AND achievement_id = $2',
    [userId, achievementId]
  )
  return Number(rows[0]?.cnt ?? 0)
}

/** 作者更新元信息（名称/描述/可见性）；deck_code 与快照保存后不变。 */
export async function updateDeckMeta(userId, id, patch) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return normalizeDeckRow(store.updateDeckMeta(userId, id, patch))
  }
  const allowed = { name: patch.name, description: patch.description, visibility: patch.visibility }
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
  if (!sets.length) return getDeckById(id)
  sets.push(`updated_at = now()`)
  params.push(id, userId)
  const { rows } = await db.query(
    `UPDATE hs_decks SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
    params
  )
  return normalizeDeckRow(rows[0])
}

/** 管理员隐藏/恢复：绕过作者校验，仅动 visibility。 */
export async function updateDeckVisibilityByAdmin(id, visibility) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    return normalizeDeckRow(store.updateDeckVisibilityByAdmin(id, visibility))
  }
  const { rows } = await db.query(
    'UPDATE hs_decks SET visibility = $1 WHERE id = $2 RETURNING *',
    [visibility, id]
  )
  return normalizeDeckRow(rows[0])
}

export async function deleteDeck(userId, id) {
  if (isLocalDevMode) return (await getLocalBusinessStore()).deleteDeck(userId, id)
  const { rowCount } = await db.query('DELETE FROM hs_decks WHERE id = $1 AND user_id = $2', [id, userId])
  return rowCount || 0
}

/**
 * 公开卡组列表（广场）：轻量字段，按职业/模式/名称关键词过滤，updated_at 倒序分页。
 * @returns {{ decks:Array, total:number }}
 */
export async function listPublicDecks({ heroClass, gameFormat, keyword, achievementId, limit, offset }) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    const result = await store.listPublicDecks({ heroClass, gameFormat, keyword, achievementId, limit, offset })
    return { decks: result.decks.map(normalizeDeckRow), total: result.total }
  }
  const where = ["visibility = 'public'"]
  const params = []
  if (heroClass) { params.push(heroClass); where.push(`hero_class = $${params.length}`) }
  if (Number.isInteger(gameFormat)) { params.push(gameFormat); where.push(`game_format = $${params.length}`) }
  if (achievementId) { params.push(achievementId); where.push(`achievement_id = $${params.length}`) }
  if (keyword) {
    params.push(`%${keyword.replace(/[\\%_]/g, '\\$&')}%`)
    where.push(`name ILIKE $${params.length} ESCAPE '\\'`)
  }
  const whereSql = where.join(' AND ')
  const { rows } = await db.query(
    `SELECT id, user_id, name, description, hero_class, game_format, card_count, achievement_id, visibility, author_name, created_at, updated_at
     FROM hs_decks WHERE ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  )
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM hs_decks WHERE ${whereSql}`,
    params
  )
  return { decks: rows.map(normalizeDeckRow), total: Number(countRows[0]?.cnt ?? 0) }
}

/**
 * 批量拉取一批成就的公开卡组（成就页「玩家分享」）：每成就按 updated_at 取前 perLimit 套。
 * @returns {Map<string, Array>} achievementId → 卡组数组（轻量字段）
 */
export async function listPublicDecksByAchievements(achievementIds, perLimit) {
  let rows
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    rows = store.listPublicDecksByAchievements(achievementIds, perLimit)
  } else {
    ;({ rows } = await db.query(
      `SELECT id, user_id, name, description, deck_code, hero_class, game_format, card_count, achievement_id, visibility, author_name, created_at, updated_at
       FROM hs_decks
       WHERE visibility = 'public' AND achievement_id = ANY($1::text[])
       ORDER BY updated_at DESC, id DESC`,
      [achievementIds]
    ))
  }
  return groupDecksPerAchievement(rows, perLimit)
}

/** 管理后台列表：可按可见性过滤，含被隐藏卡组。 */
export async function listAllDecksAdmin({ visibility, limit, offset }) {
  if (isLocalDevMode) {
    const store = await getLocalBusinessStore()
    const result = await store.listAllDecksAdmin({ visibility, limit, offset })
    return { decks: result.decks.map(normalizeDeckRow), total: result.total }
  }
  const where = []
  const params = []
  if (visibility) { params.push(visibility); where.push(`visibility = $${params.length}`) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const { rows } = await db.query(
    `SELECT id, user_id, name, description, hero_class, game_format, card_count, visibility, author_name, created_at, updated_at
     FROM hs_decks ${whereSql} ORDER BY updated_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  )
  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS cnt FROM hs_decks ${whereSql}`,
    params
  )
  return { decks: rows.map(normalizeDeckRow), total: Number(countRows[0]?.cnt ?? 0) }
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
