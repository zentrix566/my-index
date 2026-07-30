import achievementCardImageManifest from '../data/achievement-card-images.json' with { type: 'json' }

/**
 * 获取成就关联卡牌的完整原画路径。
 */
export function getAchievementCardFull(name) {
  return achievementCardImageManifest[name]?.full || null
}

/**
 * 获取成就关联卡牌的裁剪图路径。
 */
export function getAchievementCardCrop(name) {
  return achievementCardImageManifest[name]?.crop || null
}
