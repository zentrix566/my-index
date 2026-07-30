import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import cataclysm from '../src/features/hearthstone/data/achievements/cataclysm.json' with { type: 'json' }
import emeraldDream from '../src/features/hearthstone/data/achievements/emerald-dream.json' with { type: 'json' }
import legendFestival from '../src/features/hearthstone/data/achievements/legend-festival.json' with { type: 'json' }
import titan from '../src/features/hearthstone/data/achievements/titan.json' with { type: 'json' }
import cardImages from '../src/features/hearthstone/data/deck-card-images.json' with { type: 'json' }
import achievementCardImages from '../src/features/hearthstone/data/achievement-card-images.json' with { type: 'json' }

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
