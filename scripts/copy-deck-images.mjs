// 将推荐卡组所需的本地卡牌图片复制到 public/hearthstone-cards/wild
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeDeck } from '../src/hearthstone-achievements/utils/deckstring.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ACH_DIR = join(__dirname, '../src/hearthstone-achievements/data/achievements')
const SRC_DIR = join(__dirname, '../..', 'my-heartstone/hearthstone_cards/wild')
const DST_DIR = join(__dirname, '../public/hearthstone-cards/wild')

async function listJsonFiles(dir) {
  const files = await readdir(dir, { withFileTypes: true })
  return files.filter(f => f.isFile() && f.name.endsWith('.json')).map(f => join(dir, f.name))
}

async function findImageFile(dir, name) {
  const files = await readdir(dir).catch(() => [])
  return files.find(f => f.startsWith(name + '_'))
}

async function main() {
  const files = await listJsonFiles(ACH_DIR)
  const nameSet = new Set()
  for (const f of files) {
    const data = JSON.parse(await readFile(f, 'utf8'))
    for (const ach of data.achievements || []) {
      for (const deck of ach.recommendedDecks || []) {
        const decoded = decodeDeck(deck.code)
        if (decoded.valid) {
          for (const c of decoded.cards) nameSet.add(c.name)
        }
      }
    }
  }

  const names = Array.from(nameSet).sort()
  console.log(`推荐卡组共涉及 ${names.length} 种卡牌`)

  await mkdir(join(DST_DIR, 'crop'), { recursive: true })
  await mkdir(join(DST_DIR, 'full'), { recursive: true })

  let copied = 0
  let missing = 0
  for (const name of names) {
    const crop = await findImageFile(join(SRC_DIR, 'crop'), name)
    const full = await findImageFile(join(SRC_DIR, 'full'), name)
    if (crop) {
      await copyFile(join(SRC_DIR, 'crop', crop), join(DST_DIR, 'crop', crop))
      copied++
    }
    if (full) {
      await copyFile(join(SRC_DIR, 'full', full), join(DST_DIR, 'full', full))
      copied++
    }
    if (!crop || !full) {
      missing++
      console.log(`  缺失: ${name} (crop:${Boolean(crop)}, full:${Boolean(full)})`)
    }
  }

  // 同时复制元数据，供前端查询
  await copyFile(join(SRC_DIR, 'cards_meta.json'), join(DST_DIR, 'cards_meta.json'))
  console.log(`\n复制完成：${copied} 张图片，缺失 ${missing} 种卡牌的图片。`)
}

main().catch(e => { console.error(e); process.exit(1) })
