#!/usr/bin/env node
/**
 * 生成「炉石卡牌蛙生」用的标准随从卡数据集。
 *
 * 数据来源：src/features/hearthstone/data/cards-db.json（暴雪国服构筑卡接口快照，
 * 由 scripts/fetch-hs-cards.mjs 生成，已含 OSS 图片相对路径 ossFull / ossCrop）。
 *
 * 过滤规则（与游戏「标准模式」一致）：
 *   1. cardSetId 属于 STANDARD_SET_IDS（当前轮换内的 5 个扩展包 + 核心 + 活动）
 *   2. cardTypeId === 4（随从；法术/武器/地标一律不要）
 *   3. collectible === 1（可收藏，排除衍生物）
 *   4. attack / health 均为有限数字
 *
 * 输出：src/features/hearthstone/data/standard-minions.json
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
const DB_FILE = path.join(ROOT, 'src/features/hearthstone/data/cards-db.json')
const OUT_FILE = path.join(ROOT, 'src/features/hearthstone/data/standard-minions.json')

/** 当前标准轮换包含的版本（cardSetId → 中文名，仅注释用） */
export const STANDARD_SETS = [
  { id: 1988, name: '逃离紫罗兰监狱' },
  { id: 1980, name: '大地的裂变' },
  { id: 1957, name: '穿越时间流' },
  { id: 1952, name: '安戈洛龟途' },
  { id: 1946, name: '漫游翡翠梦境' },
  { id: 1941, name: '活动' },
  { id: 1637, name: '核心' }
]

const STANDARD_SET_IDS = new Set(STANDARD_SETS.map((s) => s.id))

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))

const minions = Object.values(db)
  .filter((card) => (
    STANDARD_SET_IDS.has(card.cardSetId) &&
    card.cardTypeId === 4 &&
    card.collectible === 1 &&
    Number.isFinite(card.attack) &&
    Number.isFinite(card.health) &&
    Boolean(card.ossFull)
  ))
  .map((card) => ({
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
  }))
  .sort((a, b) => a.manaCost - b.manaCost || a.id - b.id)

const bySet = {}
for (const card of minions) bySet[card.setName] = (bySet[card.setName] || 0) + 1

const payload = {
  mode: 'standard',
  generatedAt: new Date().toISOString(),
  source: 'src/features/hearthstone/data/cards-db.json',
  sets: STANDARD_SETS,
  total: minions.length,
  cards: minions
}

fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload)}\n`)

console.log(`已生成 ${minions.length} 张标准随从 -> ${path.relative(ROOT, OUT_FILE)}`)
for (const [name, count] of Object.entries(bySet)) console.log(`  ${name.padEnd(12)} ${count}`)
