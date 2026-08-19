import achievementCardImageManifest from '../data/achievement-card-images.json' with { type: 'json' }
import { withCardImgVersion } from './cardImages.js'

/**
 * 获取成就关联卡牌的完整原画路径。
 */
export function getAchievementCardFull(name) {
  return withCardImgVersion(achievementCardImageManifest[name]?.full || null)
}

/**
 * 获取成就关联卡牌的裁剪图路径。
 */
export function getAchievementCardCrop(name) {
  return withCardImgVersion(achievementCardImageManifest[name]?.crop || null)
}
