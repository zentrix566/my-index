/**
 * 全站共享的卡牌数据库加载器。
 *
 * 唯一数据源：OSS 上的 /hearthstone-data/cards-db.json（由 scripts/fetch-hs-cards.mjs
 * 从暴雪国服 API 拉取生成）。卡牌查询页、蛙生游戏、成就推荐均复用此加载器，
 * 不再各自维护派生 JSON——更新卡牌数值时只需替换 OSS 上这一个文件，无需重新构建部署。
 *
 * 缓存策略：服务端对 /hearthstone-data/* 设 5 分钟 TTL + ETag 条件请求，
 * 浏览器 5 分钟内直接用缓存，过期后发 If-None-Match 校验，内容未变返回 304。
 */
import { withCardImgVersion } from '../utils/cardImages.js'

/**
 * 当前标准轮换包含的版本（cardSetId → 中文名）。
 * 每年轮换更新一次；真源：暴雪国服构筑卡接口的「标准卡牌」分类 id。
 */
export const STANDARD_SETS = [
  { id: 1988, name: '逃离紫罗兰监狱' },
  { id: 1980, name: '大地的裂变' },
  { id: 1957, name: '穿越时间流' },
  { id: 1952, name: '安戈洛龟途' },
  { id: 1946, name: '漫游翡翠梦境' },
  { id: 1981, name: '活动' },
  { id: 1637, name: '核心' }
]

const STANDARD_SET_IDS = new Set(STANDARD_SETS.map((s) => s.id))

let dbPromise = null

/** 加载全量卡牌数据库（按 dbfId 索引），多个调用方共享同一次 fetch。 */
export function loadCardDatabase() {
  if (!dbPromise) {
    dbPromise = fetch('/hearthstone-data/cards-db.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .catch((err) => {
        // 失败时清除缓存，允许调用方重试（卡牌查询页有「重新加载」按钮）
        dbPromise = null
        throw err
      })
  }
  return dbPromise
}

/** 判断一张卡是否为可参与蛙生找茬的可收藏随从。 */
function isPlayableMinion(card) {
  return card.cardTypeId === 4 &&
    card.collectible === 1 &&
    Number.isFinite(card.attack) &&
    Number.isFinite(card.health) &&
    Boolean(card.ossFull)
}

/** 将 cards-db 原始记录映射为蛙生游戏所需的卡牌格式。 */
function mapFrogCard(card) {
  return {
    id: card.id,
    name: card.name,
    manaCost: card.manaCost,
    attack: card.attack,
    health: card.health,
    classId: card.classId,
    // 双职业卡的卡框是两色拼接，记一个稳定签名供「同框补丁」筛选供体时比对
    dual: Array.isArray(card.multiClassIds) && card.multiClassIds.length
      ? [...card.multiClassIds].sort((a, b) => a - b).join('-')
      : '',
    text: card.text || '',
    minionTypeId: card.minionTypeId ?? 0,
    rarityId: card.rarityId,
    setId: card.cardSetId,
    setName: card.setName,
    image: withCardImgVersion(card.ossFull)
  }
}

/**
 * 获取蛙生游戏卡池。
 * @param {'standard'|'wild'} mode
 */
export async function getFrogMinions(mode) {
  const db = await loadCardDatabase()
  const inStandard = STANDARD_SET_IDS
  return Object.values(db)
    .filter((card) => isPlayableMinion(card) && (mode === 'standard'
      ? inStandard.has(card.cardSetId)
      : !inStandard.has(card.cardSetId)))
    .map(mapFrogCard)
}

let detailsByNamePromise = null

/**
 * 加载按卡名索引的卡牌详情（{ text, manaCost, attack, health }）。
 * 同名卡取 setPriority 最高者，供成就推荐等按名称查卡的场景使用。
 */
export function loadCardDetailsByName() {
  if (!detailsByNamePromise) {
    detailsByNamePromise = loadCardDatabase().then((db) => {
      const map = {}
      for (const card of Object.values(db)) {
        const existing = map[card.name]
        if (!existing || (card.setPriority || 0) > (existing._p || -1)) {
          map[card.name] = {
            text: card.text || '',
            manaCost: card.manaCost,
            attack: card.attack,
            health: card.health,
            _p: card.setPriority || 0
          }
        }
      }
      for (const key of Object.keys(map)) delete map[key]._p
      return map
    })
  }
  return detailsByNamePromise
}
