#!/usr/bin/env node
/**
 * 炉石卡组码手动解密教学脚本 —— 逐步打印每一层解码过程
 *
 * 用法（仓库根目录执行）：
 *   node scripts/decode-deck.mjs "AAECAaIHBs..."        # 解码指定卡组码
 *   node scripts/decode-deck.mjs                        # 不传参数则用内置示例
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

console.log('====== 第 1 步：base64 → 字节数组 ======')
console.log('卡组码:', code)
// 卡组码可能出现 URL-safe base64 变体（- _），先归一化
const normalized = code.replace(/-/g, '+').replace(/_/g, '/')
const bytes = Buffer.from(normalized, 'base64')
console.log(`共 ${bytes.length} 字节，十六进制：`)
console.log(bytes.toString('hex').replace(/(..)/g, '$1 ').trim())

// varint 读取：低 7 位拼数值，最高位=1 表示未结束
function readVarint(buf, i) {
  let value = 0
  let shift = 0
  let byte
  const start = i
  do {
    byte = buf[i++]
    value += (byte & 0x7f) << shift
    shift += 7
  } while (byte & 0x80)
  return { value, next: i, rawHex: buf.subarray(start, i).toString('hex') }
}

console.log('\n====== 第 2 步：跳过头部，按 varint 逐段读取 ======')
console.log(`字节[0] = 0x${bytes[0].toString(16).padStart(2, '0')}（保留字节，恒为 0）`)
console.log(`字节[1] = 0x${bytes[1].toString(16).padStart(2, '0')}（版本号，恒为 1）`)

let i = 2
let r = readVarint(bytes, i); i = r.next
const FORMATS = { 1: '狂野', 2: '标准', 3: '经典', 4: '幻变' }
console.log(`format   = ${r.value}（${FORMATS[r.value] || '未知'}模式），原始字节 ${r.rawHex}`)

r = readVarint(bytes, i); i = r.next
const heroCount = r.value
console.log(`英雄数量 = ${heroCount}`)

console.log('\n====== 第 3 步：英雄 dbfId → 职业 ======')
for (let h = 0; h < heroCount; h++) {
  r = readVarint(bytes, i); i = r.next
  const cls = heroClasses[r.value] || '（本地库未收录，可去 HearthstoneJSON 查）'
  console.log(`  英雄 dbfId = ${r.value} → 职业：${cls}（原始字节 ${r.rawHex}）`)
}

console.log('\n====== 第 4 步：三段卡牌列表（1张 / 2张 / N张） ======')
const lookup = (dbfId) => (cardNames[dbfId] ? cardNames[dbfId].name : `#${dbfId}（本地库未收录）`)

r = readVarint(bytes, i); i = r.next
console.log(`【带 1 张的卡】共 ${r.value} 种：`)
for (let k = 0; k < r.value; k++) {
  const c = readVarint(bytes, i); i = c.next
  console.log(`  dbfId ${String(c.value).padStart(6)} ×1 → ${lookup(c.value)}（字节 ${c.rawHex}）`)
}

r = readVarint(bytes, i); i = r.next
console.log(`【带 2 张的卡】共 ${r.value} 种：`)
for (let k = 0; k < r.value; k++) {
  const c = readVarint(bytes, i); i = c.next
  console.log(`  dbfId ${String(c.value).padStart(6)} ×2 → ${lookup(c.value)}（字节 ${c.rawHex}）`)
}

r = readVarint(bytes, i); i = r.next
console.log(`【带 N 张的卡】共 ${r.value} 种（dbfId 与数量成对出现）：`)
for (let k = 0; k < r.value; k++) {
  const d = readVarint(bytes, i); i = d.next
  const n = readVarint(bytes, i); i = n.next
  console.log(`  dbfId ${String(d.value).padStart(6)} ×${n.value} → ${lookup(d.value)}`)
}

console.log('\n====== 对应关系从哪来 ======')
console.log('dbfId → 卡名的映射来自 HearthstoneJSON 的中文卡牌库：')
console.log('  https://api.hearthstonejson.com/v1/latest/zhCN/cards.collectible.json')
console.log('本项目已把它精简缓存为 src/hearthstone-achievements/data/dbfid-cardnames.json，')
console.log('前端 utils/deckstring.js 用同样的算法在浏览器里解码（无需联网）。')
