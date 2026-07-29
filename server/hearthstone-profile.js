// 服务端置顶成就上限。与前端 src/features/hearthstone/utils/constants.js
// 中的 MAX_PINNED_ACHIEVEMENTS 保持一致，调整时两处需要同步。
export const MAX_PINNED_ACHIEVEMENTS = 10

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
