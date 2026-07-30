/**
 * 按完成距离、奖励效率、置顶和可顺带完成程度生成规则型推荐。
 */
export function rankAchievementRecommendations(
  achievements,
  {
    getProgressInfo,
    getAchievementXp,
    pinnedIds = [],
    limit = 6
  }
) {
  const pinnedIdSet = new Set(pinnedIds)
  const incomplete = achievements.filter(
    (achievement) => !getProgressInfo(achievement).completed
  )
  const relatedCardFrequency = buildRelatedCardFrequency(incomplete)

  return incomplete
    .map((achievement) =>
      scoreAchievement(achievement, {
        getProgressInfo,
        getAchievementXp,
        pinnedIdSet,
        relatedCardFrequency
      })
    )
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score
      return left.achievement.name.localeCompare(right.achievement.name, 'zh')
    })
    .slice(0, limit)
}

function scoreAchievement(
  achievement,
  {
    getProgressInfo,
    getAchievementXp,
    pinnedIdSet,
    relatedCardFrequency
  }
) {
  const progress = getProgressInfo(achievement)
  const remaining = Math.max(1, progress.remainingCount || 1)
  const xp = getAchievementXp(achievement)
  const points = (achievement.stages || []).reduce(
    (total, stage) => total + (stage.points || 0),
    0
  )
  const sharedCards = (achievement.relatedCards || []).filter(
    (cardName) => (relatedCardFrequency.get(cardName) || 0) > 1
  )

  const progressScore = progress.percent * 0.55
  const proximityScore = 28 / Math.sqrt(remaining)
  const xpEfficiencyScore = Math.min(22, xp / remaining / 5)
  const pointEfficiencyScore = Math.min(16, points / remaining / 4)
  const pinnedScore = pinnedIdSet.has(achievement.id) ? 24 : 0
  const synergyScore = Math.min(12, sharedCards.length * 4)
  const score = Math.round(
    (progressScore +
      proximityScore +
      xpEfficiencyScore +
      pointEfficiencyScore +
      pinnedScore +
      synergyScore) *
      100
  ) / 100

  const tags = []
  if (pinnedScore) tags.push('已置顶')
  if (progress.percent >= 75 || remaining <= 1) tags.push('接近完成')
  if (xpEfficiencyScore >= 12) tags.push('经验效率高')
  if (pointEfficiencyScore >= 10) tags.push('成就点效率高')
  if (sharedCards.length) tags.push('可顺带完成')
  if (!tags.length) tags.push(achievement.type === '累计' ? '稳步推进' : '目标明确')

  return {
    achievement,
    score,
    tags,
    reason: buildReason({
      progress,
      remaining,
      xp,
      points,
      sharedCards
    })
  }
}

function buildRelatedCardFrequency(achievements) {
  const frequencies = new Map()
  for (const achievement of achievements) {
    for (const cardName of new Set(achievement.relatedCards || [])) {
      frequencies.set(cardName, (frequencies.get(cardName) || 0) + 1)
    }
  }
  return frequencies
}

function buildReason({ progress, remaining, xp, points, sharedCards }) {
  const parts = [`已完成 ${progress.percent}%`]
  if (progress.hasCount) {
    parts.push(`距下一阶段还差 ${remaining}`)
  } else {
    parts.push(`还差 ${remaining} 个目标`)
  }
  if (xp || points) parts.push(`可获 ${xp} 经验 / ${points} 成就点`)
  if (sharedCards.length) {
    parts.push(`与其他目标共享 ${sharedCards.slice(0, 2).join('、')}`)
  }
  return parts.join(' · ')
}
