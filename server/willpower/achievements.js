/**
 * 成就引擎与数据看板计算。
 * 个人应用量级（单用户几千条记录），直接把全量记录读进内存计算，
 * 换来规则实现简单、跨 PG/SQLite 行为完全一致。
 */
import {
  BUILTIN_ACHIEVEMENTS,
  RULE_TYPES,
  WILLPOWER_TIME_ZONE,
  isBuiltinAchievementCode
} from './catalog.js'
import {
  listAllResistances,
  listCustomAchievements,
  listPositiveLogs,
  listUnlocks,
  upsertUnlock
} from './db.js'

/** 把 ISO 时间换算到统计时区，返回自然日键与小时。 */
export function zonedParts(iso, timeZone = WILLPOWER_TIME_ZONE) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { dateKey: '', hour: 0, weekday: 0 }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short'
  }).formatToParts(date)
  const map = {}
  for (const part of parts) map[part.type] = part.value
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday)
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    weekday: weekdayIndex < 0 ? 0 : weekdayIndex
  }
}

/** 当前统计时区下的今天。 */
export function todayKey(timeZone = WILLPOWER_TIME_ZONE) {
  return zonedParts(new Date().toISOString(), timeZone).dateKey
}

function addDays(dateKey, delta) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

/** 计时挑战的实际坚持秒数；快速记录没有时长，计 0。 */
function heldSeconds(row) {
  if (row.mode !== 'timer' || !row.resolved_at) return 0
  const seconds = (new Date(row.resolved_at).getTime() - new Date(row.started_at).getTime()) / 1000
  if (!Number.isFinite(seconds) || seconds < 0) return 0
  return Math.round(seconds)
}

/** 把库里的原始行整理成规则求值需要的形状。 */
export function buildContext(resistances, positives) {
  const successes = []
  const failures = []
  for (const row of resistances) {
    const { dateKey, hour, weekday } = zonedParts(row.started_at)
    const item = {
      id: row.id,
      demonKey: row.demon_key,
      mode: row.mode,
      startedAt: row.started_at,
      resolvedAt: row.resolved_at,
      heldSeconds: heldSeconds(row),
      dateKey,
      hour,
      weekday
    }
    if (row.status === 'success') successes.push(item)
    else if (row.status === 'failed') failures.push(item)
  }
  const positiveItems = (positives || []).map((row) => {
    const { dateKey } = zonedParts(row.happened_at)
    return {
      id: row.id,
      activityKey: row.activity_key,
      name: row.name,
      amount: Number(row.amount) || 0,
      unit: row.unit,
      happenedAt: row.happened_at,
      dateKey
    }
  })
  return { successes, failures, positives: positiveItems }
}

function countByDay(items) {
  const map = new Map()
  for (const item of items) map.set(item.dateKey, (map.get(item.dateKey) || 0) + 1)
  return map
}

/** 历史最长连续天数（成就用），以及截至今天的当前连续天数（看板用）。 */
export function computeStreaks(successes) {
  const days = [...new Set(successes.map((item) => item.dateKey))].filter(Boolean).sort()
  if (!days.length) return { longest: 0, current: 0 }
  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] === addDays(days[i - 1], 1)) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }
  const today = todayKey()
  const yesterday = addDays(today, -1)
  const last = days[days.length - 1]
  let current = 0
  if (last === today || last === yesterday) {
    current = 1
    for (let i = days.length - 1; i > 0; i -= 1) {
      if (days[i - 1] === addDays(days[i], -1)) current += 1
      else break
    }
  }
  return { longest, current }
}

/**
 * 求某条规则的当前进度。
 * @returns {{ progress: number, target: number }} progress 可超过 target，展示时自行截断
 */
