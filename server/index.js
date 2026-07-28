import express from 'express'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import os from 'node:os'
import crypto from 'node:crypto'
import { fileURLToPath } from 'url'
// 本地 `npm run dev` 直接 `node server/index.js` 启动时，.env 不会被自动加载；
// 这里补一次（生产 Docker 镜像里无 .env，loadEnvFile 抛错被静默跳过，安全）。
try { process.loadEnvFile('.env') } catch { /* 无 .env 时跳过 */ }
import { writeLog, appLog, cleanOldLogs } from './logger.js'
import { lookup } from './geoip.js'
import cookieParser from 'cookie-parser'
import authRouter, { requireAuth, getUserIdFromReq } from './auth.js'
import statsRouter from './routes/stats.js'
import {
  closeDatabase,
  ensureSchema,
  getProgress,
  getHearthstoneProfile,
  saveHearthstoneProfile,
  upsertProgress,
  bulkUpsertProgress,
  getUserByUsername,
  getAiUsage,
  reserveAiUsage,
  releaseAiUsage,
  transaction
} from './db.js'
import { getAchievementMeta, hasAchievementMeta } from './achievements-meta.js'
import {
  MAX_PINNED_ACHIEVEMENTS,
  normalizePinnedAchievementIds
} from './hearthstone-profile.js'
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
const STATIC_CACHE_MAX_AGE = 365 * 24 * 60 * 60 * 1000 // 1 年
const FORCE_SHUTDOWN_TIMEOUT_MS = 25_000

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

// ========== Stats API（仅 owner）==========
app.use('/api/stats', statsRouter)

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
    const entryCount = Object.keys(data).length
    const rawSize = Buffer.byteLength(JSON.stringify(data))
    appLog('PROGRESS', `GET user=${userId} 条目=${entryCount} 原始=${(rawSize / 1024).toFixed(1)}KB`)
    res.set('X-Progress-Count', String(entryCount))
    res.set('X-Progress-Size', String(rawSize))
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/hearthstone/profile', requireAuth, async (req, res) => {
  try {
    res.json(await getHearthstoneProfile(req.userId))
  } catch (err) {
    res.status(500).json({ error: err.message || '读取个人配置失败' })
  }
})

