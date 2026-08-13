export const COSMETIC_TYPES = Object.freeze([
  { id: 'heroSkins', label: '英雄皮肤', emptyText: '还没有英雄皮肤图片' },
  { id: 'coins', label: '幸运币', emptyText: '还没有幸运币图片' },
  { id: 'cardBacks', label: '卡背', emptyText: '还没有卡背图片' }
])

export const HERO_CLASS_ORDER = Object.freeze([
  '死亡骑士',
  '恶魔猎手',
  '德鲁伊',
  '猎人',
  '法师',
  '圣骑士',
  '牧师',
  '潜行者',
  '萨满祭司',
  '术士',
  '战士'
])

/** 计算十一职业各自的英雄皮肤收藏数量。 */
/** 返回每种收藏在单页中的展示数量。 */
export function getCosmeticPageSize(type) {
  return type === 'heroSkins' ? 6 : 8
}

/** 按页截取收藏条目，并将越界页码收敛到有效范围。 */
export function paginateCosmetics(items, page, pageSize) {
  const source = Array.isArray(items) ? items : []
  const size = Math.max(1, Number(pageSize) || 1)
  const pageCount = Math.max(1, Math.ceil(source.length / size))
  const currentPage = Math.min(pageCount, Math.max(1, Number(page) || 1))
  const start = (currentPage - 1) * size
  return {
    items: source.slice(start, start + size),
    currentPage,
    pageCount,
    start,
    end: Math.min(start + size, source.length),
    total: source.length
  }
}

/** 将已拥有收藏稳定排列在前面，同组内保持原始顺序。 */
export function sortOwnedCosmeticsFirst(items, ownedIds) {
  const source = Array.isArray(items) ? items : []
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || [])
  return source
    .map((item, index) => ({ item, index, owned: owned.has(item.id) }))
    .sort((left, right) => Number(right.owned) - Number(left.owned) || left.index - right.index)
    .map(({ item }) => item)
}

/** 将三类收藏展开为带类型信息的全局搜索数据。 */
export function getGlobalCosmeticItems(catalog) {
  return COSMETIC_TYPES.flatMap((type) => (
    Array.isArray(catalog?.[type.id])
      ? catalog[type.id].map((item) => ({
          ...item,
          cosmeticType: type.id,
          cosmeticTypeLabel: type.label
        }))
      : []
  ))
}

/** 在全部外观中仅按正式名称匹配关键词。 */
export function searchCosmetics(items, query) {
  const keyword = String(query || '').trim().toLocaleLowerCase('zh-CN')
  if (!keyword) return Array.isArray(items) ? items : []
  return (Array.isArray(items) ? items : []).filter((item) =>
    String(item.officialName || '').toLocaleLowerCase('zh-CN').includes(keyword)
  )
}

export function getHeroClassStats(items, ownedIds) {
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || [])
  return HERO_CLASS_ORDER.map((heroClass) => {
    const classItems = (Array.isArray(items) ? items : [])
      .filter((item) => item.heroClass === heroClass)
    const ownedCount = classItems.reduce((count, item) => count + Number(owned.has(item.id)), 0)
    return {
      heroClass,
      total: classItems.length,
      owned: ownedCount,
      percentage: classItems.length
        ? Math.round((ownedCount / classItems.length) * 100)
        : 0
    }
  })
}

/** 计算单类与全收藏完成度。 */
export function getCollectionStats(catalog, collection) {
  const byType = {}
  let total = 0
  let owned = 0
  for (const type of COSMETIC_TYPES) {
    const items = Array.isArray(catalog?.[type.id]) ? catalog[type.id] : []
    const ownedIds = new Set(Array.isArray(collection?.[type.id]) ? collection[type.id] : [])
    const typeOwned = items.reduce((count, item) => count + Number(ownedIds.has(item.id)), 0)
    byType[type.id] = {
      total: items.length,
      owned: typeOwned,
      percentage: items.length ? Math.round((typeOwned / items.length) * 100) : 0
    }
    total += items.length
    owned += typeOwned
  }
  return {
    total,
    owned,
    percentage: total ? Math.round((owned / total) * 100) : 0,
    byType
  }
}
