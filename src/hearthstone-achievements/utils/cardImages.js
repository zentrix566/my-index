// 卡组卡牌本地图片查询工具
// 数据由 scripts/generate-deck-card-manifest.mjs 根据 public/hearthstone-cards/wild 下的图片生成
import cardImageManifest from '../data/deck-card-images.json' with { type: 'json' }

/** Hearthstone CDN 基地址（zhCN 卡牌原画） */
export const CDN_BASE = 'https://d15f34w2p8l1cc.cloudfront.net/hearthstone/zhcn'

/** 稀有度到统一标识的映射（兼容 deckstring.js 的中文稀有度与 cards_meta 的 rarity_id） */
const RARITY_MAP = {
  common: 'common',
  free: 'common',
  普通: 'common',
  基础: 'common',
  rare: 'rare',
  稀有: 'rare',
  epic: 'epic',
  史诗: 'epic',
  legendary: 'legendary',
  传说: 'legendary'
}

/** 稀有度对应文字颜色（旅法师营地风格） */
const RARITY_COLORS = {
  common: '#111827',   // 白卡：黑色
  rare: '#2563eb',     // 蓝卡：蓝色
  epic: '#9333ea',     // 紫卡：紫色
  legendary: '#f97316' // 橙卡：橙色
}

/**
 * 获取卡牌本地图片路径
 * @param {string} name 卡牌中文名
 * @returns {{ crop?: string, full?: string } | null}
 */
export function getLocalCardImages(name) {
  return cardImageManifest[name] || null
}

/**
 * 获取卡牌完整图 URL（优先本地，缺失则回退 CDN）
 * @param {string} name 卡牌中文名
 * @param {string} [cardId] 卡牌 slug id，用于 CDN 回退
 */
export function getCardFullImage(name, cardId) {
  const local = cardImageManifest[name]
  if (local && local.full) return local.full
  if (cardId) return `${CDN_BASE}/${cardId}.png`
  return ''
}

/**
 * 获取卡牌缩略图 URL（优先本地，缺失则回退 CDN）
 * @param {string} name 卡牌中文名
 * @param {string} [cardId] 卡牌 slug id，用于 CDN 回退
 */
export function getCardCropImage(name, cardId) {
  const local = cardImageManifest[name]
  if (local && local.crop) return local.crop
  if (cardId) return `${CDN_BASE}/${cardId}.png`
  return ''
}

/**
 * 标准化稀有度标识
 * @param {string|number} rarity 中文稀有度或 rarity_id
 * @returns {'common'|'rare'|'epic'|'legendary'|'unknown'}
 */
export function normalizeRarity(rarity) {
  if (typeof rarity === 'number') {
    if (rarity === 1 || rarity === 2) return 'common'
    if (rarity === 3) return 'rare'
    if (rarity === 4) return 'epic'
    if (rarity === 5) return 'legendary'
    return 'unknown'
  }
  return RARITY_MAP[rarity] || 'unknown'
}

/**
 * 获取稀有度文字颜色
 * @param {string|number} rarity
 */
export function getRarityColor(rarity) {
  return RARITY_COLORS[normalizeRarity(rarity)] || '#e2e8f0'
}

/**
 * 获取稀有度 CSS 类名
 * @param {string|number} rarity
 */
export function getRarityClass(rarity) {
  return `ddm-rarity-${normalizeRarity(rarity)}`
}
