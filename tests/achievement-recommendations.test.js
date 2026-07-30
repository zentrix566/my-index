import assert from 'node:assert/strict'
import test from 'node:test'
import { rankAchievementRecommendations } from '../src/features/hearthstone/utils/achievementRecommendations.js'

const achievements = [
  {
    id: 'almost-done',
    name: '即将完成',
    type: '累计',
    relatedCards: ['共享卡牌'],
    stages: [{ points: 20, xpReward: 100 }]
  },
  {
    id: 'far-away',
    name: '长期目标',
    type: '累计',
    relatedCards: ['共享卡牌'],
    stages: [{ points: 10, xpReward: 50 }]
  },
  {
    id: 'pinned',
    name: '置顶目标',
    type: '一次性',
    relatedCards: [],
    stages: [{ points: 5, xpReward: 20 }]
  }
]

const progressById = {
  'almost-done': { completed: false, percent: 90, remainingCount: 1, hasCount: true },
  'far-away': { completed: false, percent: 10, remainingCount: 80, hasCount: true },
  pinned: { completed: false, percent: 0, remainingCount: 1, hasCount: false }
}

test('规则推荐优先考虑接近完成、奖励效率和置顶目标', () => {
  const recommendations = rankAchievementRecommendations(achievements, {
    getProgressInfo: (achievement) => progressById[achievement.id],
    getAchievementXp: (achievement) =>
      achievement.stages.reduce((total, stage) => total + stage.xpReward, 0),
    pinnedIds: ['pinned']
  })

  assert.equal(recommendations[0].achievement.id, 'almost-done')
  assert.ok(recommendations[0].tags.includes('接近完成'))
  assert.ok(recommendations[0].tags.includes('可顺带完成'))
  assert.ok(
    recommendations.find((item) => item.achievement.id === 'pinned').tags.includes('已置顶')
  )
})

test('规则推荐排除已完成成就并遵守数量限制', () => {
  const recommendations = rankAchievementRecommendations(achievements, {
    getProgressInfo: (achievement) =>
      achievement.id === 'far-away'
        ? { ...progressById[achievement.id], completed: true }
        : progressById[achievement.id],
    getAchievementXp: () => 0,
    limit: 1
  })

  assert.equal(recommendations.length, 1)
  assert.notEqual(recommendations[0].achievement.id, 'far-away')
})
