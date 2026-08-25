import express from 'express'
import { requireOwner } from '../auth.js'
import { sendInternalError } from '../validation.js'
import {
  getStats,
  getTopPages,
  getGeoDistribution,
  getRecentVisits,
  getHourlyTrend
} from '../logger.js'

const router = express.Router()

// 访问统计原本每次请求都会重读全部日志文件（getStats 要扫 90 天的 access 日志，
// 5 个并行接口各自重读），线上日志量大时一次要几十秒，浏览器/代理容易超时「打不开」。
// 改为内存缓存 + 服务端定时预热：用户请求几乎总是命中已算好的缓存，毫秒级返回；
// 缓存只在 TTL 过期后的首次访问（或后台预热）重新计算，且每个 key 独立失效。
const TTL = {
  overview: 120_000,
  pages: 120_000,
  geo: 300_000,
  recent: 60_000,
  hourly: 120_000
}
const cache = new Map()

async function cached(key, ttl, compute) {
  const hit = cache.get(key)
  const now = Date.now()
  if (hit && now < hit.expires) return hit.data
  // 计算期间若已有同 key 在途，复用其 Promise，避免并发击穿
  if (hit?.inflight) return hit.inflight
  const promise = (async () => {
    const data = await compute()
    cache.set(key, { data, expires: Date.now() + ttl, inflight: null })
    return data
  })()
  cache.set(key, { data: null, expires: 0, inflight: promise })
  return promise
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      sendInternalError(res, '统计数据读取失败，请稍后重试')
    }
  }
}

router.use(requireOwner)

router.get('/overview', asyncRoute(async (_req, res) => {
  res.json(await cached('overview', TTL.overview, getStats))
}))

router.get('/pages', asyncRoute(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 30)
  res.json(await cached(`pages:${days}`, TTL.pages, () => getTopPages(days)))
}))

router.get('/geo', asyncRoute(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 30)
  res.json(await cached(`geo:${days}`, TTL.geo, () => getGeoDistribution(days)))
}))

router.get('/recent', asyncRoute(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
  res.json(await cached(`recent:${limit}`, TTL.recent, () => getRecentVisits(limit)))
}))

router.get('/hourly', asyncRoute(async (_req, res) => {
  res.json(await cached('hourly', TTL.hourly, getHourlyTrend))
}))

// 后台预热：进程启动后立即算一遍并每 60s 刷新，保证缓存常热，
// 用户打开后台时直接命中，不再受日志扫描耗时影响。
async function warmUp() {
  try {
    await Promise.all([
      cached('overview', TTL.overview, getStats),
      cached('pages:7', TTL.pages, () => getTopPages(7)),
      cached('geo:7', TTL.geo, () => getGeoDistribution(7)),
      cached('recent:50', TTL.recent, () => getRecentVisits(50)),
      cached('hourly', TTL.hourly, getHourlyTrend)
    ])
  } catch {
    // 预热失败不影响接口（下次请求会重新计算），仅静默
  }
}

warmUp()
setInterval(warmUp, 60_000)

export default router