export function evaluateRule(rule, ctx) {
  const target = Math.max(1, Number(rule?.target) || 1)
  const matchDemon = (item) =>
    !rule.demonKey || rule.demonKey === '*' || item.demonKey === rule.demonKey
  const matchActivity = (item) =>
    !rule.activityKey || rule.activityKey === '*' || item.activityKey === rule.activityKey

  switch (rule?.type) {
    case 'resist_count':
      return { progress: ctx.successes.filter(matchDemon).length, target }

    case 'time_window': {
      const from = Number(rule.hourFrom) || 0
      const to = Number(rule.hourTo)
      const end = Number.isFinite(to) ? to : 24
      // 支持跨零点窗口（如 22 点到 2 点）
      const inWindow = (hour) => (from <= end ? hour >= from && hour < end : hour >= from || hour < end)
      return {
        progress: ctx.successes.filter((item) => matchDemon(item) && inWindow(item.hour)).length,
        target
      }
    }

    case 'single_day_count': {
      const perDay = countByDay(ctx.successes.filter(matchDemon))
      const max = perDay.size ? Math.max(...perDay.values()) : 0
      return { progress: max, target }
    }

    case 'resist_streak_days':
      return { progress: computeStreaks(ctx.successes).longest, target }

    case 'resist_duration_minutes': {
      const seconds = ctx.successes
        .filter(matchDemon)
        .reduce((sum, item) => sum + item.heldSeconds, 0)
      return { progress: Math.floor(seconds / 60), target }
    }

    case 'recover_after_fail': {
      const failDays = new Map()
      for (const item of ctx.failures) {
        const previous = failDays.get(item.dateKey)
        if (!previous || item.startedAt < previous) failDays.set(item.dateKey, item.startedAt)
      }
      const recovered = new Set()
      for (const item of ctx.successes) {
        const failAt = failDays.get(item.dateKey)
        if (failAt && item.startedAt > failAt) recovered.add(item.dateKey)
      }
      return { progress: recovered.size, target }
    }

    case 'positive_count':
      return { progress: ctx.positives.filter(matchActivity).length, target }

    case 'positive_amount': {
      const total = ctx.positives
        .filter(matchActivity)
        .reduce((sum, item) => sum + item.amount, 0)
      return { progress: Math.floor(total * 100) / 100, target }
    }

    default:
      return { progress: 0, target }
  }
}

/** 自定义成就行 → 与内置成就同构的定义对象。 */
export function normalizeCustomAchievement(row) {
  let rule = {}
  try {
    rule = JSON.parse(row.rule_json)
  } catch {
    rule = { type: 'resist_count', demonKey: '*', target: 1 }
  }
  return {
    code: row.code,
    name: row.name,
    description: row.description || '',
    tier: row.hidden ? '隐藏' : '自定义',
    points: Number(row.points) || 10,
    hidden: Boolean(row.hidden),
    hint: row.hidden ? '你自己设下的隐藏目标' : '',
    rule,
    custom: true
  }
}

/**
 * 重算某用户全部成就进度并落库。
 * @returns {Promise<{ achievements: object[], newlyUnlocked: object[], context: object }>}
 */
