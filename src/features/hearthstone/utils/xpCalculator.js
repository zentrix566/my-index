// 战令经验计算器 —— 纯函数计算引擎
//
// 两种模式共享同一套“每天收益”模型：
//   每天经验 = (每日任务固定经验 + 每小时经验 × 每日游戏时长) × (1 + 战令加成)
//   每周额外 = 每周任务固定经验 × (1 + 战令加成)，每 7 天结算一次
//
// - 自动模式：使用官方 20% 加成下的标准值（每日 1200 / 每周 7200 / 每小时 400）作为锚点，
//   反推基础值（÷1.2）后再按所选档位（0/10/15/20%）统一乘算。默认 20% 时即回到 1200/7200/400。
// - 手动模式：用户录入基础值 + 自选战令加成（0/10/15/20%），引擎统一乘以 (1 + boost)。
//
// 正向：给定赛季结束日期 → 测算可达等级。
// 反向（一）：给定目标等级 + 当前每日时长 → 反推所需天数与截止日期（projectToLevel）。
// 反向（二）：给定目标等级 + 截止日期 → 反推每日需游戏时长（requiredHoursPerDay）。

import { cumulativeXpForLevel, levelForXp, xpForProgress, MAX_LEVEL } from '../data/rewardsTrack.js'

function toDate(value) {
  if (value instanceof Date) return value
  return new Date(value)
}

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

function daysBetween(a, b) {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db - da) / 86400000)
}

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 单模式每小时经验（无加成）= 60 ×（胜率 × 胜每分钟经验 +（1 − 胜率）× 负每分钟经验）
export function modeHourlyXp(mode) {
  const winRate = (Number(mode.winRate) || 0) / 100
  const win = Number(mode.winPerMin) || 0
  const loss = Number(mode.lossPerMin) || 0
  return 60 * (winRate * win + (1 - winRate) * loss)
}

// 手动模式多个对战模式 → 每日对战总经验（无加成，含各模式时长加权）
export function totalDailyPlayXp(modes) {
  let xp = 0
  for (const m of modes || []) xp += (Number(m.hoursPerDay) || 0) * modeHourlyXp(m)
  return xp
}

// 手动模式 → 加权“每小时经验”（用于与自动模式 / 反向推算对齐）
export function blendedPlayXpPerHour(modes) {
  let hours = 0
  let xp = 0
  for (const m of modes || []) {
    const h = Number(m.hoursPerDay) || 0
    hours += h
    xp += h * modeHourlyXp(m)
  }
  return hours > 0 ? xp / hours : 0
}

// 把手动模式的多个对战模式换算成“每小时经验”（兼容旧签名）
// modes: [{ hoursPerDay, winRate(%), winXpPerMin, lossXpPerMin }]
export function playXpPerHourFromModes(modes) {
  let perHour = 0
  for (const m of modes || []) {
    const hours = Number(m.hoursPerDay) || 0
    const winRate = (Number(m.winRate) || 0) / 100
    const winXp = Number(m.winXpPerMin) || 0
    const lossXp = Number(m.lossXpPerMin) || 0
    const xpPerMin = winRate * winXp + (1 - winRate) * lossXp
    perHour += hours * xpPerMin * 60
  }
  return perHour
}

// 核心：模拟 N 天的累计经验与分解
export function simulate(params) {
  const currentLevel = Number(params.currentLevel) || 1
  const currentPartialXp = Number(params.currentPartialXp) || 0
  const dailyQuestXp = Number(params.dailyQuestXp) || 0
  const weeklyQuestXp = Number(params.weeklyQuestXp) || 0
  const playXpPerHour = Number(params.playXpPerHour) || 0
  const boost = Number(params.boost) || 0
  const hoursPerDay = Number(params.hoursPerDay) || 0
  const days = Math.max(0, Math.floor(Number(params.days) || 0))

  const mult = 1 + boost
  const startXp = xpForProgress(currentLevel, currentPartialXp)
  const perDayBase = (dailyQuestXp + playXpPerHour * hoursPerDay) * mult
  const weekly = weeklyQuestXp * mult

  let xp = startXp
  let dailyTotal = 0
  let weeklyTotal = 0
  for (let d = 0; d < days; d++) {
    let dayXp = Math.round(perDayBase)
    if (d % 7 === 0) {
      const w = Math.round(weekly)
      dayXp += w
      weeklyTotal += w
    } else {
      dailyTotal += Math.round(perDayBase)
    }
    xp += dayXp
  }

  const level = levelForXp(xp)
  const partialIntoLevel = xp - cumulativeXpForLevel(level)
  const xpToNextLevel =
    level < MAX_LEVEL ? cumulativeXpForLevel(level + 1) - cumulativeXpForLevel(level) : 0

  return {
    startXp,
    totalXp: xp,
    gainedXp: xp - startXp,
    dailyTotal,
    weeklyTotal,
    perDay: Math.round(perDayBase),
    level,
    partialIntoLevel,
    xpToNextLevel,
    days
  }
}