app.put('/api/hearthstone/profile', requireAuth, async (req, res) => {
  const body = req.body || {}
  const submittedPinnedIds =
    body.pinnedAchievementIds ??
    (typeof body.pinnedAchievementId === 'string' ? [body.pinnedAchievementId] : [])
  const preferences = body.preferences || {}

  if (!Array.isArray(submittedPinnedIds)) {
    return res.status(400).json({ error: '置顶成就格式错误' })
  }
  if (submittedPinnedIds.length > MAX_PINNED_ACHIEVEMENTS) {
    return res.status(400).json({ error: `最多置顶 ${MAX_PINNED_ACHIEVEMENTS} 项成就` })
  }
  const pinnedAchievementIds = normalizePinnedAchievementIds(submittedPinnedIds)
  if (
    pinnedAchievementIds.length !== submittedPinnedIds.length ||
    pinnedAchievementIds.some((id) => !hasAchievementMeta(id))
  ) {
    return res.status(400).json({ error: '置顶成就不存在或重复' })
  }
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return res.status(400).json({ error: '偏好设置格式错误' })
  }

  const hardcore = preferences.hardcore === true
  const compactMode = preferences.compactMode === true
  const defaultExpansionId =
    typeof preferences.defaultExpansionId === 'string' &&
    /^[a-z0-9_-]{1,64}$/i.test(preferences.defaultExpansionId)
      ? preferences.defaultExpansionId
      : ''

  try {
    const saved = await saveHearthstoneProfile(req.userId, {
      pinnedAchievementIds,
      preferences: { hardcore, compactMode, defaultExpansionId }
    })
    res.json(saved)
  } catch (err) {
    res.status(500).json({ error: err.message || '保存个人配置失败' })
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

// 保存当前登录用户的进度（upsert）。
// 进度格式：{ stages: {"0":true,"1":false}, count:N }
// 性能：单条保存免去 BEGIN/COMMIT（单条 upsert 本身原子），多条用 UNNEST 批量 upsert
// 把 N 次数据库往返降为 1 次，显著缩短高网络延迟下的保存耗时。
app.put('/api/achievements/progress', requireAuth, async (req, res) => {
  const t0 = Date.now()
  const progress = req.body && req.body.progress
  const setCost = () => res.set('X-Save-Time-Ms', String(Date.now() - t0))
  if (!progress || typeof progress !== 'object') {
    setCost()
    return res.status(400).json({ error: 'progress 格式错误' })
  }
  const entries = Object.entries(progress)
  if (entries.length === 0) {
    setCost()
    return res.status(400).json({ error: '没有要保存的进度' })
  }
  if (entries.length > 2000) {
    setCost()
    return res.status(400).json({ error: '进度条目过多' })
  }

  // 1) 纯内存校验 + 规整（不碰数据库），校验失败直接 400 返回
  const payload = []
  for (const [achId, prog] of entries) {
    if (typeof achId !== 'string' || !/^[a-z0-9_-]+$/i.test(achId)) {
      setCost()
      return res.status(400).json({ error: `非法成就 ID: ${achId}` })
    }
    if (!hasAchievementMeta(achId)) {
      setCost()
      return res.status(400).json({ error: `未知成就 ID: ${achId}` })
    }
    if (!prog || typeof prog !== 'object') {
      setCost()
      return res.status(400).json({ error: `进度格式错误: ${achId}` })
    }
    if (typeof prog.count !== 'number' || !Number.isSafeInteger(prog.count) || prog.count < 0) {
      setCost()
      return res.status(400).json({ error: `非法 count: ${achId}` })
    }
    const count = prog.count
    const stages = prog.stages
    if (!stages || typeof stages !== 'object' || Array.isArray(stages)) {
      setCost()
      return res.status(400).json({ error: `非法 stages: ${achId}` })
    }
    const { stageCount } = getAchievementMeta(achId)
    for (const [stageKey, v] of Object.entries(stages)) {
      if (stageKey === '_discovered') {
        if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
          setCost()
          return res.status(400).json({ error: `非法 _discovered: ${achId}` })
        }
        continue
      }
      if (!/^(0|[1-9]\d*)$/.test(stageKey) || Number(stageKey) >= stageCount) {
        setCost()
        return res.status(400).json({ error: `非法 stage 编号: ${achId}/${stageKey}` })
      }
      if (typeof v !== 'boolean') {
        setCost()
        return res.status(400).json({ error: `非法 stage 值: ${achId}` })
      }
    }
    const meta = getAchievementMeta(achId)
    payload.push({
      achievementId: achId,
      count,
      stages,
      name: meta.name,
      version: meta.version,
      heroClass: meta.heroClass
    })
  }

  try {
    if (payload.length === 1) {
      // 单条保存：单条 upsert 本身即原子，省去 BEGIN/COMMIT 两次数据库往返
      const p = payload[0]
      await upsertProgress(req.userId, p.achievementId, p.stages, p.count)
    } else {
      // 多条保存：单次 UNNEST 批量 upsert（事务保证原子），N 条查询 → 1 条查询
      await transaction(async (client) => {
        await bulkUpsertProgress(req.userId, payload, client)
      })
    }
    const achievementIds = payload.map((p) => p.achievementId)
    const loggedIds = achievementIds.slice(0, 20).join(',')
    const omitted = achievementIds.length > 20 ? `,另有${achievementIds.length - 20}条` : ''
    appLog('PROGRESS', `PUT user=${req.userId} 保存=${payload.length} 条 ids=${loggedIds}${omitted} 耗时=${Date.now() - t0}ms`)
    setCost()
    res.json({ ok: true, saved: payload.length })
  } catch (err) {
    const errorMessage = String(err?.message || 'unknown').replace(/[\r\n]+/g, ' ')
    const isDatabaseError = Boolean(err?.code)
    appLog('ERROR', `进度保存失败: user=${req.userId}, error=${errorMessage}`)
    setCost()
    res.status(isDatabaseError ? 500 : 400).json({
      error: isDatabaseError ? '进度保存失败，请稍后重试' : errorMessage
    })
  }
})

// ========== AI 建议（实验功能，服务端持有 Key 与额度）==========
// 强制登录：AI 消耗服务端 DeepSeek 额度，仅对登录用户开放，未登录返回 401。
// 每日额度：固定问答 AI_FIXED_DAILY 次 + 自由问答 AI_FREE_DAILY 次，按用户 + 日期 限流。
app.get('/api/ai-advisor/quota', requireAuth, async (req, res) => {
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

app.post('/api/ai-advisor', requireAuth, async (req, res) => {
  try {
    const { type, question } = req.body || {}
    if (type !== 'fixed' && type !== 'free') return res.status(400).json({ error: 'type 非法' })
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: '问题不能为空' })
    }
    if (question.length > 500) return res.status(400).json({ error: '问题过长（最多 500 字）' })

    const userKey = getUserKey(req)
    const day = todayKey()
    const limit = type === 'fixed' ? AI_FIXED_DAILY : AI_FREE_DAILY

    const userId = getUserIdFromReq(req)
    const progress = userId ? await getProgress(userId) : {}
    const effectiveHardcore = !!req.body?.hardcore
    const context = buildAiContext(progress, { hardcore: effectiveHardcore })
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(503).json({ error: 'AI 服务未配置（服务端缺少 DEEPSEEK_API_KEY）' })
    }
    const newUsage = await reserveAiUsage(userKey, day, type, limit)
    if (!newUsage) {
      const usage = await getAiUsage(userKey, day)
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
    let reply
    try {
      reply = await callDeepSeek(buildSystemPrompt(context), question)
    } catch (error) {
      await releaseAiUsage(userKey, day, type).catch((releaseError) => {
        appLog('ERROR', `AI 额度归还失败: ${releaseError.message}`)
      })
      throw error
    }
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

// ========== 炉石卡牌图反向代理 ==========
// 将本站的 /hearthstone-cards/* 反向代理到阿里云 OSS 源站（OSS_ORIGIN）。
// 目的：1) 图片以本站域名开头，无需给 OSS 绑自定义域名/备案；
//       2) 强制 Content-Disposition: inline，右键「在新标签打开图片」直接查看而非下载。
// 归一化：去掉结尾斜杠；并防止 secret 误配成带 /hearthstone-cards 后缀导致路径重复。
// 例：VITE_OSS_BASE 配成 https://bucket.oss-xx.aliyuncs.com/hearthstone-cards，
// 而 req.path 已以 /hearthstone-cards 开头，拼出来会变成
// /hearthstone-cards/hearthstone-cards/wild/... → OSS 上不存在 → 404。
// 这里把末尾多余的 /hearthstone-cards 剥掉，保证 target 拼出来路径正确。
const OSS_ORIGIN = (process.env.OSS_ORIGIN || '')
  .replace(/\/+$/, '')
  .replace(/\/hearthstone-cards$/, '')

// 卡牌图代理缓存：内存(LRU) → 磁盘(tmp) → OSS 三级。
// 缘由：详情页一次渲染约 30 张缩略图，浏览器对同源并发限 ~6，若每次都回源 OSS 会分多波、累计数秒。
// 加缓存后：同一张图只回源一次，后续（同会话重开、不同卡组共用的同名牌）直接命中缓存，毫秒级返回。
const CARD_CACHE_DIR = path.join(os.tmpdir(), 'zentrix-hs-cards')
const fsp = fs.promises                       // 异步文件操作（import fs from 'fs' 拿到的是回调风格 API）
const memCardCache = new Map()          // reqPath -> { buf, contentType, contentLength }
const MEM_CARD_CACHE_MAX = 800
const MEM_CARD_CACHE_MAX_BYTES = 128 * 1024 * 1024
const DISK_CARD_CACHE_MAX_BYTES = 256 * 1024 * 1024
const MAX_OSS_IMAGE_BYTES = 10 * 1024 * 1024
const OSS_FETCH_TIMEOUT_MS = 15_000
const ALLOWED_OSS_CONTENT_TYPES = /^image\/(?:avif|gif|jpeg|png|webp)(?:;|$)/i
const ALLOWED_OSS_PATH = /\.(?:avif|gif|jpe?g|png|webp)$/i
const cardInflight = new Map()         // target -> Promise，避免并发重复回源（惊群效应）
let memCardCacheBytes = 0
let diskCachePrunePromise = null

function memCardGet(key) {
  const v = memCardCache.get(key)
  if (v) { memCardCache.delete(key); memCardCache.set(key, v) } // 移到末尾 = LRU
  return v
}
function memCardSet(key, v) {
  if (v.contentLength > MEM_CARD_CACHE_MAX_BYTES) return
  const existing = memCardCache.get(key)
  if (existing) {
    memCardCacheBytes -= existing.contentLength
    memCardCache.delete(key)
  }
  while (
    memCardCache.size >= MEM_CARD_CACHE_MAX ||
    memCardCacheBytes + v.contentLength > MEM_CARD_CACHE_MAX_BYTES
  ) {
    const oldest = memCardCache.keys().next().value
    if (!oldest) break
    const removed = memCardCache.get(oldest)
    memCardCache.delete(oldest)
    memCardCacheBytes -= removed?.contentLength || 0
  }
  memCardCache.set(key, v)
  memCardCacheBytes += v.contentLength
}
// 用 URL 路径的哈希作磁盘文件名：既规避中文/特殊字符非法路径，又杜绝不同图映射到同一文件。
function cardDiskFile(reqPath) {
  const hash = crypto.createHash('sha1').update(reqPath).digest('hex')
  return path.join(CARD_CACHE_DIR, hash)
}
function pruneCardDiskCache() {
  if (diskCachePrunePromise) return diskCachePrunePromise
  diskCachePrunePromise = (async () => {
    const entries = await fsp.readdir(CARD_CACHE_DIR, { withFileTypes: true })
    const files = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.bin'))
      .map(async (entry) => {
        const filePath = path.join(CARD_CACHE_DIR, entry.name)
        const stat = await fsp.stat(filePath)
        return { filePath, size: stat.size, mtimeMs: stat.mtimeMs }
      }))
    let totalBytes = files.reduce((sum, file) => sum + file.size, 0)
    files.sort((a, b) => a.mtimeMs - b.mtimeMs)
    for (const file of files) {
      if (totalBytes <= DISK_CARD_CACHE_MAX_BYTES) break
      totalBytes -= file.size
      await Promise.all([
        fsp.unlink(file.filePath).catch(() => {}),
        fsp.unlink(file.filePath.replace(/\.bin$/, '.ct')).catch(() => {})
      ])
    }
  })()
    .catch(() => {})
    .finally(() => { diskCachePrunePromise = null })
  return diskCachePrunePromise
}
async function readLimitedBody(body, maxBytes) {
  const reader = body.getReader()
  const chunks = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        const error = new Error('upstream image is too large')
        error.status = 413
        throw error
      }
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks, totalBytes)
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  }
}
async function fetchCardFromOSS(target, reqPath) {
  if (cardInflight.has(target)) return cardInflight.get(target)
  const p = (async () => {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(OSS_FETCH_TIMEOUT_MS) })
    if (!upstream.ok || !upstream.body) {
      const e = new Error('upstream ' + upstream.status)
      e.status = upstream.status === 404 ? 404 : 502
      throw e
    }
    const contentType = upstream.headers.get('content-type') || 'image/png'
    if (!ALLOWED_OSS_CONTENT_TYPES.test(contentType)) {
      const error = new Error('upstream content type is not an image')
      error.status = 415
      throw error
    }
    const declaredLength = Number(upstream.headers.get('content-length')) || 0
    if (declaredLength > MAX_OSS_IMAGE_BYTES) {
      const error = new Error('upstream image is too large')
      error.status = 413
      throw error
    }
    const buf = await readLimitedBody(upstream.body, MAX_OSS_IMAGE_BYTES)
    const data = { buf, contentType, contentLength: buf.length }
    memCardSet(reqPath, data)
    // 磁盘缓存（尽力而为：k8s 临时盘 / 本地 tmp 均可写；失败不阻断，退回纯内存缓存）
    try {
      const dp = cardDiskFile(reqPath)
      await fsp.mkdir(CARD_CACHE_DIR, { recursive: true })
      await fsp.writeFile(dp + '.bin', buf)
      await fsp.writeFile(dp + '.ct', contentType)
      void pruneCardDiskCache()
    } catch { /* 磁盘不可写时忽略 */ }
    return data
  })()
  cardInflight.set(target, p)
  try { return await p } finally { cardInflight.delete(target) }
}
function sendCard(res, data, hit) {
  res.setHeader('Content-Type', data.contentType)
  res.setHeader('Content-Disposition', 'inline')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.setHeader('Content-Length', data.contentLength)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Cache', hit ? 'HIT' : 'MISS')
  res.end(data.buf)
}

