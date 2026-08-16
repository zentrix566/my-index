// scripts/dump-owned-cosmetics.mjs
// 读取采集器写入的 cosmetics.json（已拥有卡背/硬币/皮肤）+ achievements.json（成就明细），
// 结合本地外观目录(src/features/hearthstone/data/) 生成「已拥有 ID + 中文名」全量 markdown，
// 供用户核对 ID 是否对得上游戏。
//
// 运行： node scripts/dump-owned-cosmetics.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OWNED_DIR = path.join(ROOT, 'tools/hs-cosmetics-viewer/data')
const CATALOG_DIR = path.join(ROOT, 'src/features/hearthstone/data')
const PUBLIC_CATALOG_DIR = path.join(ROOT, 'public/hearthstone')
const OUT = path.join(ROOT, 'tools/hs-cosmetics-viewer/owned-with-names.md')

function readJson (p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

const cosmetics = readJson(path.join(OWNED_DIR, 'cosmetics.json'))
const ownedCb = cosmetics.cardBacks
const ownedCo = cosmetics.coins
const ownedHs = cosmetics.heroSkins
const ach = (() => { try { return readJson(path.join(OWNED_DIR, 'achievements.json')) } catch { return null } })()

// 注意：card-backs.json(374条) 不完整，漏掉了 0/131/153/159/160/161 等；
// 改用更完整的 card-back-map.json(380条)，6 个 ID 全部有名称。
const catCb = readJson(path.join(CATALOG_DIR, 'card-back-map.json'))
const catCo = readJson(path.join(PUBLIC_CATALOG_DIR, 'coins.json'))
const catHs = readJson(path.join(PUBLIC_CATALOG_DIR, 'hero-skins.json'))

const cbMap = new Map()
for (const c of catCb) cbMap.set(String(c.cardBackId), c)

const coMap = new Map()
for (const c of catCo) coMap.set(String(c.dbfId), c)

const hsMap = new Map()
for (const c of catHs) hsMap.set(String(c.cardId), c)

// 与项目约定的职业显示顺序一致（HEARTHSTONE_CLASS_ORDER）
const CLASS_ORDER = ['圣骑士', '德鲁伊', '恶魔猎手', '战士', '术士', '死亡骑士', '法师', '潜行者', '牧师', '猎人', '萨满祭司']

let out = ''
out += `# 炉石外观 已拥有 ID + 名称 对照表\n\n`
out += `生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}\n\n`
out += `> 由 \`scripts/dump-owned-cosmetics.mjs\` 生成。\n> 数据源：采集器写入的 \`tools/hs-cosmetics-viewer/data/cosmetics.json\`（游戏内存 MindVision，含卡背/硬币/皮肤已拥有 ID）+ 本地外观目录 \`src/features/hearthstone/data/{card-back-map,coins,hero-skins}.json\`。\n> 「未匹配」= 采集器读到了这个 ID，但本地目录暂无该条目（可能是最新内容，目录尚未补齐）。\n\n`

function dumpNumeric (title, count, ids, map, idLabel) {
  const sorted = [...ids].map(Number).filter(n => Number.isFinite(n)).sort((a, b) => a - b)
  let matched = 0
  const rows = []
  const unmatched = []
  for (const id of sorted) {
    const c = map.get(String(id))
    if (c) {
      matched++
      rows.push([id, c.officialName || c.name || c.cardId || '(无名)', c.howToGet || ''])
    } else {
      unmatched.push(id)
    }
  }
  out += `## ${title}（已拥有 ${count}）\n\n`
  out += `| ${idLabel} | 名称 | 获取方式 |\n|---:|---|---|\n`
  for (const [id, name, how] of rows) out += `| ${id} | ${name} | ${how} |\n`
  out += `\n匹配 ${matched} / ${sorted.length}`
  if (unmatched.length) out += `；本地目录暂无的 ID：${unmatched.join(', ')}`
  out += `\n\n`
}

dumpNumeric('卡背', ownedCb.count, ownedCb.ids, cbMap, 'cardBackId')
dumpNumeric('幸运币', ownedCo.count, ownedCo.ids, coMap, 'dbfId')

// 英雄皮肤：按职业分组，职业内按 cardId 排序
out += `## 英雄皮肤（已拥有 ${ownedHs.count}）\n\n`
const byClass = new Map()
const unmatchedHs = []
for (const cid of ownedHs.ids) {
  const c = hsMap.get(String(cid))
  if (c) {
    const cls = c.heroClass || '未知'
    if (!byClass.has(cls)) byClass.set(cls, [])
    byClass.get(cls).push(c)
  } else unmatchedHs.push(cid)
}
const orderedClasses = [...byClass.keys()].sort((a, b) => {
  const ia = CLASS_ORDER.indexOf(a)
  const ib = CLASS_ORDER.indexOf(b)
  return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
})
let totalHs = 0
for (const cls of orderedClasses) {
  const list = byClass.get(cls).sort((a, b) => String(a.cardId).localeCompare(String(b.cardId)))
  out += `### ${cls}（${list.length}）\n\n`
  out += `| cardId | 名称 | 获取方式 |\n|---|---|---|\n`
  for (const c of list) out += `| ${c.cardId} | ${c.officialName || c.cardId} | ${c.howToGet || ''} |\n`
  out += `\n`
  totalHs += list.length
}
out += `合计匹配 ${totalHs} / ${ownedHs.ids.length}`
if (unmatchedHs.length) out += `；本地目录暂无的 cardId：${unmatchedHs.join(', ')}`
out += `\n`

// 成就明细（来自 achievements.json 的 items 逐条数据）
if (ach) {
  out += `\n## 成就\n\n`
  out += `- 官方总完成：**${ach.totalCompleted ?? '—'}**\n`
  out += `- 内存逐条：完成 ${ach.itemsCompleted ?? '—'} / 共 ${ach.itemsTotal ?? '—'}\n\n`
  const items = Array.isArray(ach.items) ? ach.items : []
  if (items.length) {
    const cnt = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const it of items) cnt[it.status] = (cnt[it.status] || 0) + 1
    out += `状态分布：未开始 ${cnt[1] || 0} / 进行中 ${cnt[2] || 0} / 已完成未领奖(status=3) ${cnt[3] || 0} / 已领奖(status=4) ${cnt[4] || 0}\n\n`
    const open = items.filter(x => x.status === 1 || x.status === 2)
    if (open.length) {
      out += `### 未完成的成就（${open.length} 条）\n\n`
      out += `| 成就 ID | 状态 | 进度 |\n|---:|---|---:|\n`
      for (const it of open) out += `| ${it.id} | ${it.statusText || it.status} | ${it.progress ?? ''} |\n`
      out += `\n`
    } else {
      out += `全部成就均已完成 ✅\n\n`
    }
  }
}

fs.writeFileSync(OUT, out, 'utf8')
console.log(`写入: ${OUT}`)
console.log(`  卡背 ${ownedCb.count} / 硬币 ${ownedCo.count} / 皮肤 ${ownedHs.count}`)
if (ach) console.log(`  成就 官方${ach.totalCompleted} 内存逐条${ach.itemsCompleted}/${ach.itemsTotal}`)
