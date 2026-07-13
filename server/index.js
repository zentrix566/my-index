import express from 'express'
import compression from 'compression'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeLog, cleanOldLogs, getStats, getTopPages, getGeoDistribution, getRecentVisits, getHourlyTrend } from './logger.js'
import { lookup } from './geoip.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT) || (isProd ? 80 : 3000)
const DIST_DIR = path.resolve(__dirname, '../dist')
const STATIC_CACHE_MAX_AGE = 365 * 24 * 60 * 60 * 1000 // 1 年

const app = express()

// 启动时清理一次过期日志，之后每 24 小时清理一次
cleanOldLogs()
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000)

// Gzip 压缩
app.use(compression())

// 获取真实客户端 IP（支持 X-Forwarded-For 代理）
app.set('trust proxy', true)

// 安全头
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

// 访问日志中间件
app.use((req, res, next) => {
  const start = Date.now()
  const ip = req.ip || req.socket.remoteAddress || ''
  const realIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || '').toString() || ip

  // IPv6 映射的 IPv4 地址归一化
  const normalizedIp = realIp.startsWith('::ffff:') ? realIp.slice(7) : realIp

  const geo = lookup(normalizedIp)
  const ua = req.headers['user-agent'] || ''
  const referer = req.headers['referer'] || ''

  res.on('finish', () => {
    const responseTime = Date.now() - start
    const url = req.originalUrl || req.url
    // isPage 由前端 router.afterEach 通过 /api/track 上报，中间件不直接标记 HTML 为 page
    // 避免首次加载时被重复计数
    const isPage = false

    writeLog({
      ts: new Date().toISOString(),
      ip: normalizedIp,
      method: req.method,
      path: url,
      status: res.statusCode,
      bytes: parseInt(res.getHeader('content-length')) || 0,
      referer,
      ua,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      responseTime,
      isPage
    })
  })

  next()
})

// 页面访问去重缓存（同一 IP+UA+路径 3秒内不重复记录）
const trackCache = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [k, t] of trackCache) {
    if (now - t > 30000) trackCache.delete(k)
  }
}, 60000)

// ========== 页面访问上报（SPA 路由切换时由前端调用）==========

app.post('/api/track', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || ''
  const realIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || '').toString() || ip
  const normalizedIp = realIp.startsWith('::ffff:') ? realIp.slice(7) : realIp

  const geo = lookup(normalizedIp)
  const ua = req.headers['user-agent'] || ''
  const referer = req.headers['referer'] || ''
  const pagePath = (req.headers['x-track-path'] || req.query.path || '/').toString()
  const pageTitle = (req.headers['x-track-title'] || '').toString()

  // 简单去重
  const dedupKey = `${normalizedIp}|${ua}|${pagePath}`
  const now = Date.now()
  if (trackCache.has(dedupKey) && now - trackCache.get(dedupKey) < 3000) {
    return res.status(204).end()
  }
  trackCache.set(dedupKey, now)

  writeLog({
    ts: new Date().toISOString(),
    ip: normalizedIp,
    method: 'TRACK',
    path: pagePath,
    status: 200,
    bytes: 0,
    referer,
    ua,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    isp: geo.isp,
    responseTime: 0,
    isPage: true,
    pageTitle
  })

  res.status(204).end()
})

// ========== Stats API ==========

app.get('/api/stats/overview', async (req, res) => {
  try {
    const stats = await getStats()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/stats/pages', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30)
    const data = await getTopPages(days)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/stats/geo', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 30)
    const data = await getGeoDistribution(days)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/stats/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const data = await getRecentVisits(limit)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/stats/hourly', async (req, res) => {
  try {
    const data = await getHourlyTrend()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ========== 静态文件服务 ==========

// 健康检查
app.get('/health', (req, res) => {
  res.type('text/plain').send('OK\n')
})

// 静态资源（带长期缓存）
app.use(
  express.static(DIST_DIR, {
    maxAge: STATIC_CACHE_MAX_AGE,
    immutable: true,
    index: false,
    setHeaders(res, filePath) {
      // HTML 文件不缓存，确保 SPA 更新能及时生效
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
    }
  })
)

// SPA 回退：所有未匹配的路由返回 index.html
app.get('*', (req, res) => {
  // API 路由 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.sendFile(path.join(DIST_DIR, 'index.html'), {
    headers: { 'Cache-Control': 'no-cache' }
  })
})

// 启动服务
app.listen(PORT, () => {
  console.log(`[server] 服务已启动，监听端口 ${PORT}`)
  console.log(`[server] 静态文件目录: ${DIST_DIR}`)
})
