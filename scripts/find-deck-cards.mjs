// 收集所有推荐卡组所需的卡牌名称，并匹配本地已下载的图片
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeDeck } from '../src/hearthstone-achievements/utils/deckstring.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ACH_DIR = join(__dirname, '../src/hearthstone-achievements/data/achievements')
const IMG_DIR = join(__dirname, '../..', 'my-heartstone/hearthstone_cards/wild')

async function listJsonFiles(dir) {
  const files = await readdir(dir, { withFileTypes: true })
  return files.filter(f => f.isFile() && f.name.endsWith('.json')).map(f => join(dir, f.name))
}

async function main() {
  const files = await listJsonFiles(ACH_DIR)
  const allDecks = []
  for (const f of files) {
    const data = JSON.parse(await readFile(f, 'utf8'))
    const expansion = data.name || data.id
    for (const ach of data.achievements || []) {
      for (const deck of ach.recommendedDecks || []) {
        allDecks.push({ expansion, achievement: ach.name, code: deck.code, deckName: deck.name })
      }
    }
  }

  const nameSet = new Set()
  const missingDecks = []
  for (const deck of allDecks) {
    const decoded = decodeDeck(deck.code)
    if (!decoded.valid) {
      missingDecks.push({ ...deck, reason: 'decode failed' })
      continue
    }
    for (const c of decoded.cards) {
      nameSet.add(c.name)
    }
  }

  const names = Array.from(nameSet).sort()
  console.log(`共 ${allDecks.length} 个推荐卡组，解码失败 ${missingDecks.length} 个，涉及 ${names.length} 种不同卡牌`)

  // 匹配本地图片
  const cropFiles = await readdir(join(IMG_DIR, 'crop')).catch(() => [])
  const fullFiles = await readdir(join(IMG_DIR, 'full')).catch(() => [])
  const available = new Set([...cropFiles, ...fullFiles])

  const matched = []
  const unmatched = []
  for (const name of names) {
    const hasCrop = cropFiles.some(f => f.startsWith(name + '_'))
    const hasFull = fullFiles.some(f => f.startsWith(name + '_'))
    if (hasCrop && hasFull) matched.push(name)
    else unmatched.push({ name, hasCrop, hasFull })
  }

  console.log(`\n本地有图：${matched.length} / ${names.length}`)
  console.log(`\n缺失图片（${unmatched.length} 张）：`)
  for (const u of unmatched) {
    console.log(`  - ${u.name} (crop:${u.hasCrop}, full:${u.hasFull})`)
  }

  if (missingDecks.length) {
    console.log(`\n解码失败的卡组：`)
    for (const d of missingDecks) console.log(`  - [${d.expansion}] ${d.achievement} / ${d.deckName}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
