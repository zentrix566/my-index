#!/usr/bin/env node
/**
 * 在已落地的 HearthstoneJSON 卡牌库里查找卡牌（主体数据源查阅工具）。
 * 数据文件：src/features/hearthstone/data/hearthstonejson-zhCN-cards.json
 *
 * 用法（可组合多个过滤条件，取交集）：
 *   node scripts/hsjson-query.mjs --dbf 2539
 *   node scripts/hsjson-query.mjs --id AT_001
 *   node scripts/hsjson-query.mjs --name 炎枪术
 *   node scripts/hsjson-query.mjs --set TGT
 *   node scripts/hsjson-query.mjs --class MAGE --type MINION
 *   node scripts/hsjson-query.mjs --rarity LEGENDARY --set TGT
 *
 * 字段说明：
 *   dbfId    官方数据库数字 id（跨版本唯一）
 *   id       卡牌字符串 id（如 AT_001）
 *   set      版本英文代码（TGT=冠军的试炼，NAX=纳克萨玛斯…）
 *   cardClass 职业（MAGE/ROGUE…）
 *   type     类型（MINION/SPELL/WEAPON/HERO…）
 *   rarity   稀有度（COMMON/RARE/EPIC/LEGENDARY）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const FILE = path.join(
  REPO_ROOT,
  'src/features/hearthstone/data/hearthstonejson-zhCN-cards.json'
)

function parseArgs(argv) {
  const f = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) f[a.slice(2)] = argv[++i]
  }
  return f
}

const q = parseArgs(process.argv)
const cards = JSON.parse(fs.readFileSync(FILE, 'utf8'))

let res = cards
if (q.dbf) res = res.filter((c) => String(c.dbfId) === String(q.dbf))
if (q.id) res = res.filter((c) => c.id === q.id)
if (q.name) res = res.filter((c) => (c.name || '').includes(q.name))
if (q.set) res = res.filter((c) => c.set === q.set)
if (q.class) res = res.filter((c) => c.cardClass === q.class)
if (q.type) res = res.filter((c) => c.type === q.type)
if (q.rarity) res = res.filter((c) => c.rarity === q.rarity)

console.log(`匹配 ${res.length} 张`)
for (const c of res.slice(0, 20)) {
  console.log(
    `  [${c.dbfId}] ${c.name} | ${c.set}/${c.cardClass}/${c.type}/${c.rarity}` +
      ` | cost=${c.cost ?? '-'} atk=${c.attack ?? '-'} hp=${c.health ?? '-'}`
  )
}
