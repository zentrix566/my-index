// 从 wiki.ifindhs.com 下载全部 380 张卡背 PNG 到 E:/github/my-heartstone/card-backs/<id>.png
// 用法: node scripts/download-card-backs-wiki.mjs
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(__dirname, '..')
const catalogPath = path.join(repo, 'src/features/hearthstone/data/card-back-map.json')
const targetDir = 'E:/github/my-heartstone/card-backs'
const BASE = 'https://wiki.ifindhs.com/cardback/cardback_'
const CONCURRENCY = 16

const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'))
const ids = catalog.map((i) => i.cardBackId).filter((id) => Number.isInteger(id) && id >= 0)

await fs.mkdir(targetDir, { recursive: true })

const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47])

async function downloadOne(id) {
  const url = `${BASE}${id}.png`
  const dest = path.join(targetDir, `${id}.png`)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 100) throw new Error('字节过少 ' + buf.length)
      if (!buf.subarray(0, 4).equals(pngSig)) throw new Error('非 PNG 魔数')
      await fs.writeFile(dest, buf)
      return { id, ok: true, size: buf.length }
    } catch (e) {
      if (attempt === 3) return { id, ok: false, error: e.message }
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
}

let done = 0
const results = []
const queue = [...ids]
async function worker() {
  while (queue.length) {
    const id = queue.shift()
    const r = await downloadOne(id)
    results.push(r)
    done++
    if (done % 50 === 0) console.error(`进度 ${done}/${ids.length}`)
  }
}
const workers = Array.from({ length: CONCURRENCY }, worker)
await Promise.all(workers)

const failed = results.filter((r) => !r.ok)
console.log(`完成: ${results.length - failed.length}/${ids.length} 成功`)
if (failed.length) {
  console.log('失败 ID:', failed.map((f) => `${f.id}(${f.error})`).join(', '))
  process.exit(1)
} else {
  console.log('全部 380 张卡背 PNG 已下载到 ' + targetDir)
}
