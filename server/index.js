import express from 'express'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { writeLog, appLog, cleanOldLogs, getStats, getTopPages, getGeoDistribution, getRecentVisits, getHourlyTrend } from './logger.js'
import { lookup } from './geoip.js'
import cookieParser from 'cookie-parser'
import authRouter, { requireAuth, getUserIdFromReq } from './auth.js'
import {
  closeDatabase,
  getProgress,
  upsertProgress,
  getUserByUsername,
  getAiUsage,
  incrementAiUsage,
  transaction
} from './db.js'
import { getAchievementMeta, hasAchievementMeta } from './achievements-meta.js'
import {
  AI_FIXED_DAILY,
  AI_FREE_DAILY,
  buildAiContext,
  callDeepSeek,
  buildSystemPrompt,
  todayKey
} from './ai-advisor.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 生产兜底：若进程环境未注入密钥等变量，则尝试从项目根目录 .env 读取（缺失则静默跳过）。
// 仅在对应变量尚不存在时才写入，确保 k8s / 进程注入的环境变量优先于 .env 文件。
try {
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, 'utf8')
    for (const raw of envText.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const m = line.match(/^([\w.-]+)\s*=\s*(.*)$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = val
    }
  }
} catch {
  /* 无 .env 或解析失败时跳过，不阻断启动 */
}

