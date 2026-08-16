#!/usr/bin/env node
/**
 * 生成「炉石卡牌蛙生」用的随从卡数据集（标准 + 狂野）。
 *
 * 数据来源：public/hearthstone/cards-db.json（暴雪国服构筑卡接口快照，
 * 由 scripts/fetch-hs-cards.mjs 生成，已含 OSS 图片相对路径 ossFull / ossCrop）。
 *
 * 通用过滤规则：
 *   1. cardTypeId === 4（随从；法术/武器/地标一律不要）
 *   2. collectible === 1（可收藏，排除衍生物）
 *   3. attack / health 均为有限数字
 *   4. 存在 OSS 全图 ossFull（无图卡不参与找茬）
 *
 * 模式区分（与游戏一致）：
 *   - 标准：cardSetId 属于 STANDARD_SET_IDS（当前轮换内的 5 个扩展包 + 核心 + 活动）
 *   - 狂野：其余所有可收藏随从
 *
 * 输出：
 *   src/features/hearthstone/data/standard-minions.json
 *   src/features/hearthstone/data/wild-minions.json
 * 图片字段只存 OSS 相对路径 /hearthstone-cards/<版本>/full/<名>_<id>.png，
 * 由 server/index.js 反代到阿里云 OSS，前端不打包任何本地卡图。
 *
 * 轮换更新方式：改 STANDARD_SET_IDS 后重跑本脚本。
 * 版本分类真源：GET https://webapi.blizzard.cn/hs-cards-api-server/api/web/cards/constructed/set
 * （返回 标准卡牌 / 狂野卡牌 两个分类，直接照抄「标准卡牌」下的 id 即可）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DB_FILE = path.join(ROOT, 'public/hearthstone/cards-db.json')
const STANDARD_OUT = path.join(ROOT, 'src/features/hearthstone/data/standard-minions.json')
const WILD_OUT = path.join(ROOT, 'src/features/hearthstone/data/wild-minions.json')

/** 当前标准轮换包含的版本（cardSetId → 中文名，仅注释用） */
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

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))

const mapMinion = (card) => ({
  id: card.id,
  name: card.name,
  manaCost: card.manaCost,
  attack: card.attack,
  health: card.health,
  classId: card.classId,
  // 双职业卡的卡框是两色拼接，和单职业卡不通用；
  // 记一个稳定的签名，供「同框补丁」筛选供体时比对（单职业为空串）。
  dual: Array.isArray(card.multiClassIds) && card.multiClassIds.length
    ? [...card.multiClassIds].sort((a, b) => a - b).join('-')
    : '',
  text: card.text || '',
  minionTypeId: card.minionTypeId ?? 0,
  rarityId: card.rarityId,
  setId: card.cardSetId,
  setName: card.setName,
  image: card.ossFull
})

const filterMinions = (predicate) => Object.values(db)
  .filter((card) => (
    predicate(card) &&
    card.cardTypeId === 4 &&
    card.collectible === 1 &&
    Number.isFinite(card.attack) &&
    Number.isFinite(card.health) &&
    Boolean(card.ossFull)
  ))
  .map(mapMinion)
  .sort((a, b) => a.manaCost - b.manaCost || a.id - b.id)

const buildPayload = (mode, sets, minions) => ({
  mode,
  generatedAt: new Date().toISOString(),
  source: 'public/hearthstone/cards-db.json',
  sets,
  total: minions.length,
  cards: minions
})

// ---- 标准模式 ----
const standardMinions = filterMinions((card) => STANDARD_SET_IDS.has(card.cardSetId))
fs.writeFileSync(STANDARD_OUT, `${JSON.stringify(buildPayload('standard', STANDARD_SETS, standardMinions))}\n`)
console.log(`已生成 ${standardMinions.length} 张标准随从 -> ${path.relative(ROOT, STANDARD_OUT)}`)

// ---- 狂野模式：其余所有可收藏随从 ----
const wildMinions = filterMinions((card) => !STANDARD_SET_IDS.has(card.cardSetId))
const wildSetMap = {}
for (const card of wildMinions) wildSetMap[card.setId] = card.setName
const wildSets = Object.entries(wildSetMap)
  .map(([id, name]) => ({ id: Number(id), name }))
  .sort((a, b) => a.id - b.id)
fs.writeFileSync(WILD_OUT, `${JSON.stringify(buildPayload('wild', wildSets, wildMinions))}\n`)
console.log(`已生成 ${wildMinions.length} 张狂野随从 -> ${path.relative(ROOT, WILD_OUT)}`)

const bySet = (minions) => {
  const result = {}
  for (const card of minions) result[card.setName] = (result[card.setName] || 0) + 1
  return result
}
for (const [name, count] of Object.entries(bySet(wildMinions))) console.log(`  ${name.padEnd(12)} ${count}`)
