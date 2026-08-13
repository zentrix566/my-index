import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import Database from 'better-sqlite3'
import {
  fetchHearthstoneProfile,
  saveHearthstoneProfile
} from '../src/features/hearthstone/api/profile.js'
import {
  normalizeCosmeticCollection,
  normalizePinnedAchievementIds
} from '../server/hearthstone-profile.js'
import { createLocalBusinessStore } from '../server/db/local-sqlite.js'

test('置顶成就兼容旧单项值并限制为十项', () => {
  assert.deepEqual(normalizePinnedAchievementIds('legacy-achievement'), [
    'legacy-achievement'
  ])
  assert.deepEqual(
    normalizePinnedAchievementIds(JSON.stringify(['a', 'b', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'])),
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
  )
})

test('炉石外观收藏只保留合法且不重复的 ID', () => {
  assert.deepEqual(normalizeCosmeticCollection({
    heroSkins: ['skin-1', 'skin-1', '../bad'],
    coins: ['coin_1'],
    cardBacks: 'bad'
  }), {
    heroSkins: ['skin-1'],
    coins: ['coin_1'],
    cardBacks: []
  })
})

test('炉石个人配置 API 发送并保留最多十项置顶成就与显示偏好', async () => {
  const originalFetch = globalThis.fetch
  const profile = {
    pinnedAchievementIds: ['target-achievement', 'second-achievement'],
    collection: {
      heroSkins: ['hero-skin-1'],
      coins: ['coin-1'],
      cardBacks: ['card-back-1']
    },
    preferences: {
      hardcore: true,
      defaultExpansionId: 'violet-hold',
      compactMode: true
    }
  }
  try {
    let calls = 0
    globalThis.fetch = async (url, options = {}) => {
      calls += 1
      if (calls === 1) {
        assert.equal(url, '/api/hearthstone/profile')
        assert.equal(options.method, undefined)
      } else {
        assert.equal(url, '/api/hearthstone/profile')
        assert.equal(options.method, 'PUT')
        assert.deepEqual(JSON.parse(options.body), profile)
      }
      return new Response(JSON.stringify(profile), { status: 200 })
    }

    assert.deepEqual(await fetchHearthstoneProfile(), profile)
    assert.deepEqual(await saveHearthstoneProfile(profile), profile)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('本地 SQLite 关闭并重新打开后仍保留三类外观收藏', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hearthstone-profile-'))
  const databasePath = join(directory, 'business.db')
  const collection = {
    heroSkins: ['hero-skins-hero_01'],
    coins: ['coins-dmf_coin1'],
    cardBacks: ['card-backs-1']
  }

  try {
    const firstStore = createLocalBusinessStore(databasePath)
    const saved = firstStore.saveHearthstoneProfile(42, {
      pinnedAchievementIds: [],
      preferences: { hardcore: false },
      collection
    })
    assert.deepEqual(saved.collection, collection)
    firstStore.close()

    const inspectionDatabase = new Database(databasePath, { readonly: true })
    const rows = inspectionDatabase.prepare(`
      SELECT user_id, cosmetic_type, cosmetic_id
      FROM hearthstone_cosmetic_collection
      WHERE user_id = ? ORDER BY cosmetic_type
    `).all(42)
    const storedProfile = inspectionDatabase.prepare(`
      SELECT preferences_json FROM hearthstone_profiles WHERE user_id = ?
    `).get(42)
    inspectionDatabase.close()
    assert.deepEqual(rows, [
      { user_id: 42, cosmetic_type: 'cardBacks', cosmetic_id: 'card-backs-1' },
      { user_id: 42, cosmetic_type: 'coins', cosmetic_id: 'coins-dmf_coin1' },
      { user_id: 42, cosmetic_type: 'heroSkins', cosmetic_id: 'hero-skins-hero_01' }
    ])
    assert.equal(Object.hasOwn(JSON.parse(storedProfile.preferences_json), 'collection'), false)

    const reopenedStore = createLocalBusinessStore(databasePath)
    assert.deepEqual(reopenedStore.getHearthstoneProfile(42).collection, collection)
    assert.deepEqual(reopenedStore.getHearthstoneProfile(43).collection, {
      heroSkins: [],
      coins: [],
      cardBacks: []
    })
    reopenedStore.close()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('本地 SQLite 自动把旧 JSON 收藏迁移到收藏明细表', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hearthstone-profile-migration-'))
  const databasePath = join(directory, 'business.db')
  try {
    const legacyDatabase = new Database(databasePath)
    legacyDatabase.exec(`
      CREATE TABLE hearthstone_profiles (
        user_id INTEGER PRIMARY KEY,
        pinned_achievement_id TEXT,
        preferences_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    legacyDatabase.prepare(`
      INSERT INTO hearthstone_profiles(user_id, preferences_json) VALUES(?, ?)
    `).run(7, JSON.stringify({
      compactMode: true,
      collection: {
        heroSkins: ['hero-skins-hero_01'],
        coins: ['coins-dmf_coin1'],
        cardBacks: ['card-backs-1']
      }
    }))
    legacyDatabase.close()

    const migratedStore = createLocalBusinessStore(databasePath)
    const profile = migratedStore.getHearthstoneProfile(7)
    migratedStore.close()
    assert.deepEqual(profile.collection, {
      heroSkins: ['hero-skins-hero_01'],
      coins: ['coins-dmf_coin1'],
      cardBacks: ['card-backs-1']
    })
    assert.equal(profile.preferences.compactMode, true)

    const inspectionDatabase = new Database(databasePath, { readonly: true })
    const storedPreferences = JSON.parse(inspectionDatabase.prepare(`
      SELECT preferences_json FROM hearthstone_profiles WHERE user_id = ?
    `).get(7).preferences_json)
    const rowCount = inspectionDatabase.prepare(`
      SELECT COUNT(*) AS count FROM hearthstone_cosmetic_collection WHERE user_id = ?
    `).get(7).count
    inspectionDatabase.close()
    assert.equal(Object.hasOwn(storedPreferences, 'collection'), false)
    assert.equal(rowCount, 3)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
