import achievementCardImageManifest from '../data/achievement-card-images.json' with { type: 'json' }
import deckCardImageManifest from '../data/deck-card-images.json' with { type: 'json' }
import { withCardImgVersion } from './cardImages.js'

function getCardImage(name) {
  return achievementCardImageManifest[name] || deckCardImageManifest[name] || null
}

/**
 * 获取成就关联卡牌的完整原画路径。
 */
export function getAchievementCardFull(name) {
  return withCardImgVersion(getCardImage(name)?.full || null)
}

/**
 * 获取成就关联卡牌的裁剪图路径。
 */
export function getAchievementCardCrop(name) {
  return withCardImgVersion(getCardImage(name)?.crop || null)
}
