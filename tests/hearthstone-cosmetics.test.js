import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  getCosmeticPageSize,
  getCollectionStats,
  getGlobalCosmeticItems,
  getHeroClassStats,
  paginateCosmetics,
  searchCosmetics,
  sortOwnedCosmeticsFirst
} from '../src/features/hearthstone/utils/cosmetics.js'

test('外观主清单与映射表使用一致的图片和详情字段', async () => {
  const load = (file) => readFile(new URL(file, import.meta.url), 'utf8').then(JSON.parse)
  const [heroSkins, coins, cardBacks] = await Promise.all([
    load('../src/features/hearthstone/data/hero-skins.json'),
    load('../src/features/hearthstone/data/coins.json'),
    load('../src/features/hearthstone/data/card-backs.json')
  ])
  const catalog = { heroSkins, coins, cardBacks }
  const sharedFields = [
    'id', 'officialName', 'flavorText', 'howToGet', 'availability',
    'localImagePath', 'ossObjectKey', 'imageUrl', 'source', 'sourceUrl'
  ]

  for (const items of Object.values(catalog)) {
    assert.ok(items.length > 0)
    for (const item of items) {
      for (const field of sharedFields) assert.ok(Object.hasOwn(item, field), `${item.id} 缺少 ${field}`)
      assert.equal(item.imageUrl, `/${item.ossObjectKey.split('/').map(encodeURIComponent).join('/')}`)
      assert.equal(Object.hasOwn(item, 'name'), false)
      assert.equal(Object.hasOwn(item, 'image'), false)
      assert.equal(Object.hasOwn(item, 'hero'), false)
    }
  }
})

test('全局搜索覆盖三类收藏但只匹配正式名称', () => {
  const items = getGlobalCosmeticItems({
    heroSkins: [{ id: 'skin', officialName: '吉安娜', heroClass: '法师' }],
    coins: [{ id: 'coin', officialName: '暗月幸运币', flavorText: '马戏团' }],
    cardBacks: [{ id: 'back', officialName: '潘达利亚', howToGet: '排名对战' }]
  })
  assert.equal(items.length, 3)
  assert.deepEqual(searchCosmetics(items, '吉安娜').map((item) => item.id), ['skin'])
  assert.deepEqual(searchCosmetics(items, '幸运币').map((item) => item.id), ['coin'])
  assert.deepEqual(searchCosmetics(items, '潘达').map((item) => item.id), ['back'])
  assert.deepEqual(searchCosmetics(items, '法师'), [])
  assert.deepEqual(searchCosmetics(items, '马戏团'), [])
  assert.deepEqual(searchCosmetics(items, '排名'), [])
  assert.deepEqual(searchCosmetics(items, '卡背'), [])
})

test('三类收藏均将已拥有条目稳定排列在未拥有条目前面', () => {
  const items = [
    { id: 'missing-1' },
    { id: 'owned-1' },
    { id: 'missing-2' },
    { id: 'owned-2' }
  ]
  assert.deepEqual(
    sortOwnedCosmeticsFirst(items, ['owned-1', 'owned-2']).map((item) => item.id),
    ['owned-1', 'owned-2', 'missing-1', 'missing-2']
  )
  assert.deepEqual(items.map((item) => item.id), ['missing-1', 'owned-1', 'missing-2', 'owned-2'])
})

test('收藏分页按皮肤六个、幸运币和卡背八个展示', () => {
  const items = Array.from({ length: 17 }, (_, index) => ({ id: index + 1 }))
  assert.equal(getCosmeticPageSize('heroSkins'), 6)
  assert.equal(getCosmeticPageSize('coins'), 8)
  assert.equal(getCosmeticPageSize('cardBacks'), 8)
  assert.deepEqual(paginateCosmetics(items, 2, 6), {
    items: items.slice(6, 12),
    currentPage: 2,
    pageCount: 3,
    start: 6,
    end: 12,
    total: 17
  })
})

test('收藏统计按类型与总数计算已拥有数量', () => {
  const stats = getCollectionStats({
    heroSkins: [{ id: 'skin-1' }, { id: 'skin-2' }],
    coins: [{ id: 'coin-1' }],
    cardBacks: [{ id: 'back-1' }]
  }, {
    heroSkins: ['skin-2'],
    coins: ['coin-1'],
    cardBacks: []
  })
  assert.deepEqual(stats.byType.heroSkins, { total: 2, owned: 1, percentage: 50 })
  assert.deepEqual(stats.byType.coins, { total: 1, owned: 1, percentage: 100 })
  assert.equal(stats.owned, 2)
  assert.equal(stats.total, 4)
  assert.equal(stats.percentage, 50)
})

test('英雄切换按钮按照炉石十一职业顺序统计收藏', () => {
  const stats = getHeroClassStats([
    { id: 'warrior', heroClass: '战士' },
    { id: 'mage', heroClass: '法师' },
    { id: 'death-knight', heroClass: '死亡骑士' },
    { id: 'druid', heroClass: '德鲁伊' }
  ], ['mage'])
  assert.equal(stats.length, 11)
  assert.deepEqual(stats.slice(0, 5).map((item) => item.heroClass), [
    '死亡骑士', '恶魔猎手', '德鲁伊', '猎人', '法师'
  ])
  assert.deepEqual(stats.find((item) => item.heroClass === '法师'), {
    heroClass: '法师', total: 1, owned: 1, percentage: 100
  })
  assert.equal(stats.find((item) => item.heroClass === '战士').percentage, 0)
})

test('收藏条目允许保存中文风味描述和获取方式', () => {
  const item = {
    id: 'coin-1',
    name: '星球幸运币',
    flavorText: '整个世界，尽在掌中。',
    howToGet: '购买“深暗领域”旅店通行证后，在奖励路线达到90级。',
    availability: '当前无法获取'
  }
  assert.equal(item.flavorText, '整个世界，尽在掌中。')
  assert.match(item.howToGet, /奖励路线/)
  assert.equal(item.availability, '当前无法获取')
})
