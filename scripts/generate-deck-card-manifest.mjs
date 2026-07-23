// 根据已复制的卡组卡牌图片生成 manifest，供 deckstring.js 查询本地图片路径
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMG_DIR = join(__dirname, '../public/hearthstone-cards/wild')
const META_PATH = join(IMG_DIR, 'cards_meta.json')
const OUT_PATH = join(__dirname, '../src/hearthstone-achievements/data/deck-card-images.json')

async function findImageFile(dir, name) {
  const files = await readdir(dir).catch(() => [])
  return files.find(f => f.startsWith(name + '_'))
}

function rarityName(id) {
  // 与 HearthstoneJSON 的 rarity_id 保持一致
  if (id === 1) return 'common'
  if (id === 2) return 'free'
  if (id === 3) return 'rare'
  if (id === 4) return 'epic'
  if (id === 5) return 'legendary'
  return 'unknown'
}

async function main() {
  const meta = JSON.parse(await readFile(META_PATH, 'utf8'))
  const metaByName = new Map()
  for (const c of meta) {
    if (!metaByName.has(c.name)) metaByName.set(c.name, c)
  }

  const cropFiles = await readdir(join(IMG_DIR, 'crop')).catch(() => [])
  const fullFiles = await readdir(join(IMG_DIR, 'full')).catch(() => [])

  const cropByName = new Map()
  const fullByName = new Map()
  for (const f of cropFiles) {
    const name = f.split('_')[0]
    cropByName.set(name, `/hearthstone-cards/wild/crop/${f}`)
  }
  for (const f of fullFiles) {
    const name = f.split('_')[0]
    fullByName.set(name, `/hearthstone-cards/wild/full/${f}`)
  }

  const manifest = {}
  const names = new Set([...cropByName.keys(), ...fullByName.keys()])
  for (const name of names) {
    const crop = cropByName.get(name)
    const full = fullByName.get(name)
    const metaCard = metaByName.get(name)
    manifest[name] = {
      crop,
      full,
      rarityId: metaCard ? metaCard.rarity_id : null
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(`生成 manifest：${Object.keys(manifest).length} 张卡牌 -> ${OUT_PATH}`)
}

main().catch(e => { console.error(e); process.exit(1) })
