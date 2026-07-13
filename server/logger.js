import fs from 'fs'
import path from 'path'
import readline from 'readline'

const LOG_DIR = process.env.LOG_DIR || path.resolve(process.cwd(), 'logs')
const KEEP_DAYS = 90

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function getLogFilePath(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return path.join(LOG_DIR, `access-${y}-${m}-${d}.log`)
}

/**
 * 写入一条访问日志（JSON Lines 格式）
 * @param {object} entry - 日志条目
 */
export function writeLog(entry) {
  const line = JSON.stringify(entry) + '\n'
  const filePath = getLogFilePath()
  fs.appendFile(filePath, line, (err) => {
    if (err) console.error('[logger] 写入日志失败:', err)
  })
}

/**
 * 清理过期日志文件
 */
export function cleanOldLogs() {
  const now = Date.now()
  const cutoff = now - KEEP_DAYS * 24 * 60 * 60 * 1000
  fs.readdir(LOG_DIR, (err, files) => {
    if (err) return
    for (const file of files) {
      const filePath = path.join(LOG_DIR, file)
      fs.stat(filePath, (statErr, stats) => {
        if (statErr) return
        if (stats.mtimeMs < cutoff) {
          fs.unlink(filePath, () => {})
        }
      })
    }
  })
}

/**
 * 读取指定日期的日志行
 * @param {Date} date
 * @returns {Promise<object[]>}
 */
function readLogsByDate(date) {
  return new Promise((resolve) => {
    const filePath = getLogFilePath(date)
    if (!fs.existsSync(filePath)) {
      resolve([])
      return
    }
    const entries = []
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    })
    rl.on('line', (line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      try {
        entries.push(JSON.parse(trimmed))
      } catch {
        // 忽略损坏的行
      }
    })
    rl.on('close', () => resolve(entries))
    rl.on('error', () => resolve(entries))
  })
}

/**
 * 获取今天零点时间戳
 */
function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * 获取昨天零点时间戳
 */
function getYesterdayStart() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * 获取访客唯一标识（IP + UA 取哈希）
 */
function getVisitorKey(entry) {
  return `${entry.ip}|${entry.ua || ''}`
}

/**
 * 获取访问统计概览
 */
export async function getStats() {
  const todayStart = getTodayStart()
  const yesterdayStart = getYesterdayStart()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const [todayLogs, yesterdayLogs] = await Promise.all([
    readLogsByDate(today),
    readLogsByDate(yesterday)
  ])

  // 只统计页面访问（HTML 请求，排除静态资源）
  const todayPageViews = todayLogs.filter((e) => e.isPage)
  const yesterdayPageViews = yesterdayLogs.filter((e) => e.isPage)

  const todayUvSet = new Set(todayPageViews.map(getVisitorKey))
  const yesterdayUvSet = new Set(yesterdayPageViews.map(getVisitorKey))

  // 统计历史总 PV（读取所有日志文件）
  let totalPv = todayPageViews.length + yesterdayPageViews.length
  let totalUvSet = new Set([...todayPageViews.map(getVisitorKey), ...yesterdayPageViews.map(getVisitorKey)])

  const files = fs.existsSync(LOG_DIR)
    ? fs.readdirSync(LOG_DIR).filter((f) => f.match(/^access-\d{4}-\d{2}-\d{2}\.log$/))
    : []

  for (const file of files) {
    const match = file.match(/^access-(\d{4})-(\d{2})-(\d{2})\.log$/)
    if (!match) continue
    const fileDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    const fileStart = fileDate.getTime()
    const fileEnd = fileStart + 24 * 60 * 60 * 1000
    if (fileStart === todayStart || fileStart === yesterdayStart) continue
    const entries = await readLogsByDate(fileDate)
    const pageEntries = entries.filter((e) => e.isPage)
    totalPv += pageEntries.length
    for (const e of pageEntries) {
      totalUvSet.add(getVisitorKey(e))
    }
  }

  return {
    todayPv: todayPageViews.length,
    todayUv: todayUvSet.size,
    yesterdayPv: yesterdayPageViews.length,
    yesterdayUv: yesterdayUvSet.size,
    totalPv,
    totalUv: totalUvSet.size,
    updatedAt: new Date().toISOString()
  }
}

/**
 * 获取热门页面
 */
export async function getTopPages(days = 7, limit = 20) {
  const pageMap = new Map()
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const entries = await readLogsByDate(d)
    for (const e of entries) {
      if (!e.isPage) continue
      const path = e.path || '/'
      pageMap.set(path, (pageMap.get(path) || 0) + 1)
    }
  }

  return Array.from(pageMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * 获取地域分布
 */
export async function getGeoDistribution(days = 7) {
  const geoMap = new Map()
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const entries = await readLogsByDate(d)
    for (const e of entries) {
      if (!e.isPage) continue
      // 国内：优先用省，直辖市省为空则用市；国外：用国家名
      let key
      if (!e.country) {
        key = '未知'
      } else if (e.country === '内网') {
        key = '内网/本地'
      } else if (e.country === '中国') {
        key = e.region || e.city || '中国'
      } else {
        key = e.country
      }
      geoMap.set(key, (geoMap.get(key) || 0) + 1)
    }
  }

  return Array.from(geoMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

/**
 * 获取最近访问记录
 */
export async function getRecentVisits(limit = 50) {
  const today = new Date()
  const allEntries = []

  // 从今天和昨天的日志中收集
  for (let i = 0; i < 2; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const entries = await readLogsByDate(d)
    allEntries.push(...entries.filter((e) => e.isPage))
  }

  return allEntries
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, limit)
}

/**
 * 获取按小时分布的访问趋势
 */
export async function getHourlyTrend() {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const hourly = new Array(24).fill(0)
  const entries = await readLogsByDate(today)

  for (const e of entries) {
    if (!e.isPage) continue
    const hour = new Date(e.ts).getHours()
    hourly[hour]++
  }

  return hourly.map((count, hour) => ({ hour, count }))
}
