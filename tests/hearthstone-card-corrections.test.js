import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import cataclysm from '../src/features/hearthstone/data/achievements/cataclysm.json' with { type: 'json' }
import emeraldDream from '../src/features/hearthstone/data/achievements/emerald-dream.json' with { type: 'json' }
import legendFestival from '../src/features/hearthstone/data/achievements/legend-festival.json' with { type: 'json' }
import titan from '../src/features/hearthstone/data/achievements/titan.json' with { type: 'json' }
import ungoro from '../src/features/hearthstone/data/achievements/ungoro.json' with { type: 'json' }
import cardImages from '../src/features/hearthstone/data/deck-card-images.json' with { type: 'json' }
import achievementCardImages from '../src/features/hearthstone/data/achievement-card-images.json' with { type: 'json' }
import achievementCardDetails from '../src/features/hearthstone/data/achievement-card-details.json' with { type: 'json' }
import {
  getClassName,
  matchesClass
} from '../src/features/hearthstone/utils/achievements.js'

const achievementsDirectory = new URL(
  '../src/features/hearthstone/data/achievements/',
  import.meta.url
)
const expansionAchievements = readdirSync(achievementsDirectory)
  .filter((fileName) => fileName.endsWith('.json'))
  .flatMap((fileName) => {
    const expansion = JSON.parse(
      readFileSync(new URL(fileName, achievementsDirectory), 'utf8')
    )
    return expansion.achievements
  })

const corrections = [
  [cataclysm, 'ct-010', '晶化魔网', 123504],
  [emeraldDream, 'ed-021', '沃尔科罗斯', 115748],
  [emeraldDream, 'ed-024', '新月辉光', 115642],
  [legendFestival, 'legend-festival-012', '粉丝互动', 90687],
  [titan, 'titan-030', '致命诛灭', 97530]
]

test('成就关联卡名与原图、缩略图映射保持一致', () => {
  for (const [expansion, achievementId, cardName, dbfId] of corrections) {
    const achievement = expansion.achievements.find((item) => item.id === achievementId)
    assert.ok(achievement, `找不到成就 ${achievementId}`)
    assert.ok(achievement.relatedCards.includes(cardName), `${achievement.name} 未关联 ${cardName}`)
    assert.equal(
      cardImages[cardName]?.crop,
      `/hearthstone-cards/wild/crop/${cardName}_${dbfId}.png`
    )
    assert.equal(
      cardImages[cardName]?.full,
      `/hearthstone-cards/wild/full/${cardName}_${dbfId}.png`
    )
  }
})

test('成就专用卡图索引覆盖全部关联卡牌并与完整索引一致', () => {
  const relatedCardNames = new Set(
    expansionAchievements.flatMap(
      (achievement) => achievement.relatedCards || []
    )
  )

  for (const cardName of relatedCardNames) {
    assert.deepEqual(
      achievementCardImages[cardName],
      cardImages[cardName],
      `成就专用卡图索引缺少或未同步：${cardName}`
    )
  }
  assert.equal(
    Object.keys(achievementCardImages).length,
    relatedCardNames.size
  )
})

test('成就关联卡牌效果索引覆盖可识别卡牌并保留纯文本', () => {
  const relatedCardNames = new Set(
    expansionAchievements.flatMap(
      (achievement) => achievement.relatedCards || []
    )
  )

  for (const [cardName, details] of Object.entries(achievementCardDetails)) {
    assert.ok(relatedCardNames.has(cardName), `效果索引包含未关联卡牌：${cardName}`)
    assert.equal(typeof details.text, 'string')
    assert.doesNotMatch(details.text, /<[^>]+>/, `${cardName} 的效果仍包含 HTML 标签`)
  }

  assert.equal(
    achievementCardDetails['魔暴龙面具']?.text,
    '将一个随从的属性值变为8/8。使其获得冲锋。'
  )
  assert.ok(
    Object.keys(achievementCardDetails).length >= relatedCardNames.size,
    '效果索引缺少过多成就关联卡牌'
  )
})

test('安戈洛传奇关联任务牌并支持九职业进度选择', () => {
  const achievement = ungoro.achievements.find(
    (item) => item.id === 'ungoro-014'
  )
  const legacyClasses = [
    '德鲁伊',
    '猎人',
    '法师',
    '圣骑士',
    '牧师',
    '潜行者',
    '萨满祭司',
    '术士',
    '战士'
  ]

  assert.equal(achievement.heroClass, '中立')
  assert.deepEqual(achievement.classes, legacyClasses)
  assert.deepEqual(achievement.trackClasses, legacyClasses)
  assert.deepEqual(achievement.relatedCards, ['走进失落之城'])
  assert.equal(getClassName(achievement), '9职业')
  for (const heroClass of legacyClasses) {
    assert.equal(matchesClass(achievement, heroClass), true)
  }
  assert.equal(matchesClass(achievement, '恶魔猎手'), false)
  assert.equal(matchesClass(achievement, '死亡骑士'), false)
  assert.equal(
    achievementCardImages['走进失落之城']?.full,
    '/hearthstone-cards/wild/full/走进失落之城_117716.png'
  )
  assert.equal(
    achievementCardDetails['走进失落之城']?.text,
    '任务：存活10个回合。奖励：拉特维厄斯，城市之眼。'
  )
})