const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT) || (isProd ? 80 : 3000)
const DIST_DIR = path.resolve(__dirname, '../dist')
const DATA_DIR = path.resolve(__dirname, '../data')
const ACHIEVEMENT_PROGRESS_FILE = path.join(DATA_DIR, 'achievement-progress.json')
const STATIC_CACHE_MAX_AGE = 365 * 24 * 60 * 60 * 1000 // 1 年
const FORCE_SHUTDOWN_TIMEOUT_MS = 25_000

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// 读取成就进度
function loadAchievementProgress() {
  try {
    if (fs.existsSync(ACHIEVEMENT_PROGRESS_FILE)) {
      const raw = fs.readFileSync(ACHIEVEMENT_PROGRESS_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[achievement] 读取进度失败:', err)
  }
  return {}
}

const app = express()

// 解析 JSON body
app.use(express.json({ limit: '1mb' }))
// 解析 Cookie（登录态 JWT 放在 httpOnly Cookie 中）
app.use(cookieParser())

// 启动时清理一次过期日志，之后每 24 小时清理一次
cleanOldLogs()
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000)

// Gzip 压缩
app.use(compression())

// 获取真实客户端 IP（支持 X-Forwarded-For 代理）
// 注意：不能用宽松的 `true`——那等于信任任意代理，X-Forwarded-For 可被客户端伪造，
// express-rate-limit 会抛 ERR_ERL_PERMISSIVE_TRUST_PROXY。
// 设为 1 表示「只信任上一跳代理」（如 Cloudflare Tunnel）；本地无代理时 req.ip 回退为直连 socket 地址，安全且不出错。
app.set('trust proxy', 1)

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

// 客户端标识：登录用户用 userId，匿名用 IP（用于每日额度限流）
function getClientIp(req) {
  const ip = req.ip || req.socket.remoteAddress || ''
  const realIp = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    (req.headers['x-real-ip'] || '').toString() || ip
  return realIp.startsWith('::ffff:') ? realIp.slice(7) : realIp
}
function getUserKey(req) {
  const userId = getUserIdFromReq(req)
  if (userId) return String(userId)
  return `ip:${getClientIp(req)}`
}

// ========== 认证 API ==========
app.use('/api/auth', authRouter)

// ========== 成就进度 API ==========

// 获取当前登录用户的进度；匿名返回空对象（前端据此隐藏进度、引导登录）
app.get('/api/achievements/progress', async (req, res) => {
  try {
    const userId = getUserIdFromReq(req)
    if (!userId) {
      appLog('PROGRESS', 'GET 匿名访问，无进度')
      return res.json({})
    }
    const data = await getProgress(userId)
    appLog('PROGRESS', `GET user=${userId} 条目=${Object.keys(data).length}`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 公开示例：返回所有者账号进度（只读预览，不泄露其他用户数据）
app.get('/api/achievements/example', async (req, res) => {
  try {
    const ownerName = process.env.OWNER_USERNAME || 'owner'
    const owner = await getUserByUsername(ownerName)
    if (!owner) {
      appLog('PROGRESS', `example 所有者 "${ownerName}" 不存在`)
      return res.json({})
    }
    const data = await getProgress(owner.id)
    appLog('PROGRESS', `example 所有者="${ownerName}" 条目=${Object.keys(data).length}`)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 保存当前登录用户的进度（整份草稿 upsert，事务保证原子）
app.put('/api/achievements/progress', requireAuth, async (req, res) => {
  const progress = req.body && req.body.progress
  if (!progress || typeof progress !== 'object') {
    return res.status(400).json({ error: 'progress 格式错误' })
  }
  const entries = Object.entries(progress)
  if (entries.length === 0) return res.status(400).json({ error: '没有要保存的进度' })
  if (entries.length > 2000) return res.status(400).json({ error: '进度条目过多' })

  try {
    await transaction(async (client) => {
      for (const [achId, prog] of entries) {
        if (typeof achId !== 'string' || !/^[a-z0-9_-]+$/i.test(achId)) {
          throw new Error(`非法成就 ID: ${achId}`)
        }
        if (!hasAchievementMeta(achId)) {
          throw new Error(`未知成就 ID: ${achId}`)
        }
        if (!prog || typeof prog !== 'object') throw new Error(`进度格式错误: ${achId}`)
        if (typeof prog.count !== 'number' || !Number.isSafeInteger(prog.count) || prog.count < 0) {
          throw new Error(`非法 count: ${achId}`)
        }
        const count = prog.count
        const stages = prog.stages
        if (!stages || typeof stages !== 'object' || Array.isArray(stages)) {
          throw new Error(`非法 stages: ${achId}`)
        }
        const { stageCount } = getAchievementMeta(achId)
        for (const [stageKey, v] of Object.entries(stages)) {
          if (!/^(0|[1-9]\d*)$/.test(stageKey) || Number(stageKey) >= stageCount) {
            throw new Error(`非法 stage 编号: ${achId}/${stageKey}`)
          }
          if (typeof v !== 'boolean') throw new Error(`非法 stage 值: ${achId}`)
        }
        await upsertProgress(req.userId, achId, stages, count, client)
      }
    })
    const achievementIds = entries.map(([achievementId]) => achievementId)
    const loggedIds = achievementIds.slice(0, 20).join(',')
    const omitted = achievementIds.length > 20 ? `,另有${achievementIds.length - 20}条` : ''
    appLog('PROGRESS', `PUT user=${req.userId} 保存=${entries.length} 条 ids=${loggedIds}${omitted}`)
    res.json({ ok: true, saved: entries.length })
  } catch (err) {
    const errorMessage = String(err?.message || 'unknown').replace(/[\r\n]+/g, ' ')
    const isDatabaseError = Boolean(err?.code)
    appLog('ERROR', `进度保存失败: user=${req.userId}, error=${errorMessage}`)
    res.status(isDatabaseError ? 500 : 400).json({
      error: isDatabaseError ? '进度保存失败，请稍后重试' : errorMessage
    })
  }
})

// ========== AI 建议（实验功能，服务端持有 Key 与额度）==========
// 每日额度：固定问答 AI_FIXED_DAILY 次 + 自由问答 AI_FREE_DAILY 次，按用户/IP + 日期 限流
app.get('/api/ai-advisor/quota', async (req, res) => {
  try {
    const usage = await getAiUsage(getUserKey(req), todayKey())
    res.json({
      fixedUsed: usage.fixedCount,
      fixedLimit: AI_FIXED_DAILY,
      freeUsed: usage.freeCount,
      freeLimit: AI_FREE_DAILY
    })
  } catch (err) {
    res.status(500).json({ error: err.message || '查询额度失败' })
  }
})

app.post('/api/ai-advisor', async (req, res) => {
  try {
    const { type, question } = req.body || {}
    if (type !== 'fixed' && type !== 'free') return res.status(400).json({ error: 'type 非法' })
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: '问题不能为空' })
    }
    if (question.length > 500) return res.status(400).json({ error: '问题过长（最多 500 字）' })

    const userKey = getUserKey(req)
    const day = todayKey()
    const usage = await getAiUsage(userKey, day)
    const limit = type === 'fixed' ? AI_FIXED_DAILY : AI_FREE_DAILY
    const used = type === 'fixed' ? usage.fixedCount : usage.freeCount
    if (used >= limit) {
      const label = type === 'fixed' ? `固定问答（${AI_FIXED_DAILY} 次/天）` : `自由提问（${AI_FREE_DAILY} 次/天）`
      return res.status(429).json({
        error: `今日${label}额度已用完，明天再来看看～`,
        quota: {
          fixedUsed: usage.fixedCount,
          fixedLimit: AI_FIXED_DAILY,
          freeUsed: usage.freeCount,
          freeLimit: AI_FREE_DAILY
        }
      })
    }

    const userId = getUserIdFromReq(req)
    const progress = userId ? await getProgress(userId) : {}
    const effectiveHardcore = !!req.body?.hardcore
    const context = buildAiContext(progress, { hardcore: effectiveHardcore })
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(503).json({ error: 'AI 服务未配置（服务端缺少 DEEPSEEK_API_KEY）' })
    }
    const reply = await callDeepSeek(buildSystemPrompt(context), question)
    const newUsage = await incrementAiUsage(userKey, day, type)
    const versionCount = new Set(context.items.map((i) => i.version)).size
    res.json({
      ok: true,
      reply,
      scope: {
        hardcore: effectiveHardcore,
        remaining: context.remainingCount,
        versions: versionCount
      },
      quota: {
        fixedUsed: newUsage.fixedCount,
        fixedLimit: AI_FIXED_DAILY,
        freeUsed: newUsage.freeCount,
        freeLimit: AI_FREE_DAILY
      }
    })
  } catch (err) {
    appLog('ERROR', `AI 建议失败: ${err.message}`)
    res.status(500).json({ error: err.message || 'AI 请求失败' })
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

// ========== 启动引导 ==========
// 首次部署：确保数据库表已建（db.js 导入时自动执行迁移），
// 并在所有者账号缺失/无进度时导入初始示例进度（供「未登录预览」使用）。
let httpServer = null
let isShuttingDown = false

async function bootstrap() {
  if (process.env.SEED_ON_STARTUP !== 'false') {
    try {
      const { ensureSeeded } = await import('./seed/seed.js')
      await ensureSeeded()
    } catch (err) {
      appLog('ERROR', `启动种子失败: ${err.message}`)
    }
  }

  httpServer = app.listen(PORT, () => {
    appLog('SERVER', `服务已启动，监听端口 ${PORT}`)
    appLog('SERVER', `静态文件目录: ${DIST_DIR}`)
    appLog('SERVER', `数据目录: ${DATA_DIR}`)
  })
}

/** Kubernetes 终止 Pod 时先停止接收新请求，再等待现有请求和数据库连接结束。 */
async function shutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  appLog('SERVER', `收到 ${signal}，开始优雅停机`)

  const forceTimer = setTimeout(() => {
    appLog('ERROR', '优雅停机超时，强制退出')
    httpServer?.closeAllConnections?.()
    process.exit(1)
  }, FORCE_SHUTDOWN_TIMEOUT_MS)
  forceTimer.unref()

  try {
    await new Promise((resolve, reject) => {
      if (!httpServer) {
        resolve()
        return
      }
      httpServer.close((err) => {
        if (err) reject(err)
        else resolve()
      })
      httpServer.closeIdleConnections?.()
    })
    await closeDatabase()
    clearTimeout(forceTimer)
    appLog('SERVER', '优雅停机完成')
    process.exit(0)
  } catch (err) {
    clearTimeout(forceTimer)
    appLog('ERROR', `优雅停机失败: ${err.message}`)
    process.exit(1)
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void shutdown(signal)
  })
}

bootstrap().catch((err) => {
  appLog('ERROR', `服务启动失败: ${err.message}`)
  void shutdown('BOOTSTRAP_ERROR')
})
