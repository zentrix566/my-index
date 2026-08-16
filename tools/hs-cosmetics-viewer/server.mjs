// 炉石外观收藏查看器 —— 独立 Node 服务（零依赖，仅用内置模块）
// 读取主项目里的完整 cosmetics 目录(名称+图片路径)，展示卡背/英雄皮肤/幸运币，
// 支持"已拥有/未拥有"标记、筛选、排序、搜索，以及导入你自己的拥有列表。
//
// 运行：  node server.mjs
// 可选环境变量：
//   HS_DATA_DIR           外观目录数据目录，默认 E:/github/my-index/public/hearthstone
//   HS_COSMETICS_SOURCE_DIR  本地 cosmetics 图片根目录(若存在则直接静态服务)
//   OSS_ORIGIN            OSS 源站(如 https://bucket.oss-cn-xx.aliyuncs.com)，
//                         设置后 /hearthstone-cosmetics/* 自动反代回源，图片即可显示
//   PORT                  监听端口，默认 5178

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 5178
const DATA_DIR = process.env.HS_DATA_DIR ||
  'E:/github/my-index/public/hearthstone'
const COSMETICS_SOURCE_DIR = process.env.HS_COSMETICS_SOURCE_DIR || ''
const OSS_ORIGIN = process.env.OSS_ORIGIN || ''
const OWNED_DIR = path.join(__dirname, 'data')
const PUBLIC_DIR = path.join(__dirname, 'public')

const TYPES = {
  coins: { file: 'coins.json', idKey: 'cardId', sortKey: 'dbfId', label: '幸运币' },
  cardBacks: { file: 'card-backs.json', idKey: 'cardBackId', sortKey: 'cardBackId', label: '卡背' },
  heroSkins: { file: 'hero-skins.json', idKey: 'cardId', sortKey: 'dbfId', label: '英雄皮肤' }
}

function readCatalog () {
  const catalog = { coins: [], cardBacks: [], heroSkins: [] }
  for (const [type, cfg] of Object.entries(TYPES)) {
    const raw = fs.readFileSync(path.join(DATA_DIR, cfg.file), 'utf8')
    const arr = JSON.parse(raw)
    for (const it of arr) {
      if (it.hidden) continue
      const id = String(it[cfg.idKey])
      const sortKey = Number(it[cfg.sortKey]) || 0
      catalog[type].push({
        id,
        name: it.officialName || it.cardId || it.cardBackId || '',
        image: it.imageUrl || '',
        sortKey,
        heroClass: it.heroClass || '',
        howToGet: it.howToGet || '',
        dbfId: it.dbfId ?? it.cardBackId ?? null,
        cosmeticHeroId: it.cosmeticHeroId ?? null
      })
    }
  }
  return catalog
}

const OWNED_FILES = {
  cosmetics: path.join(OWNED_DIR, 'cosmetics.json'),
  achievements: path.join(OWNED_DIR, 'achievements.json')
}

// 从合并后的 cosmetics.json 读取某类外观的 id 列表与权威 count
function readCosmeticSection (section) {
  try {
    const d = JSON.parse(fs.readFileSync(OWNED_FILES.cosmetics, 'utf8'))
    const sec = d[section] || {}
    const ids = Array.isArray(sec.ids) ? sec.ids.map(String) : []
    return { ids, count: sec.count ?? ids.length, byClass: sec.byClass ?? null }
  } catch {
    return { ids: [], count: 0, byClass: null }
  }
}

function readOwned () {
  let achievements = null
  try {
    const d = JSON.parse(fs.readFileSync(OWNED_FILES.achievements, 'utf8'))
    achievements = {
      totalCompleted: d.totalCompleted ?? null,
      categories: d.categories ?? [],
      itemsTotal: d.itemsTotal ?? null,
      itemsCompleted: d.itemsCompleted ?? null,
      items: Array.isArray(d.items) ? d.items : []
    }
  } catch { achievements = null }

  // 权威"已拥有"数取自采集器写入文件时的 count（内存真实读数）；目录快照可能比游戏客户端旧。
  const cb = readCosmeticSection('cardBacks')
  const co = readCosmeticSection('coins')
  const hs = readCosmeticSection('heroSkins')
  return {
    coins: co.ids,
    cardBacks: cb.ids,
    heroSkins: hs.ids,
    counts: { coins: co.count, cardBacks: cb.count, heroSkins: hs.count },
    heroByClass: hs.byClass,
    achievements
  }
}

