// 活动计算器 —— 纯函数计算引擎
//
// 模型（基于「今天」的真实进度推算）：
//   用户填入「当前已有点数」（今天的真实存量，已包含活动开始至今的每日 / 周任务奖励）。
//   从「今天」起逐日模拟未来：每日获得 = 每日任务点数 + 游玩点数（分钟 × 每分钟经验）；
//   周任务在各自发布日（且 ≥ 今天）一次性发放。满级 = 累计点数 ≥ 满级所需总点数。
//   活动开始到昨天之间的天数已被「当前已有点数」吸收，不再重复累加。
//
// 所有日期均为本地 0 点，避免时区误差。

export function parseDate(s) {
  if (s instanceof Date) {
    return new Date(s.getFullYear(), s.getMonth(), s.getDate())
  }
  const parts = String(s).split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + n)
  return d
}

export function daysBetween(a, b) {
  const da = parseDate(a)
  const db = parseDate(b)
  return Math.round((db - da) / 86400000)
}

export function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// 活动窗口天数（含首尾）
export function dayCount(startS, endS) {
  if (!startS || !endS) return 0
  return Math.max(0, daysBetween(startS, endS) + 1)
}

// 模拟起点：活动已开始则 = 今天（截断到活动窗口内），未开始则 = 活动开始日
function resolveSimStart(event, today) {
  const start = parseDate(event.startDate)
  const end = parseDate(event.endDate)
  const t = startOfDay(today)
  if (t <= start) return start
  if (t > end) return end
  return t
}

// 在「从 simStart 起、每天游玩 playMinutes 分钟」假设下，逐日模拟未来并返回数据源
// 返回 { days, reachDate, reachIndex, reachedByEnd, daysToReach, reachOnTime }
export function projectDays(event, playMinutes, startXp, simStart) {
  const start = parseDate(simStart)
  const end = parseDate(event.endDate)
  const dailyPoints = Number(event.dailyPoints) || 0
  const xpPerMinute = Number(event.xpPerMinute) || 1
  const target = Number(event.targetTotal) || 0

  const weeklyMap = {}
  for (const t of (event.weeklyTasks || [])) {
    const k = fmtDate(parseDate(t.date))
    weeklyMap[k] = (weeklyMap[k] || 0) + (Number(t.points) || 0)
  }

  const perDayPlay = (Number(playMinutes) || 0) * xpPerMinute
  const perDayBase = dailyPoints + perDayPlay

  let xp = startXp
  let reachDate = null
  let reachIndex = -1
  const days = []
  let i = 0
  let date = start
  while (date <= end && i < 800) {
    const k = fmtDate(date)
    const wk = weeklyMap[k] || 0
    const dayGain = perDayBase + wk
    xp += dayGain
    const isReach = reachDate == null && target > 0 && xp >= target
    if (isReach) {
      reachDate = date
      reachIndex = i
    }
    days.push({
      date,
      dateKey: k,
      dayNum: date.getDate(),
      dayGain,
      cumulative: xp,
      weekly: wk,
      isReach,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    })
    date = addDays(date, 1)
    i++
  }

  return {
    days,
    reachDate,
    reachIndex,
    reachedByEnd: reachDate != null,
    daysToReach: reachIndex >= 0 ? reachIndex + 1 : null, // 从「今天」起第几天达标
    reachOnTime: reachDate != null && reachDate <= end
  }
}

