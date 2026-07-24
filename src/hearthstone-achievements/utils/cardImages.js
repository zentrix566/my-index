// 卡组卡牌本地图片查询工具
// 数据由 scripts/generate-deck-card-manifest.mjs 根据 public/hearthstone-cards/wild 下的图片生成
import cardImageManifest from '../data/deck-card-images.json' with { type: 'json' }

/** 阿里云 OSS 图片基地址（公开读）。在 .env 配置 VITE_OSS_BASE，如 https://bucket.oss-cn-beijing.aliyuncs.com
 *  配置后前端优先从 OSS 加载卡牌图（不进 Docker 镜像、部署稳定、国内快）；未配置时用相对路径
 *  /hearthstone-cards/...，由站点服务端（生产）或 vite（本地）反向代理到 OSS——全程不访问本地图片。 */
const OSS_BASE = (typeof import.meta !== 'undefined' && import.meta.env
  ? (import.meta.env.VITE_OSS_BASE || '')
  : ''
).replace(/\/$/, '')

/** 导出供 deckstring.js 等复用，避免重复读取环境变量 */
export { OSS_BASE }

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
 * 获取卡牌完整图 URL（优先 OSS，其次本地 public，最后 CDN 兜底）
 * @param {string} name 卡牌中文名
 * @param {string} [cardId] 卡牌 slug id，用于 CDN 回退
 */
export function getCardFullImage(name, cardId) {
  const local = cardImageManifest[name]
  if (OSS_BASE && local && local.full) return `${OSS_BASE}${local.full}`
  if (local && local.full) return local.full
  return ''
}

/**
 * 获取卡牌缩略图 URL（优先 OSS，其次相对路径经代理到 OSS；不回退本地/CDN）
 * @param {string} name 卡牌中文名
 * @param {string} [cardId] 预留参数（历史兼容），当前未使用
 */
export function getCardCropImage(name, cardId) {
  const local = cardImageManifest[name]
  if (OSS_BASE && local && local.crop) return `${OSS_BASE}${local.crop}`
  if (local && local.crop) return local.crop
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

/** 稀有度合成尘造价（普通版本；金卡见 GOLDEN_DUST，与游戏一致） */
const RARITY_DUST = {
  common: 40,
  rare: 100,
  epic: 400,
  legendary: 1600,
  unknown: 0
}
/** 金卡合成尘造价（普通卡的金版本，用于「全金」造价估算） */
const GOLDEN_DUST = {
  common: 400,
  rare: 800,
  epic: 1600,
  legendary: 3200,
  unknown: 0
}

/**
 * 单张卡牌的合成尘造价
 * 基础卡（免费获得、不可合成）按 0 计；其余按稀有度取表值。
 * @param {string|number} rarity 中文稀有度或 rarity_id
 * @param {boolean} [golden] 是否按金卡造价计算（全金估算）
 * @returns {number}
 */
export function getRarityDust(rarity, golden = false) {
  if (rarity === '基础' || rarity === 'free' || rarity === '基础卡') return 0
  const table = golden ? GOLDEN_DUST : RARITY_DUST
  return table[normalizeRarity(rarity)] || 0
}

/** 稀有度中文短名（用于统计面板/导出） */
export const RARITY_LABELS = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  unknown: '其他'
}
