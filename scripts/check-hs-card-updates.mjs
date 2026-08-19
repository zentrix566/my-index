#!/usr/bin/env node
/**
 * 检查暴雪国服 API 的卡牌数据是否相比本地 cards-db.json 有更新。
 *
 * 只对比可变数值字段（费用/攻击/生命/描述），不对比图片 URL 等无关字段。
 * 不下载图片、不写文件，纯只读对比，适合补丁日后快速确认上游是否已更新。
 *
 * 用法：
 *   node scripts/check-hs-card-updates.mjs
 *
 * 可选环境变量：
 *   HS_API_BASE   覆盖 API 基地址（默认暴雪国服）
 *   HS_PAGE_SIZE  每页条数（默认 200）
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BLIZZARD_API_BASE as API_BASE, SETS_URL, CARDS_URL } from './blizzard-endpoints.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const PAGE_SIZE = Number(process.env.HS_PAGE_SIZE) || 200
const DB_PATH = resolve(repoRoot, 'public/hearthstone/cards-db.json')

const UA = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Content-Type': 'application/json' }

const FIELDS = [
  { api: 'mana_cost', db: 'manaCost', label: '费用' },
  { api: 'attack', db: 'attack', label: '攻击' },
  { api: 'health', db: 'health', label: '生命' },
  { api: 'text', db: 'text', label: '描述' }
]

async function apiGet(url) {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`)
  return r.json()
}
async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: UA, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`POST ${url} -> ${r.status}`)
  return r.json()
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const cur = idx++
      results[cur] = await fn(items[cur], cur)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

async function getSets() {
  const res = await apiGet(SETS_URL)
  const seen = new Set()
  const sets = []
  for (const cat of res?.data?.list ?? []) {
    for (const sub of cat.subcategories || []) {
      if (seen.has(sub.id)) continue
      seen.add(sub.id)
      sets.push({ id: sub.id, name: sub.name, value: sub.name_en })
    }
  }
  return sets
}

async function fetchCardsForSet(set) {
  const baseBody = {
    page: 1, page_size: PAGE_SIZE, class: 'all', mana_cost: [], sort: 'manaCost:asc',
    set: set.value, text_filter: '', attack: -1, faction: '', health: -1,
    keyword: '', minion_type: '', rarity: '', spell_school: '', type: ''
  }
  const first = await apiPost(CARDS_URL, baseBody)
  const d0 = first?.data ?? first
  const total = d0?.total ?? 0
  const all = [...(d0?.list ?? [])]
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages > 1) {
    const tasks = Array.from({ length: pages - 1 }, (_, i) => i + 2)
    const pageResults = await mapPool(tasks, 4, async (p) => {
      const r = await apiPost(CARDS_URL, { ...baseBody, page: p })
      const d = r?.data ?? r
      return d?.list ?? []
    })
    for (const lst of pageResults) all.push(...lst)
  }
  return all
}

async function fetchAllRemote() {
  const sets = await getSets()
  console.log(`共 ${sets.length} 个版本，开始拉取...`)
  const all = []
  for (let i = 0; i < sets.length; i++) {
    const cards = await fetchCardsForSet(sets[i])
    all.push(...cards)
    process.stdout.write(`\r  [${i + 1}/${sets.length}] ${sets[i].name}：${cards.length} 张（累计 ${all.length}）`)
  }
  process.stdout.write('\n')
  return all
}

function norm(v) {
  if (v == null) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

async function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`未找到本地卡牌库：${DB_PATH}`)
    process.exit(1)
  }
  console.log(`对比本地：${DB_PATH}`)
  const local = JSON.parse(readFileSync(DB_PATH, 'utf8'))

  const remote = await fetchAllRemote()
  console.log(`远程 ${remote.length} 张，本地 ${Object.keys(local).length} 张\n`)

  const remoteById = new Map()
  for (const c of remote) remoteById.set(c.id, c)

  const added = []
  const changed = []
  let sameCount = 0

  for (const c of remote) {
    const dbCard = local[c.id]
    if (!dbCard) {
      added.push(c)
      continue
    }
    const diffs = []
    for (const f of FIELDS) {
      const rv = norm(c[f.api])
      const lv = norm(dbCard[f.db])
      if (rv !== lv) diffs.push({ field: f.label, from: lv, to: rv })
    }
    if (diffs.length) changed.push({ card: c, diffs })
    else sameCount++
  }

  const removed = []
  for (const id of Object.keys(local)) {
    if (!remoteById.has(Number(id))) removed.push(local[id])
  }

  console.log('═══════════════════════════════════════')
  if (!changed.length && !added.length && !removed.length) {
    console.log('✓ 卡牌数值与上游完全一致，无需更新。')
  } else {
    if (changed.length) {
      console.log(`\n● 数值/描述有变化的卡牌（${changed.length} 张）：`)
      for (const { card, diffs } of changed) {
        console.log(`\n  ${card.name} (id=${card.id})`)
        for (const d of diffs) {
          const fromShort = d.from.length > 80 ? d.from.slice(0, 80) + '…' : d.from
          const toShort = d.to.length > 80 ? d.to.slice(0, 80) + '…' : d.to
          console.log(`    ${d.field}:「${fromShort || '空'}」→「${toShort}」`)
        }
      }
    }
    if (added.length) {
      console.log(`\n● 新增卡牌（${added.length} 张）：`)
      for (const c of added) console.log(`  + ${c.name} (id=${c.id}, ${c.mana_cost}费 ${c.card_type_id === 4 ? c.attack + '/' + c.health : ''})`)
    }
    if (removed.length) {
      console.log(`\n● 本地有但远程已移除（${removed.length} 张）：`)
      for (const c of removed.slice(0, 20)) console.log(`  - ${c.name} (id=${c.id})`)
      if (removed.length > 20) console.log(`  ...共 ${removed.length} 张`)
    }
    console.log(`\n如需更新：node scripts/fetch-hs-cards.mjs`)
    console.log(`上传 OSS：npm run upload:oss:data`)
  }
  console.log(`\n统计：一致 ${sameCount}，变化 ${changed.length}，新增 ${added.length}，移除 ${removed.length}`)
}

main().catch((e) => { console.error('检查失败:', e.message); process.exit(1) })