// 汇总计算：输入活动配置 + 今天日期，输出满级相关结论
export function computeEvent(event, today = new Date()) {
  today = startOfDay(today)
  const dailyPoints = Number(event.dailyPoints) || 0
  const xpPerMinute = Number(event.xpPerMinute) || 1
  const gameMinutes = Number(event.gameMinutes) || 10
  const target = Number(event.targetTotal) || 0
  const currentPoints = Number(event.currentPoints) || 0

  const simStart = resolveSimStart(event, today)
  const end = parseDate(event.endDate)
  const futureDays = Math.max(0, daysBetween(simStart, end) + 1) // 含今天

  // 未来周任务：仅统计发布日 ≥ 模拟起点（今天）的周任务
  const futureWeeklyTotal = (event.weeklyTasks || [])
    .filter((t) => parseDate(t.date) >= simStart)
    .reduce((s, t) => s + (Number(t.points) || 0), 0)
  const futureDailyTotal = dailyPoints * futureDays
  const futureTaskTotal = futureDailyTotal + futureWeeklyTotal

  const needTotal = Math.max(0, target - currentPoints - futureTaskTotal)
  const playMinutesTotal = needTotal / xpPerMinute
  const playHoursTotal = playMinutesTotal / 60
  const gamesTotal = playMinutesTotal > 0 ? Math.ceil(playMinutesTotal / gameMinutes) : 0
  const tasksAloneEnough = currentPoints + futureTaskTotal >= target && target > 0
  const alreadyMaxed = currentPoints >= target

  // 两种投影：当前每日游玩分钟 / 仅任务（0 游玩）；均从「当前已有点数」起算
  const withPlay = projectDays(event, Number(event.dailyPlayMinutes) || 0, currentPoints, simStart)
  const tasksOnly = projectDays(event, 0, currentPoints, simStart)

  // 若想活动结束前均匀满级，每天需玩多少分钟
  let dailyMinutesNeeded = 0
  if (target > currentPoints + futureTaskTotal && futureDays > 0) {
    const perDayPlayNeeded = (target - currentPoints - futureTaskTotal) / futureDays
    dailyMinutesNeeded = Math.ceil(perDayPlayNeeded / xpPerMinute)
  }

  // 按当前每日游玩分钟，活动结束时的累计点数（用于判断是否够）
  const endCumulative = withPlay.days.length
    ? withPlay.days[withPlay.days.length - 1].cumulative
    : currentPoints
  const shortBy = target > endCumulative ? target - endCumulative : 0

  const rewardTiers = computeRewardTiers(event, currentPoints, simStart, withPlay.days)

  return {
    count: futureDays,
    totalDays: dayCount(event.startDate, event.endDate),
    hasWindow: dayCount(event.startDate, event.endDate) > 0,
    simStart,
    today,
    dailyPoints,
    futureDailyTotal,
    futureWeeklyTotal,
    futureTaskTotal,
    target,
    currentPoints,
    needTotal,
    playMinutesTotal,
    playHoursTotal,
    gamesTotal,
    tasksAloneEnough,
    alreadyMaxed,
    xpPerMinute,
    gameMinutes,
    dailyPlayMinutes: Number(event.dailyPlayMinutes) || 0,
    withPlay,
    tasksOnly,
    dailyMinutesNeeded,
    endCumulative,
    shortBy,
    rewardTiers
  }
}

// 计算每档奖励里程碑的达成日：
//   当前已有点数已 ≥ 该档 → 视为今天已达（已领取）
//   否则在「含游玩」逐日投影中找到首个累计 ≥ 该档 xp 的那天
// 返回 [{ xp, label, no, reachDate, dayIndex, reached, already }]
function computeRewardTiers(event, currentPoints, simStart, withPlayDays) {
  const tiers = event.rewardTiers || []
  return tiers.map((t, i) => {
    const xp = Number(t.xp) || 0
    const label = t.label || `奖励${i + 1}`
    const no = i + 1
    if (xp > 0 && currentPoints >= xp) {
      return { xp, label, no, reachDate: simStart, dayIndex: 0, reached: true, already: true }
    }
    const idx = withPlayDays.findIndex((d) => d.cumulative >= xp)
    if (idx >= 0) {
      return { xp, label, no, reachDate: withPlayDays[idx].date, dayIndex: idx, reached: true, already: false }
    }
    return { xp, label, no, reachDate: null, dayIndex: -1, reached: false, already: false }
  })
}
