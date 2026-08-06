#!/usr/bin/env node
/** 查询卡组解析使用的 dbfId 索引。 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(
  repoRoot,
  'src/features/hearthstone/data/dbfid-cardnames.json'
)

function parseArgs(argv) {
  const filters = {}
  for (let i = 2; i < argv.length; i++) {
    const argument = argv[i]
    if (!argument.startsWith('--')) throw new Error(`未知参数：${argument}`)
    filters[argument.slice(2)] = argv[++i]
  }
  return filters
}

const query = parseArgs(process.argv)
const { cards } = JSON.parse(fs.readFileSync(file, 'utf8'))
let results = Object.entries(cards).map(([dbfId, card]) => ({ dbfId, ...card }))

if (query.dbf) results = results.filter((card) => card.dbfId === String(query.dbf))
if (query.name) results = results.filter((card) => card.name.includes(query.name))
if (query.rarity) results = results.filter((card) => card.rarity === query.rarity)

console.log(`匹配 ${results.length} 张`)
for (const card of results.slice(0, 20)) {
  console.log(
    `  [${card.dbfId}] ${card.name} | ${card.rarity} | cost=${card.cost}`
  )
}