// 导入/清空：把三类外观写回合并的 cosmetics.json；成就由采集器维护，不覆盖（除非随导入一并提交）
function writeOwned (obj) {
  const cosmetics = {
    source: 'MindVision (Hearthstone game memory)',
    collectedAt: new Date().toISOString(),
    cardBacks: { count: (obj.cardBacks || []).length, ids: (obj.cardBacks || []).map(String) },
    coins: { count: (obj.coins || []).length, ids: (obj.coins || []).map(String) },
    heroSkins: {
      count: (obj.heroSkins || []).length,
      ids: (obj.heroSkins || []).map(String),
      byClass: obj.heroByClass ?? null
    }
  }
  fs.writeFileSync(OWNED_FILES.cosmetics, JSON.stringify(cosmetics, null, 2), 'utf8')
  if (obj.achievements) {
    const a = obj.achievements
    fs.writeFileSync(OWNED_FILES.achievements, JSON.stringify({
      source: 'MindVision (Hearthstone game memory)',
      collectedAt: new Date().toISOString(),
      totalCompleted: a.totalCompleted ?? null,
      categories: a.categories ?? [],
      items: a.items ?? []
    }, null, 2), 'utf8')
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml'
}

function sendJson (res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(body)
}

function serveStatic (req, res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(buf)
  })
}

// 反代 /hearthstone-cosmetics/* 到 OSS（图片）。需设置 OSS_ORIGIN。
async function proxyCosmetics (req, res, relPath) {
  if (COSMETICS_SOURCE_DIR && fs.existsSync(COSMETICS_SOURCE_DIR)) {
    const local = path.join(COSMETICS_SOURCE_DIR, relPath)
    if (fs.existsSync(local) && fs.statSync(local).isFile()) {
      return serveStatic(req, res, local)
    }
  }
  if (!OSS_ORIGIN) {
    res.writeHead(404)
    res.end('no image source configured')
    return
  }
  const target = OSS_ORIGIN.replace(/\/$/, '') + '/hearthstone-cosmetics/' + relPath
  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(15000) })
    if (!upstream.ok) { res.writeHead(upstream.status); res.end(); return }
    const buf = Buffer.from(await upstream.arrayBuffer())
    const ext = path.extname(relPath).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=31536000, immutable' })
    res.end(buf)
  } catch (e) {
    res.writeHead(502)
    res.end('oss proxy failed: ' + e.message)
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const p = url.pathname

  // 图片反代 / 本地静态
  if (p.startsWith('/hearthstone-cosmetics/')) {
    const rel = decodeURIComponent(p.slice('/hearthstone-cosmetics/'.length))
    return proxyCosmetics(req, res, rel)
  }

  if (p === '/api/catalog' || p === '/api/cosmetics/catalog') {
    try { return sendJson(res, 200, readCatalog()) }
    catch (e) { return sendJson(res, 500, { error: e.message }) }
  }

  if ((p === '/api/owned' || p === '/api/cosmetics/owned') && req.method === 'GET') {
    return sendJson(res, 200, readOwned())
  }

  if ((p === '/api/owned' || p === '/api/cosmetics/owned') && req.method === 'POST') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy() })
    req.on('end', () => {
      try {
        const obj = JSON.parse(body)
        const existing = readOwned()
        const clean = {
          coins: Array.isArray(obj.coins) ? obj.coins.map(String) : [],
          cardBacks: Array.isArray(obj.cardBacks) ? obj.cardBacks.map(String) : [],
          heroSkins: Array.isArray(obj.heroSkins) ? obj.heroSkins.map(String) : [],
          // 保留成就数据（由采集器写入，导入/清空外观时不丢失）
          achievements: (obj.achievements !== undefined)
            ? obj.achievements
            : (existing.achievements ?? null)
        }
        writeOwned(clean)
        return sendJson(res, 200, { ok: true, owned: clean })
      } catch (e) { return sendJson(res, 400, { error: e.message }) }
    })
    return
  }

  // 静态前端
  let rel = p === '/' ? '/index.html' : p
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''))
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return }
  serveStatic(req, res, filePath)
})

server.listen(PORT, () => {
  console.log(`炉石外观收藏查看器已启动: http://localhost:${PORT}`)
  console.log(`目录数据源: ${DATA_DIR}`)
  if (OSS_ORIGIN) console.log('OSS 图片反代: 已启用')
  else console.log('OSS 图片反代: 未配置(OSS_ORIGIN)，图片将显示占位，不影响浏览/筛选')
})
