#!/usr/bin/env node
/**
 * 炉石卡组码手动解密教学脚本 —— 逐步打印每一层解码过程
 *
 * 用法（仓库根目录执行）：
 *   node scripts/decode-deck.mjs "AAECAaIHBs..."        # 解码指定卡组码
 *   node scripts/decode-deck.mjs                        # 不传参数则用内置示例
 *   node scripts/decode-deck.mjs "CODE" --trace         # 额外打印每个 varint 的逐字节拆解（起始下标/位置/贡献值）
 *
 * 卡组码本质：base64( 字节流 )，字节流按 Blizzard deckstring 规范排列：
 *   [0x00 保留字节] [0x01 版本号] [format varint] [英雄数 varint] [英雄dbfId...]
 *   [单卡数 varint] [dbfId...]            —— 各带 1 张的卡
 *   [双卡数 varint] [dbfId...]            —— 各带 2 张的卡
 *   [N卡数 varint] [(dbfId, 数量) 对...]  —— 带 3 张及以上的卡（狂野某些卡组）
 * varint = 每字节低 7 位有效、最高位为 1 表示后面还有字节（小端）。
 * dbfId 是暴雪数据库里的卡牌编号，用 HearthstoneJSON 的 zhCN 卡牌库即可查到中文名。
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const namesPath = resolve(__dirname, '../src/hearthstone-achievements/data/dbfid-cardnames.json')
const { cards: cardNames, heroClasses } = JSON.parse(readFileSync(namesPath, 'utf8'))

// 内置示例：badlands.json「劫掠骑」推荐卡组码（无参数时使用）
const DEFAULT_CODE = 'AAECAdK+BQS9jwbkmAbPngbSuQYNyaAEuMUFre0Fuf4FkIMGhY4GzpwGy58Gw78G6ckG7ckGpeEG7eYGAAA='
const code = process.argv[2] || DEFAULT_CODE
const traceEnabled = process.argv.includes('--trace')
const reads = []
// 记录每个 varint 的逐字节轨迹，供 --trace 调试视图使用
function track(label, r) {
  if (traceEnabled) reads.push({ label, start: r.start, value: r.value, trace: r.trace })
  return r
}

console.log('====== 第 1 步：base64 → 字节数组 ======')
console.log('卡组码:', code)
// 卡组码可能出现 URL-safe base64 变体（- _），先归一化
const normalized = code.replace(/-/g, '+').replace(/_/g, '/')
const bytes = Buffer.from(normalized, 'base64')
console.log(`共 ${bytes.length} 字节，十六进制：`)
console.log(bytes.toString('hex').replace(/(..)/g, '$1 ').trim())

// varint 读取：低 7 位拼数值，最高位=1 表示未结束
// 同时返回 start（起始字节下标）与 trace（逐字节：位置/原始值/低7位/贡献值/是否闭合），供 --trace 使用。
function readVarint(buf, i) {
  let value = 0
  let shift = 0
  let byte
  const start = i
  const trace = []
  let pos = 0
  do {
    pos++
    byte = buf[i++]
    const low7 = byte & 0x7f
    const contrib = low7 * 128 ** (pos - 1)
    value += contrib
    shift += 7
    trace.push({ pos, idx: i - 1, raw: byte, low7, contrib, isLast: !(byte & 0x80) })
  } while (byte & 0x80)
  return { value, next: i, rawHex: buf.subarray(start, i).toString('hex'), start, trace }
}

console.log('\n====== 第 2 步：跳过头部，按 varint 逐段读取 ======')
console.log(`字节[0] = 0x${bytes[0].toString(16).padStart(2, '0')}（保留字节，恒为 0）`)
console.log(`字节[1] = 0x${bytes[1].toString(16).padStart(2, '0')}（版本号，恒为 1）`)

// --trace 调试视图：把头部两个 1 字节 varint 也记下来
if (traceEnabled) {
  reads.push({ label: '保留字节', value: bytes[0], trace: [{ pos: 1, idx: 0, raw: bytes[0], low7: bytes[0] & 0x7f, contrib: bytes[0] & 0x7f, isLast: true }] })
  reads.push({ label: '版本号', value: bytes[1], trace: [{ pos: 1, idx: 1, raw: bytes[1], low7: bytes[1] & 0x7f, contrib: bytes[1] & 0x7f, isLast: true }] })
}

let i = 2
let r = track('format', readVarint(bytes, i)); i = r.next
const FORMATS = { 1: '狂野', 2: '标准', 3: '经典', 4: '幻变' }
console.log(`format   = ${r.value}（${FORMATS[r.value] || '未知'}模式），原始字节 ${r.rawHex}`)

r = track('英雄数量', readVarint(bytes, i)); i = r.next
const heroCount = r.value
console.log(`英雄数量 = ${heroCount}`)

console.log('\n====== 第 3 步：英雄 dbfId → 职业 ======')
for (let h = 0; h < heroCount; h++) {
  r = track(`英雄#${h + 1} dbfId`, readVarint(bytes, i)); i = r.next
  const cls = heroClasses[r.value] || '（本地库未收录，可去 HearthstoneJSON 查）'
  console.log(`  英雄 dbfId = ${r.value} → 职业：${cls}（原始字节 ${r.rawHex}）`)
}

console.log('\n====== 第 4 步：三段卡牌列表（1张 / 2张 / N张） ======')
const lookup = (dbfId) => (cardNames[dbfId] ? cardNames[dbfId].name : `#${dbfId}（本地库未收录）`)

r = track('单张卡种类数', readVarint(bytes, i)); i = r.next
console.log(`【带 1 张的卡】共 ${r.value} 种：`)
for (let k = 0; k < r.value; k++) {
  const c = track(`单张卡#${k + 1} dbfId`, readVarint(bytes, i)); i = c.next
  console.log(`  dbfId ${String(c.value).padStart(6)} ×1 → ${lookup(c.value)}（字节 ${c.rawHex}）`)
}

r = track('双张卡种类数', readVarint(bytes, i)); i = r.next
console.log(`【带 2 张的卡】共 ${r.value} 种：`)
for (let k = 0; k < r.value; k++) {
  const c = track(`双张卡#${k + 1} dbfId`, readVarint(bytes, i)); i = c.next
  console.log(`  dbfId ${String(c.value).padStart(6)} ×2 → ${lookup(c.value)}（字节 ${c.rawHex}）`)
}

r = track('N张卡种类数', readVarint(bytes, i)); i = r.next
console.log(`【带 N 张的卡】共 ${r.value} 种（dbfId 与数量成对出现）：`)
for (let k = 0; k < r.value; k++) {
  const d = track(`N张卡#${k + 1} dbfId`, readVarint(bytes, i)); i = d.next
  const n = track(`N张卡#${k + 1} 数量`, readVarint(bytes, i)); i = n.next
  console.log(`  dbfId ${String(d.value).padStart(6)} ×${n.value} → ${lookup(d.value)}`)
}

if (traceEnabled) {
  console.log('\n====== 调试视图：每个 varint 的逐字节拆解 ======')
  console.log('（起始字节下标 = 该 varint 第一个字节在字节数组里的位置；位置 = 从起点往右数第几个字节；')
  console.log('  贡献值 = 低7位 × 128^(位置-1)；最高位=0 的字节表示此 varint 到此闭合）')
  for (const rec of reads) {
    console.log(`\n● ${rec.label}：起始字节[${rec.start}]，值 = ${rec.value}`)
    for (const t of rec.trace) {
      const bin = t.raw.toString(2).padStart(8, '0')
      const low7bin = t.low7.toString(2).padStart(7, '0')
      const flag = t.isLast ? '← 最高位=0 闭合' : '← 最高位=1 继续'
      console.log(`    字节[${t.idx}] = 0x${t.raw.toString(16).padStart(2, '0')} (${bin})  低7位 ${low7bin}=${t.low7}  ×128^${t.pos - 1} = 贡献 ${t.contrib}  ${flag}`)
    }
  }
}

console.log('\n====== 对应关系从哪来 ======')
console.log('dbfId → 卡名的映射来自 HearthstoneJSON 的中文卡牌库：')
console.log('  https://api.hearthstonejson.com/v1/latest/zhCN/cards.collectible.json')
console.log('本项目已把它精简缓存为 src/hearthstone-achievements/data/dbfid-cardnames.json，')
console.log('前端 utils/deckstring.js 用同样的算法在浏览器里解码（无需联网）。')
