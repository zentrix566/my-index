// 根据本地【完整】卡牌图源生成 manifest，供前端按卡牌中文名查 OSS 相对路径。
//
// 设计：所有卡牌原画统一托管在阿里云 OSS 的 hearthstone-cards/wild/{crop,full}/<卡名>_<id>.png，
// 前端只拼形如 /hearthstone-cards/wild/full/<卡名>_<id>.png 的本站相对路径，
// 由服务端（server/index.js）反向代理到 OSS——全程以本站域名开头、强制 Content-Disposition: inline。
// 不再区分「关联卡 / 卡组卡 / related 目录」，全部走 wild/full，便于管理。
//
// 数据源：本地完整目录（含全部卡牌），默认 E:/github/my-heartstone/hearthstone_cards/wild，
// 可用环境变量 CARD_IMG_SOURCE 覆盖。该目录不在本仓库内，仅本地生成用；
// 产物 deck-card-images.json 提交进仓库，前端据此查路径。
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = process.env.CARD_IMG_SOURCE
  || 'E:/github/my-heartstone/hearthstone_cards/wild'
const META_PATH = join(SRC, 'cards_meta.json')
const OUT_PATH = join(__dirname, '../src/hearthstone-achievements/data/deck-card-images.json')

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
  const meta = JSON.parse(await readFile(META_PATH, 'utf8').catch(() => '[]'))
  const metaByName = new Map()
  for (const c of meta) {
    if (!metaByName.has(c.name)) metaByName.set(c.name, c)
  }

  const cropFiles = await readdir(join(SRC, 'crop')).catch(() => [])
  const fullFiles = await readdir(join(SRC, 'full')).catch(() => [])

  // 同名卡（不同 _id）只保留首张即可，查图只需任一原画
  const cropByName = new Map()
  const fullByName = new Map()
  for (const f of cropFiles) {
    const name = f.split('_')[0]
    if (!cropByName.has(name)) cropByName.set(name, `/hearthstone-cards/wild/crop/${f}`)
  }
  for (const f of fullFiles) {
    const name = f.split('_')[0]
    if (!fullByName.has(name)) fullByName.set(name, `/hearthstone-cards/wild/full/${f}`)
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
