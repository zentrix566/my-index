// tools/hs-cosmetics-viewer/build-importer.mjs
// 把本地外观目录(卡背/硬币/英雄皮肤)注入 importer-template.html，
// 生成自包含、免服务器的 dist-importer/index.html（用户上传采集器 JSON 即可看收藏）。
//
// 运行： node tools/hs-cosmetics-viewer/build-importer.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..') // 仓库根 E:/github/my-index
const CATALOG_DIR = path.join(ROOT, 'src', 'features', 'hearthstone', 'data')
const PUBLIC_CATALOG_DIR = path.join(ROOT, 'public', 'hearthstone')
const OUT_DIR = path.join(__dirname, 'dist-importer')

function readJson (p) { return JSON.parse(fs.readFileSync(p, 'utf8')) }

const cardBacks = readJson(path.join(CATALOG_DIR, 'card-back-map.json'))
const coins = readJson(path.join(PUBLIC_CATALOG_DIR, 'coins.json'))
const heroSkins = readJson(path.join(PUBLIC_CATALOG_DIR, 'hero-skins.json'))

const arr = a => Array.isArray(a) ? a : [].concat(...Object.values(a))
const catalog = {
  cardBacks: arr(cardBacks),
  coins: arr(coins),
  heroSkins: arr(heroSkins),
}

let tpl = fs.readFileSync(path.join(__dirname, 'importer-template.html'), 'utf8')
const json = JSON.stringify(catalog)
  .replace(/<\/script/gi, '<\\/script')   // 防止目录文本里出现 </script> 截断
const out = tpl.replace('__CATALOG_PLACEHOLDER__', json)

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), out, 'utf8')

console.log(`已生成 ${path.join(OUT_DIR, 'index.html')}`)
console.log(`  卡背目录 ${catalog.cardBacks.length} / 硬币目录 ${catalog.coins.length} / 英雄皮肤目录 ${catalog.heroSkins.length}`)
console.log(`  产物大小 ${(out.length/1024).toFixed(0)} KB`)
