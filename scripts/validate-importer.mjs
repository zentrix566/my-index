// 用导入器实际内嵌的 CATALOG 复算匹配逻辑，验证渲染结果正确
import fs from 'node:fs'
const html = fs.readFileSync('tools/hs-cosmetics-viewer/dist-importer/index.html', 'utf8')
const m = html.match(/const CATALOG = (\{[\s\S]*?\});\n/)
if (!m) { console.error('未找到 CATALOG'); process.exit(1) }
const CATALOG = JSON.parse(m[1])

const dataDir = 'tools/hs-cosmetics-viewer/data'
const cb = JSON.parse(fs.readFileSync(`${dataDir}/cardbacks.json`, 'utf8'))
const co = JSON.parse(fs.readFileSync(`${dataDir}/coins.json`, 'utf8'))
const hs = JSON.parse(fs.readFileSync(`${dataDir}/heroes.json`, 'utf8'))

function check(title, catKey, ownedIds, idOf, norm = Number) {
  const ids = new Set(ownedIds.map(norm))
  const matched = new Set(CATALOG[catKey].filter(c => ids.has(norm(idOf(c)))).map(c => norm(idOf(c))))
  const missing = [...ids].filter(i => !matched.has(i))
  console.log(`${title}: 已拥有 ${ids.size} / 目录 ${CATALOG[catKey].length} / 匹配 ${matched.size} / 目录暂无 ${missing.length} ${missing.length ? '(' + missing.join(',') + ')' : ''}`)
  return { ids: ids.size, matched: matched.size, missing: missing.map(String) }
}

const r1 = check('卡背', 'cardBacks', cb.ids, c => c.cardBackId)
const r2 = check('幸运币', 'coins', co.ids, c => c.dbfId)
const r3 = check('英雄皮肤', 'heroSkins', hs.ids, c => c.cardId, String)

// 断言
let ok = true
if (r1.ids !== 280 || r1.matched !== 280) { console.error('卡背断言失败'); ok = false }
if (r2.ids !== 49 || r2.matched !== 48 || r2.missing.join(',') !== '1746') { console.error('硬币断言失败'); ok = false }
if (r3.ids !== 380 || r3.matched !== 380) { console.error('皮肤断言失败', r3); ok = false }
console.log(ok ? '\n✅ 导入器匹配逻辑与预期一致' : '\n❌ 存在不一致')
process.exit(ok ? 0 : 1)
