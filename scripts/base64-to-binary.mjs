#!/usr/bin/env node
// 一条龙教学脚本: 卡组码 base64 → 二进制字节 → deckstring 协议解析 → 中文卡名
//
// 用法:
//   node scripts/base64-to-binary.mjs
//   node scripts/base64-to-binary.mjs "AAECAfDABwaGqAeHqAeIqAf2yQeI2QeN2gcMkZ8E958E2aIG94EHwZcH2a8HmrMHtMEH1cUHodgHv/cH5fcHAAA="
//
// 全流程:
//   ① base64 字符 → 6-bit 值  (含字母表索引来源, 解释 A→000000 / f→31→011111)
//   ② 4 个 6-bit(24比特) → 切成 3 个 8-bit 字节
//   ③ 汇总字节数组
//   ④ 把字节「当文本」显示 → 乱码 (说明本质: 这是二进制不是文字)
//   ⑤ 字节 → 按 Blizzard deckstring 协议逐段解析 (varint 逐步拆解)
//   ⑥ dbfId → 中文卡名 (加载 dbfid-cardnames.json, 无数据则降级显示 #dbfId)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const DEFAULT_CODE =
  'AAECAfDABwaGqAeHqAeIqAf2yQeI2QeN2gcMkZ8E958E2aIG94EHwZcH2a8HmrMHtMEH1cUHodgHv/cH5fcHAAA='