// 通用 OSS 反代处理函数：把 /hearthstone-cards/*（卡牌图）与 /site-assets/*（站点静态资源，
// 如江阴地图底图）两类路径统一反代到 OSS_ORIGIN 并强制 inline。OSS 对象 key 与请求路径一致。
// 统一使用 req.path 作为缓存键与 OSS 对象路径，忽略查询串，避免同一图片被重复缓存。
async function handleOssProxy(req, res) {
  if (!OSS_ORIGIN) return res.status(404).end()
  // 路径安全：拒绝目录穿越
  if (req.path.includes('..')) return res.status(400).end()
  if (!ALLOWED_OSS_PATH.test(req.path)) return res.status(415).end()
  const cacheKey = req.path

  // 1) 内存缓存
  const mem = memCardGet(cacheKey)
  if (mem) return sendCard(res, mem, true)

  // 2) 磁盘缓存（跨重启 / 多实例共享）
  try {
    const dp = cardDiskFile(cacheKey)
    const buf = await fsp.readFile(dp + '.bin')
    const contentType = (await fsp.readFile(dp + '.ct', 'utf8').catch(() => 'image/png'))
    if (buf.length > MAX_OSS_IMAGE_BYTES || !ALLOWED_OSS_CONTENT_TYPES.test(contentType)) {
      throw new Error('invalid disk cache entry')
    }
    const data = { buf, contentType, contentLength: buf.length }
    memCardSet(cacheKey, data)
    return sendCard(res, data, true)
  } catch { /* 未命中，回源 */ }

  // 3) 回源 OSS（req.path 已是合法 URL 编码路径，切勿再 encodeURI 否则 % 二次编码 → 404）
  const target = OSS_ORIGIN + cacheKey
  try {
    const data = await fetchCardFromOSS(target, cacheKey)
    return sendCard(res, data, false)
  } catch (err) {
    appLog('ERROR', `OSS 代理失败: ${target} -> ${err.message}`)
    return res.status([404, 413, 415].includes(err.status) ? err.status : 502).end()
  }
}

// 炉石卡牌图反代
app.get('/hearthstone-cards/*', handleOssProxy)
// 站点静态资源反代（如江阴地图底图）：前端用相对路径 /site-assets/*，由服务端回源 OSS
app.get('/site-assets/*', handleOssProxy)

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
  await ensureSchema()

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
