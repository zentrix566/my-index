#!/usr/bin/env node
/**
 * 读取已下载到 tools/card-back-images/ 的卡背图片，结合 card-back-map.json 生成
 * 对照画廊 gallery.html：每张图下方标注 cardBackId + 官方名 + png/webp 是否到位，
 * 方便人工核对「图是否对名 / 哪些是不想要的 / 哪些缺失」。
 *
 * 用法：node scripts/gen-card-back-gallery.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(__dirname, '..')
const map = JSON.parse(
  readFileSync(resolve(repoRoot, 'src/features/hearthstone/data/card-back-map.json'), 'utf8')
)
const base = resolve(repoRoot, 'tools/card-back-images')
const cardBacksDir = join(base, 'card-backs')

const rows = map
  .map((it) => {
    const id = it.cardBackId
    return {
      id,
      name: it.officialName || '',
      png: existsSync(join(cardBacksDir, `${id}.png`)),
      webp: existsSync(join(cardBacksDir, '384', `${id}.webp`))
    }
  })
  .sort((a, b) => a.id - b.id)

const cards = rows
  .map(
    (r) => `<div class="card${r.png ? '' : ' missing'}">
  <img src="card-backs/${r.id}.png" loading="lazy" onerror="this.style.visibility='hidden'">
  <div class="meta"><span class="id">#${r.id}</span> <span class="name">${r.name}</span>
    <span class="tag ${r.png ? 'tag-yes' : 'tag-no'}">png${r.png ? '✓' : '✗'}</span>
    <span class="tag ${r.webp ? 'tag-yes' : 'tag-no'}">webp${r.webp ? '✓' : '✗'}</span></div>
</div>`
  )
  .join('\n')

const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>卡背图片核对画廊</title>
<style>body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:16px}
h1{font-size:18px}.hint{color:#aaa;font-size:13px;margin:8px 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.card{background:#1c1c1c;border-radius:8px;overflow:hidden;border:1px solid #333}
.card.missing{border-color:#c33}
.card img{width:100%;display:block;background:#000;aspect-ratio:1.5/1;object-fit:contain}
.meta{padding:6px 8px;font-size:12px;line-height:1.5}
.id{color:#7af;font-weight:600}.name{color:#eee}
.tag{display:inline-block;font-size:11px;padding:1px 5px;border-radius:4px;margin-left:4px}
.tag-no{background:#c33;color:#fff}.tag-yes{background:#3a3;color:#fff}
</style></head><body>
<h1>卡背图片核对（共 ${rows.length} 条）</h1>
<p class="hint">原图 png 缺失显示红框。对照 officialName 看「图是否对名 / 是否是不想要的图」。
本地图片路径：tools/card-back-images/card-backs/</p>
<div class="grid">
${cards}
</div></body></html>`

writeFileSync(join(base, 'gallery.html'), html, 'utf8')
const missing = rows.filter((r) => !r.png).map((r) => `#${r.id} ${r.name}`)
console.log(`画廊已生成: ${join(base, 'gallery.html')}`)
console.log(`原图 png 缺失 ${missing.length} 张:`, missing.join(', ') || '无')