const code = process.argv[2] || DEFAULT_CODE
const pad = (n, len) => n.toString(2).padStart(len, '0')
const hx = (b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')
const clean = code.replace(/[^A-Za-z0-9+/=]/g, '')

console.log('卡组码:', code)
console.log('长度:', code.length, '个字符 (含填充 = )\n')

// ====== Step 1: 每个 base64 字符 → 6-bit 值 ======
console.log('====== Step 1: 每个 base64 字符 → 6-bit 值 (0-63) ======')
console.log('base64 用 64 个字符承载 0-63, 字母表顺序固定:')
console.log('  A-Z : 索引 0-25   (A=0)')
console.log('  a-z : 索引 26-51  (a=26, 所以 f = 26+5 = 31)')
console.log('  0-9 : 索引 52-61')
console.log('  +   : 索引 62')
console.log('  /   : 索引 63')
console.log('\n  💡 回答你的疑问:')
console.log("    'A' 是字母表第 0 位 → 索引 0 → 6-bit 二进制 = 000000")
console.log(
  "    'f' 是小写第 6 位 (a=26,b=27,c=28,d=29,e=30,f=31) → 索引 31 → 6-bit 二进制 = 011111 (32+16+8+4+2+1 里的低5位全1 = 11111, 补前导0成6位 = 011111)\n"
)

console.log('前 8 个字符的 6-bit 映射:')
const head = clean.slice(0, 8)
for (let i = 0; i < head.length; i++) {
  const ch = head[i]
  if (ch === '=') {
    console.log(`  字符[${i}] '=' 填充位`)
    continue
  }
  const v = B64.indexOf(ch)
  console.log(`  字符[${i}] '${ch}' → 索引 ${v} → 6 比特 = ${pad(v, 6)}`)
}
console.log('  ...(后续字符同理, 每个都是 0-63 的 6 比特)\n')

// ====== Step 2: 4 个 6-bit 拼成 24-bit → 3 字节 ======
console.log('====== Step 2: 4 个 6-bit(24 比特) → 切成 3 个 8-bit 字节 ======')
console.log('base64 核心: 4 字符 × 6 比特 = 24 比特 = 3 字节 × 8 比特\n')

const bytes = []
for (let i = 0; i < clean.length; i += 4) {
  const c0 = B64.indexOf(clean[i])
  const c1 = B64.indexOf(clean[i + 1])
  const c2 = clean[i + 2] === '=' ? -1 : B64.indexOf(clean[i + 2])
  const c3 = clean[i + 3] === '=' ? -1 : B64.indexOf(clean[i + 3])

  const triple =
    (c0 << 18) | (c1 << 12) | ((c2 < 0 ? 0 : c2) << 6) | (c3 < 0 ? 0 : c3)

  const octets = []
  octets.push((triple >> 16) & 0xff)
  if (c2 >= 0) octets.push((triple >> 8) & 0xff)
  if (c3 >= 0) octets.push(triple & 0xff)

  const b6 = [c0, c1, Math.max(c2, 0), Math.max(c3, 0)].map((v) => pad(v, 6))
  console.log(`  第 ${i / 4 + 1} 组: '${clean.slice(i, i + 4)}'`)
  console.log(`    6-bit 串: ${b6[0]} ${b6[1]} ${b6[2]} ${b6[3]}`)
  console.log(`    拼成 24 比特: ${pad(triple, 24)}`)
  console.log(`    切成字节:   ${octets.map((b) => pad(b, 8)).join('  ')}`)
  console.log(
    `    字节值:     ${octets.map((b) => `十进制 ${String(b).padStart(3)} | ${hx(b)}`).join('   ')}\n`
  )
  bytes.push(...octets)
}

// ====== Step 3: 汇总字节数组 ======
console.log('====== Step 3: 最终字节数组 ======')
console.log('总字节数:', bytes.length, '\n')
console.log('十六进制:')
for (let i = 0; i < bytes.length; i += 16) {
  console.log('  ' + bytes.slice(i, i + 16).map(hx).join(' '))
}

// ====== Step 4: 为什么当文本是乱码 ======
console.log('\n====== Step 4: 把字节「当文本」解释 → 乱码 (正常现象) ======')
const asText = bytes
  .map((b) => (b === 0 ? '␀' : b < 32 ? '·' : String.fromCharCode(b)))
  .join('')
console.log('当文本(Latin-1)看上去:', asText)
console.log('  0x00=空, 0x07=响铃, 0xF0=ð, 0xC0=À —— 「乱码」恰恰说明它是二进制, 不是文字。')
console.log('  正确做法: 拿这串字节按 deckstring 协议解析 (Step 5), 而不是用「base64 to text」去读。\n')

// ====== Step 5: 按 deckstring 协议逐段解析 (varint 详解) ======
console.log('====== Step 5: 字节 → deckstring 协议解析 (varint 逐步拆解) ======')
console.log('deckstring 规范布局:')
console.log('  [保留字节=0][版本=1][format][英雄数][英雄dbfId...][1张数量][1张dbfId...][2张数量][2张dbfId...][N张数量][(N张count,dbfId)...]')
console.log('  varint 规则: 每个字节「最高位」= 还有后续吗(1=继续,0=结束), 低 7 位是数据, 按小端(低位在前)累加。\n')

function readVarintVerbose(startIdx, label) {
  let result = 0
  let shift = 0
  let i = startIdx
  const trace = []
  while (true) {
    const idx = i
    const byte = bytes[idx]
    i++
    const data7 = byte & 0x7f
    const cont = (byte & 0x80) !== 0
    const contribution = data7 << shift
    result += contribution
    trace.push({ idx, byte, data7, cont, contribution, pow: shift / 7 })
    if (!cont) break
    shift += 7
    if (i > bytes.length) break
  }
  console.log(`  ${label} (从字节[${startIdx}] 起):`)
  for (const t of trace) {
    console.log(
      `    字节[${t.idx}] ${hx(t.byte)} 二进制 ${pad(t.byte, 8)} → 低7位 ${pad(t.data7, 7)} × 128^${t.pow} = 贡献 ${t.contribution}  | ${t.cont ? '最高位=1 继续' : '最高位=0 到此结束'}`
    )
  }
  console.log(`    → 合计 = ${result} (0x${result.toString(16).toUpperCase()})`)
  return { value: result, next: i }
}

// 跳过保留字节(bytes[0]=0)与版本(bytes[1]=1), 从索引 2 开始
let i = 2
const fmtR = readVarintVerbose(i, 'format (模式)')
i = fmtR.next
const fmtName = fmtR.value === 1 ? '狂野' : fmtR.value === 2 ? '标准' : String(fmtR.value)
console.log(`    = 模式 ${fmtName}\n`)

const nhR = readVarintVerbose(i, '英雄数量')
i = nhR.next
console.log(`    = ${nhR.value} 个英雄\n`)

const heroes = []
for (let h = 0; h < nhR.value; h++) {
  const r = readVarintVerbose(i, `英雄#${h + 1} dbfId`)
  i = r.next
  heroes.push(r.value)
  console.log()
}

const nxR = readVarintVerbose(i, '【各 1 张】卡数量')
i = nxR.next
const singles = []
for (let k = 0; k < nxR.value; k++) {
  const r = readVarintVerbose(i, `单张卡#${k + 1} dbfId`)
  i = r.next
  singles.push(r.value)
}
console.log()

const n2R = readVarintVerbose(i, '【各 2 张】卡数量')
i = n2R.next
const doubles = []
for (let k = 0; k < n2R.value; k++) {
  const r = readVarintVerbose(i, `双张卡#${k + 1} dbfId`)
  i = r.next
  doubles.push(r.value)
}
console.log()

const nnR = readVarintVerbose(i, '【各 N 张】卡数量 (count 与 dbfId 成对)')
i = nnR.next
const multis = []
for (let k = 0; k < nnR.value; k++) {
  const d = readVarintVerbose(i, `多张卡#${k + 1} count`)
  i = d.next
  const c = readVarintVerbose(i, `多张卡#${k + 1} dbfId`)
  i = c.next
  multis.push({ dbfId: d.value, count: c.value })
  console.log()
}

// ====== Step 6: dbfId → 中文卡名 ======
console.log('====== Step 6: dbfId → 中文卡名 ======')
let cardNames = null
let heroClasses = null
try {
  const p = fileURLToPath(
    new URL('../src/hearthstone-achievements/data/dbfid-cardnames.json', import.meta.url)
  )
  const data = JSON.parse(readFileSync(p, 'utf8'))
  cardNames = data.cards || {}
  heroClasses = data.heroClasses || {}
  console.log('已加载 dbfid-cardnames.json (本地快照, 不联网)\n')
} catch (e) {
  console.log('⚠️ 未找到 dbfid-cardnames.json, 名字将显示为 #dbfId (不影响协议解析)\n')
}
const nameOf = (id) => (cardNames && cardNames[id] && cardNames[id].name) || `#${id}`
const heroNameOf = (id) => (heroClasses && heroClasses[id]) || `#${id}`

console.log('英雄职业:', heroes.map((h) => `${heroNameOf(h)} (dbfId ${h})`).join(', '))
console.log('模式:', fmtName, '\n')

console.log('卡牌清单:')
const lines = []
for (const dbfId of singles) lines.push({ dbfId, count: 1 })
for (const dbfId of doubles) lines.push({ dbfId, count: 2 })
for (const m of multis) lines.push({ dbfId: m.dbfId, count: m.count })
for (const c of lines) {
  console.log(`  ${nameOf(c.dbfId).padEnd(10, '　')} ×${c.count}   (dbfId ${c.dbfId})`)
}
const total = lines.reduce((a, c) => a + c.count, 0)
console.log(`\n✅ 最终: ${heroes.map(heroNameOf).join('/')} · ${fmtName} · 共 ${total} 张卡 (${lines.length} 种)`)