export async function recalcAchievements(userId) {
  const [resistances, positives, customRows, unlockRows] = await Promise.all([
    listAllResistances(userId),
    listPositiveLogs(userId),
    listCustomAchievements(userId),
    listUnlocks(userId)
  ])

  const ctx = buildContext(resistances, positives)
  const previous = new Map(unlockRows.map((row) => [row.code, row]))
  const definitions = [
    ...BUILTIN_ACHIEVEMENTS.map((item) => ({ ...item, custom: false })),
    ...customRows.map(normalizeCustomAchievement)
  ]

  const achievements = []
  const newlyUnlocked = []
  const nowIso = new Date().toISOString()

  for (const definition of definitions) {
    const { progress, target } = evaluateRule(definition.rule, ctx)
    const wasUnlocked = Boolean(previous.get(definition.code)?.unlocked_at)
    const unlocked = progress >= target
    const unlockedAt = wasUnlocked ? previous.get(definition.code).unlocked_at : unlocked ? nowIso : null

    const changed =
      !previous.has(definition.code) ||
      Number(previous.get(definition.code).progress) !== progress ||
      Number(previous.get(definition.code).target) !== target ||
      (unlocked && !wasUnlocked)
    if (changed) {
      await upsertUnlock(userId, definition.code, progress, target, unlockedAt)
    }

    const view = {
      code: definition.code,
      name: definition.name,
      description: definition.description,
      tier: definition.tier || '普通',
      points: definition.points || 10,
      hidden: Boolean(definition.hidden),
      hint: definition.hint || '',
      custom: Boolean(definition.custom),
      rule: definition.rule,
      ruleLabel: RULE_TYPES[definition.rule?.type]?.label || '自定义规则',
      unit: RULE_TYPES[definition.rule?.type]?.unit || '',
      progress: Math.min(progress, target),
      rawProgress: progress,
      target,
      unlocked,
      unlockedAt
    }
    achievements.push(view)
    if (unlocked && !wasUnlocked) newlyUnlocked.push(view)
  }

  return { achievements, newlyUnlocked, context: ctx }
}

/** 隐藏成就在解锁前只暴露提示语，不泄露名称与条件。 */
export function maskHiddenAchievements(achievements) {
  return achievements.map((item) => {
    if (!item.hidden || item.unlocked) return item
    return {
      code: item.code,
      hidden: true,
      locked: true,
      custom: item.custom,
      tier: '隐藏',
      name: '？？？',
      description: item.hint || '达成特定条件后才会显现',
      hint: item.hint || '',
      points: item.points,
      progress: 0,
      target: 0,
      unlocked: false,
      unlockedAt: null
    }
  })
}

/** 个人中心数据看板所需的聚合结果。 */
export function buildOverview(ctx) {
  const today = todayKey()
  const successByDay = countByDay(ctx.successes)
  const failByDay = countByDay(ctx.failures)
  const { longest, current } = computeStreaks(ctx.successes)

  // 日历视图需要全量按天数据（成功与破防各自计数），个人量级下天数有限，直接全量返回
  const byDay = [...new Set([...successByDay.keys(), ...failByDay.keys()])]
    .filter(Boolean)
    .sort()
    .map((date) => ({
      date,
      success: successByDay.get(date) || 0,
      fail: failByDay.get(date) || 0
    }))

  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)))
  const byDemonMap = new Map()
  for (const item of ctx.successes) {
    byDemonMap.set(item.demonKey, (byDemonMap.get(item.demonKey) || 0) + 1)
  }
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  for (const item of ctx.successes) byHour[item.hour].count += 1

  const totalSuccess = ctx.successes.length
  const totalFail = ctx.failures.length
  const totalHeldMinutes = Math.floor(
    ctx.successes.reduce((sum, item) => sum + item.heldSeconds, 0) / 60
  )

  return {
    totalSuccess,
    totalFail,
    successRate: totalSuccess + totalFail ? Math.round((totalSuccess / (totalSuccess + totalFail)) * 100) : 0,
    todayCount: successByDay.get(today) || 0,
    todayFailCount: failByDay.get(today) || 0,
    weekCount: ctx.successes.filter((item) => weekKeys.has(item.dateKey)).length,
    weekFailCount: ctx.failures.filter((item) => weekKeys.has(item.dateKey)).length,
    currentStreak: current,
    longestStreak: longest,
    totalHeldMinutes,
    activeDays: successByDay.size,
    byDemon: [...byDemonMap.entries()]
      .map(([demonKey, count]) => ({ demonKey, count }))
      .sort((a, b) => b.count - a.count),
    byHour,
    byDay,
    today,
    positiveCount: ctx.positives.length,
    weekPositiveCount: ctx.positives.filter((item) => weekKeys.has(item.dateKey)).length
  }
}

export { isBuiltinAchievementCode }