// 正向：到赛季结束可达等级
export function projectToSeasonEnd(params, seasonEndDate, today = new Date()) {
  const end = toDate(seasonEndDate)
  const days = Math.max(0, daysBetween(today, end))
  const sim = simulate({ ...params, days })
  return { ...sim, days, seasonEnd: fmtDate(end), seasonEndDate: end }
}

// 反向：达到目标等级所需天数与截止日期
export function projectToLevel(params, targetLevel, seasonEndDate, today = new Date()) {
  const target = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(targetLevel) || 1)))
  const targetXp = cumulativeXpForLevel(target)
  const startXp = xpForProgress(params.currentLevel, params.currentPartialXp)
  const mult = 1 + (Number(params.boost) || 0)
  const perDayBase = (Number(params.dailyQuestXp) + Number(params.playXpPerHour) * Number(params.hoursPerDay)) * mult
  const weekly = (Number(params.weeklyQuestXp) || 0) * mult

  let xp = startXp
  let day = 0
  const maxDays = 3650
  while (xp < targetXp && day < maxDays) {
    let dayXp = Math.round(perDayBase)
    if (day % 7 === 0) dayXp += Math.round(weekly)
    xp += dayXp
    day++
  }

  const reached = xp >= targetXp
  const deadline = addDays(today, day)
  const end = seasonEndDate ? toDate(seasonEndDate) : null
  const onTime = end ? deadline <= end : true
  const overByDays = end && deadline > end ? daysBetween(end, deadline) : 0
  const seasonDays = end ? Math.max(0, daysBetween(today, end)) : null
  const seasonEndLevel = seasonDays != null ? simulate({ ...params, days: seasonDays }).level : null

  return {
    target,
    targetXp,
    daysNeeded: reached ? day : null,
    deadline: fmtDate(deadline),
    deadlineDate: deadline,
    reached,
    onTime,
    overByDays,
    seasonEndLevel,
    finalXp: xp
  }
}

// 反向（二）：给定目标等级与截止日期，反推“每日需游戏多少小时”
// 假设各模式时长比例不变（按比例放大/缩小总时长），用加权每小时经验反解。
export function requiredHoursPerDay(params, targetLevel, deadlineDate, today = new Date()) {
  const target = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(targetLevel) || 1)))
  const startXp = xpForProgress(params.currentLevel, params.currentPartialXp)
  const targetXp = cumulativeXpForLevel(target)
  const needXp = targetXp - startXp
  const days = Math.max(0, daysBetween(today, toDate(deadlineDate)))
  const result = { target, days, impossible: false, alreadyMet: false, hoursNeeded: 0 }

  if (needXp <= 0) {
    result.alreadyMet = true
    return result
  }
  if (days <= 0) {
    result.impossible = true
    return result
  }

  const mult = 1 + (Number(params.boost) || 0)
  const dailyQuest = (Number(params.dailyQuestXp) || 0) * mult
  const weeklyQuest = (Number(params.weeklyQuestXp) || 0) * mult
  const questDailyAvg = dailyQuest + weeklyQuest / 7 // 周常按 7 天摊薄
  const needPlayDaily = needXp / days - questDailyAvg

  if (needPlayDaily <= 0) {
    result.alreadyMet = true
    return result
  }

  const perHour = Number(params.playXpPerHour) || 0
  if (perHour <= 0) {
    result.impossible = true
    return result
  }

  result.hoursNeeded = needPlayDaily / perHour
  result.questDailyAvg = questDailyAvg
  result.needPlayDaily = needPlayDaily
  return result
}

export { addDays, daysBetween, fmtDate }
