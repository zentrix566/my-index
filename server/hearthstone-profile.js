// 服务端置顶成就上限。与前端 src/features/hearthstone/utils/constants.js
// 中的 MAX_PINNED_ACHIEVEMENTS 保持一致，调整时两处需要同步。
export const MAX_PINNED_ACHIEVEMENTS = 10
export const MAX_COSMETICS_PER_TYPE = 2000

/** 将旧的单项置顶值与新的数组值统一为去重后的 ID 数组。 */
export function normalizePinnedAchievementIds(value) {
  let source = value
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source)
      source = Array.isArray(parsed) ? parsed : [source]
    } catch {
      source = [source]
    }
  }
  if (!Array.isArray(source)) return []

  const normalized = []
  for (const id of source) {
    if (typeof id !== 'string' || !id || normalized.includes(id)) continue
    normalized.push(id)
    if (normalized.length >= MAX_PINNED_ACHIEVEMENTS) break
  }
  return normalized
}

/** 规整用户收藏 ID，限制数量与字符，避免把任意大对象写入个人配置。 */
export function normalizeCosmeticIds(value) {
  if (!Array.isArray(value)) return []
  const normalized = []
  for (const id of value) {
    if (
      typeof id !== 'string' ||
      !/^[a-z0-9_-]{1,160}$/i.test(id) ||
      normalized.includes(id)
    ) continue
    normalized.push(id)
    if (normalized.length >= MAX_COSMETICS_PER_TYPE) break
  }
  return normalized
}

/** 统一三类炉石外观收藏结构。 */
export function normalizeCosmeticCollection(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    heroSkins: normalizeCosmeticIds(source.heroSkins),
    coins: normalizeCosmeticIds(source.coins),
    cardBacks: normalizeCosmeticIds(source.cardBacks)
  }
}
