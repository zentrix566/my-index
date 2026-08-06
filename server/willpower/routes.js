/**
 * 「抵御域外心魔」业务路由，统一挂在 /api/willpower 下。
 * 认证已并入站点主账号体系（../auth.js 的 requireAuth，基于 site_token Cookie）；
 * 本文件只处理心魔、抵御记录、成就、正能量记录与看板。
 */
import express from 'express'
import crypto from 'node:crypto'
import { appLog } from '../logger.js'
import { requireAuth } from '../auth.js'
import {
  BUILTIN_ACTIVITIES,
  BUILTIN_DEMONS,
  DEFAULT_HOLD_SECONDS,
  RULE_TYPES,
  WILLPOWER_TIME_ZONE,
  getBuiltinActivity,
  getBuiltinDemon,
  isBuiltinActivity,
  isBuiltinDemon
} from './catalog.js'
import {
  buildOverview,
  maskHiddenAchievements,
  recalcAchievements,
  todayKey,
  zonedParts
} from './achievements.js'
import {
  nowIso,
  createCustomAchievement,
  createPositiveLog,
  createResistance,
  deleteCustomAchievement,
  deleteDemon,
  deletePositiveActivity,
  deletePositiveLog,
  deleteResistance,
  getResistanceById,
  getWillpowerAiUsage,
  getCachedAiReport,
  getPositiveLogById,
  updateResistance,
  updatePositiveLog,
  listAllResistances,
  listCachedAiReports,
  listCustomAchievements,
  listPendingResistances,
  listPositiveActivities,
  listPositiveLogs,
  listResistances,
  listUserDemons,
  releaseWillpowerAiUsage,
  reorderDemons,
  reserveWillpowerAiUsage,
  resolveResistance,
  saveAiReport,
  upsertDemon,
  upsertPositiveActivity
} from './db.js'
import { callDeepSeek } from '../ai-advisor.js'

const router = express.Router()

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/
const MAX_NOTE_LENGTH = 200
const MAX_HOLD_SECONDS = 12 * 60 * 60

function randomKey(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`
}

/**
 * 合并内置心魔与用户自定义/覆盖项。
 * 用户可以给内置心魔改名或归档，也可以新增完全自定义的心魔。
 */
async function loadDemons(userId) {
  const rows = await listUserDemons(userId)
  const overrides = new Map(rows.map((row) => [row.demon_key, row]))
  const merged = []

  for (const builtin of BUILTIN_DEMONS) {
    const override = overrides.get(builtin.demonKey)
    merged.push({
      demonKey: builtin.demonKey,
      name: override?.name || builtin.name,
      emoji: override?.emoji || builtin.emoji,
      color: override?.color || builtin.color,
      description: override?.description ?? builtin.description,
      builtin: true,
      archived: Boolean(override?.archived),
      sortOrder: Number(override?.sort_order) || 0
    })
  }
  for (const row of rows) {
    if (isBuiltinDemon(row.demon_key)) continue
    merged.push({
      demonKey: row.demon_key,
      name: row.name,
      emoji: row.emoji || '👹',
      color: row.color || '#7c3aed',
      description: row.description || '',
      builtin: false,
      archived: Boolean(row.archived),
      sortOrder: Number(row.sort_order) || 0
    })
  }
  // 自定义心魔按 sort_order 升序排在前；归档的心魔统一沉底
  merged.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
  return merged
}

/**
 * 合并内置正能量活动与用户自定义/覆盖项（镜像 loadDemons）。
 */
async function loadActivities(userId) {
  const rows = await listPositiveActivities(userId)
  const overrides = new Map(rows.map((row) => [row.activity_key, row]))
  const merged = []

  for (const builtin of BUILTIN_ACTIVITIES) {
    const override = overrides.get(builtin.activityKey)
    merged.push({
      activityKey: builtin.activityKey,
      name: override?.name || builtin.name,
      emoji: override?.emoji || builtin.emoji,
      unit: override?.unit || builtin.unit,
      inputMode: override?.input_mode || builtin.inputMode || 'count',
      builtin: true,
      archived: Boolean(override?.archived)
    })
  }
  for (const row of rows) {
    if (isBuiltinActivity(row.activity_key)) continue
    merged.push({
      activityKey: row.activity_key,
      name: row.name,
      emoji: row.emoji || '🌱',
      unit: row.unit || '',
      inputMode: row.input_mode || 'count',
      builtin: false,
      archived: Boolean(row.archived)
    })
  }
  // 归档的活动沉底，其余按 sort_order 升序
  merged.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
  return merged
}

/**
 * 计时挑战到点后自动判定成功——这正是「开始计时，默认 10 分钟后算扛住」的落地点。
 * 所有读接口都会先跑一遍，保证前端拿到的永远是已结算的数据。
 */
async function settleDueResistances(userId) {
  const pending = await listPendingResistances(userId)
  const now = Date.now()
  const settled = []
  for (const row of pending) {
    const dueAt = new Date(row.started_at).getTime() + Number(row.duration_sec || 0) * 1000
    if (dueAt <= now) {
      const updated = await resolveResistance(userId, row.id, 'success', nowIso(dueAt))
      if (updated) settled.push(updated)
    }
  }
  return settled
}

function serializeResistance(row) {
  return {
    id: row.id,
    demonKey: row.demon_key,
    status: row.status,
    mode: row.mode,
    durationSec: Number(row.duration_sec),
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    note: row.note || ''
  }
}

function serializePositive(row, inputMode) {
  return {
    id: row.id,
    activityKey: row.activity_key,
    name: row.name,
    amount: Number(row.amount),
    unit: row.unit || '',
    inputMode: inputMode || 'count',
    note: row.note || '',
    happenedAt: row.happened_at
  }
}

// ========== 目录：心魔 / 正能量活动 / 可用规则 ==========

router.get('/catalog', (req, res) => {
  res.json({
    demons: BUILTIN_DEMONS,
    activities: BUILTIN_ACTIVITIES,
    ruleTypes: Object.entries(RULE_TYPES)
      .filter(([, meta]) => meta.customizable)
      .map(([type, meta]) => ({ type, ...meta })),
    defaultHoldSeconds: DEFAULT_HOLD_SECONDS,
    timeZone: WILLPOWER_TIME_ZONE
  })
})

router.get('/demons', requireAuth, async (req, res) => {
  try {
    res.json({ demons: await loadDemons(req.userId) })
  } catch (err) {
    appLog('ERROR', `心魔列表读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

router.post('/demons', requireAuth, async (req, res) => {
  const { name, emoji, color, description } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 12) {
    return res.status(400).json({ error: '心魔名称需 1-12 个字符' })
  }
  try {
    const existing = await listUserDemons(req.userId)
    const customCount = existing.filter((row) => !isBuiltinDemon(row.demon_key)).length
    if (customCount >= 30) return res.status(400).json({ error: '自定义心魔最多 30 个' })

    const row = await upsertDemon(req.userId, {
      demonKey: randomKey('c'),
      name: name.trim(),
      emoji: typeof emoji === 'string' && emoji ? emoji.slice(0, 4) : '👹',
      color: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#7c3aed',
      description: typeof description === 'string' ? description.slice(0, 100) : '',
      isBuiltin: false,
      archived: false
    })
    res.json({ ok: true, demon: { demonKey: row.demon_key, name: row.name, emoji: row.emoji, color: row.color, description: row.description || '', builtin: false, archived: false } })
  } catch (err) {
    appLog('ERROR', `新增心魔失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.patch('/demons/:demonKey', requireAuth, async (req, res) => {
  const { demonKey } = req.params
  if (!KEY_PATTERN.test(demonKey)) return res.status(400).json({ error: '心魔标识非法' })
  const { name, emoji, color, description, archived } = req.body || {}
  try {
    const builtin = getBuiltinDemon(demonKey)
    const rows = await listUserDemons(req.userId)
    const current = rows.find((row) => row.demon_key === demonKey)
    if (!builtin && !current) return res.status(404).json({ error: '心魔不存在' })

    const row = await upsertDemon(req.userId, {
      demonKey,
      name: (typeof name === 'string' && name.trim()) || current?.name || builtin?.name,
      emoji: (typeof emoji === 'string' && emoji) || current?.emoji || builtin?.emoji,
      color: (typeof color === 'string' && color) || current?.color || builtin?.color,
      description:
        typeof description === 'string' ? description.slice(0, 100) : current?.description ?? builtin?.description,
      isBuiltin: Boolean(builtin),
      archived: archived === undefined ? Boolean(current?.archived) : Boolean(archived)
    })
    res.json({ ok: true, demon: { demonKey: row.demon_key, name: row.name, emoji: row.emoji, color: row.color, description: row.description || '', builtin: Boolean(builtin), archived: Boolean(row.archived) } })
  } catch (err) {
    appLog('ERROR', `更新心魔失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/demons/:demonKey', requireAuth, async (req, res) => {
  const { demonKey } = req.params
  if (isBuiltinDemon(demonKey)) {
    return res.status(400).json({ error: '内置心魔不能删除，可以选择归档' })
  }
  try {
    const removed = await deleteDemon(req.userId, demonKey)
    if (!removed) return res.status(404).json({ error: '心魔不存在' })
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除心魔失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

/** 拖拽排序：提交心魔的期望顺序（demonKey 数组，含内置与自定义），归档项始终沉底。 */
router.post('/demons/reorder', requireAuth, async (req, res) => {
  const keys = req.body?.keys
  if (!Array.isArray(keys)) return res.status(400).json({ error: 'keys 需为数组' })
  try {
    await reorderDemons(req.userId, keys)
    res.json({ ok: true, demons: await loadDemons(req.userId) })
  } catch (err) {
    appLog('ERROR', `心魔排序失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// ========== 抵御记录 ==========

router.get('/resistances', requireAuth, async (req, res) => {
  try {
    await settleDueResistances(req.userId)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200)
    const rows = await listResistances(req.userId, limit)
    res.json({ resistances: rows.map(serializeResistance) })
  } catch (err) {
    appLog('ERROR', `抵御记录读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

/**
 * 新建抵御记录。
 * mode=timer：只记开始时间，坚持满 durationSec 自动判成功（默认 10 分钟）
 * mode=quick + result=success：直接记一次「已抵御」
 * mode=quick + result=failed：直接记一次「破防了」
 */
router.post('/resistances', requireAuth, async (req, res) => {
  const { demonKey, mode, note, durationSec, result } = req.body || {}
  if (typeof demonKey !== 'string' || !KEY_PATTERN.test(demonKey)) {
    return res.status(400).json({ error: '请选择心魔' })
  }
  const safeMode = mode === 'timer' ? 'timer' : 'quick'
  const quickStatus = result === 'failed' ? 'failed' : 'success'
  const safeNote = typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : ''
  const safeDuration =
    safeMode === 'timer'
      ? Math.min(Math.max(parseInt(durationSec, 10) || DEFAULT_HOLD_SECONDS, 60), MAX_HOLD_SECONDS)
      : 0

  try {
    const demons = await loadDemons(req.userId)
    if (!demons.some((item) => item.demonKey === demonKey)) {
      return res.status(400).json({ error: '心魔不存在' })
    }
    if (safeMode === 'timer') {
      const pending = await listPendingResistances(req.userId)
      if (pending.length >= 5) {
        return res.status(400).json({ error: '同时进行的挑战不能超过 5 个' })
      }
    }

    const startedAt = nowIso()
    const row = await createResistance(req.userId, {
      demonKey,
      status: safeMode === 'timer' ? 'pending' : quickStatus,
      mode: safeMode,
      intensity: 0,
      durationSec: safeDuration,
      startedAt,
      resolvedAt: safeMode === 'timer' ? null : startedAt,
      note: safeNote
    })

    // 快速记录立即触发成就重算；计时挑战等结算后再算
    let newlyUnlocked = []
    if (safeMode !== 'timer') {
      newlyUnlocked = (await recalcAchievements(req.userId)).newlyUnlocked
    }
    res.json({ ok: true, resistance: serializeResistance(row), newlyUnlocked })
  } catch (err) {
    appLog('ERROR', `新增抵御记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

/** 手动结算计时挑战：扛住了（success）或者破防了（failed）。 */
router.post('/resistances/:id/resolve', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '记录不存在' })
  const result = req.body?.result === 'failed' ? 'failed' : 'success'
  try {
    const current = await getResistanceById(req.userId, id)
    if (!current) return res.status(404).json({ error: '记录不存在' })
    if (current.status !== 'pending') {
      return res.status(400).json({ error: '该记录已结算' })
    }
    const row = await resolveResistance(req.userId, id, result, nowIso())
    const { newlyUnlocked } = await recalcAchievements(req.userId)
    res.json({ ok: true, resistance: serializeResistance(row), newlyUnlocked })
  } catch (err) {
    appLog('ERROR', `结算抵御记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/resistances/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '记录不存在' })
  try {
    const removed = await deleteResistance(req.userId, id)
    if (!removed) return res.status(404).json({ error: '记录不存在' })
    await recalcAchievements(req.userId)
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除抵御记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

/** 编辑已结算的抵御记录：可改心魔 / 结果 / 备注 / 时间。改结果会触发成就重算。 */
router.patch('/resistances/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '记录不存在' })
  const { demonKey, status, note, startedAt } = req.body || {}
  try {
    const current = await getResistanceById(req.userId, id)
    if (!current) return res.status(404).json({ error: '记录不存在' })
    if (current.status === 'pending') {
      return res.status(400).json({ error: '进行中的挑战请先结算，不能直接编辑' })
    }
    const patch = {}
    if (demonKey !== undefined) {
      if (typeof demonKey !== 'string' || !KEY_PATTERN.test(demonKey)) {
        return res.status(400).json({ error: '心魔标识非法' })
      }
      const demons = await loadDemons(req.userId)
      if (!demons.some((d) => d.demonKey === demonKey)) {
        return res.status(400).json({ error: '心魔不存在' })
      }
      patch.demonKey = demonKey
    }
    if (status !== undefined) {
      if (!['success', 'failed'].includes(status)) return res.status(400).json({ error: '结果非法' })
      patch.status = status
    }
    if (note !== undefined) patch.note = typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : ''
    if (startedAt !== undefined) {
      const d = new Date(startedAt)
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: '时间格式非法' })
      // 客户端统一传北京时间 ISO（带 +08:00）；缺失偏移时按北京时间补全，避免被当成本地时区。
      patch.startedAt = /[zZ]|[+-]\d{2}:?\d{2}$/.test(startedAt) ? startedAt : `${startedAt}+08:00`
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: '没有可更新的内容' })
    const row = await updateResistance(req.userId, id, patch)
    await recalcAchievements(req.userId)
    res.json({ ok: true, resistance: serializeResistance(row) })
  } catch (err) {
    appLog('ERROR', `编辑抵御记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

/**
 * 日历里点某一天时用：返回这天的全部抵御记录与正能量记录。
 * 自然日按统计时区（默认北京时间）切分，而不是 UTC。
 */
router.get('/days/:date', requireAuth, async (req, res) => {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
  try {
    await settleDueResistances(req.userId)
    const [rows, positiveRows, activities] = await Promise.all([
      listAllResistances(req.userId),
      listPositiveLogs(req.userId, 5000),
      loadActivities(req.userId)
    ])
    const actMap = new Map(activities.map((item) => [item.activityKey, item]))
    const sameDay = rows.filter((row) => zonedParts(row.started_at).dateKey === date)
    const positives = positiveRows.filter((row) => zonedParts(row.happened_at).dateKey === date)
    res.json({
      date,
      resistances: sameDay
        .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
        .map(serializeResistance),
      positives: positives.map((row) => serializePositive(row, actMap.get(row.activity_key)?.inputMode)),
      summary: {
        success: sameDay.filter((row) => row.status === 'success').length,
        fail: sameDay.filter((row) => row.status === 'failed').length,
        pending: sameDay.filter((row) => row.status === 'pending').length,
        positive: positives.length
      }
    })
  } catch (err) {
    appLog('ERROR', `单日明细读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

// ========== 正能量记录 ==========

router.get('/positives', requireAuth, async (req, res) => {
  try {
    const [rows, activities] = await Promise.all([
      listPositiveLogs(req.userId, 200),
      loadActivities(req.userId)
    ])
    const actMap = new Map(activities.map((item) => [item.activityKey, item]))
    res.json({ positives: rows.map((row) => serializePositive(row, actMap.get(row.activity_key)?.inputMode)) })
  } catch (err) {
    appLog('ERROR', `正能量记录读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

router.post('/positives', requireAuth, async (req, res) => {
  const { activityKey, name, amount, unit, note } = req.body || {}
  if (typeof activityKey !== 'string' || !KEY_PATTERN.test(activityKey)) {
    return res.status(400).json({ error: '请选择正能量项目' })
  }
  const builtin = BUILTIN_ACTIVITIES.find((item) => item.activityKey === activityKey)
  const safeName = (typeof name === 'string' && name.trim()) || builtin?.name
  if (!safeName || safeName.length > 20) return res.status(400).json({ error: '项目名称非法' })
  const activity = await loadActivities(req.userId)
  const act = activity.find((item) => item.activityKey === activityKey)
  if (!act) return res.status(400).json({ error: '请选择正能量项目' })
  const safeAmount = Number(amount)
  if (!Number.isFinite(safeAmount) || safeAmount < 0 || safeAmount > 100000) {
    return res.status(400).json({ error: '数量需在 0-100000 之间' })
  }
  try {
    const row = await createPositiveLog(req.userId, {
      activityKey,
      name: safeName,
      amount: safeAmount,
      unit: (typeof unit === 'string' && unit.slice(0, 8)) || builtin?.unit || '',
      note: typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : '',
      happenedAt: nowIso()
    })
    const { newlyUnlocked } = await recalcAchievements(req.userId)
    res.json({ ok: true, positive: serializePositive(row, act.inputMode), newlyUnlocked })
  } catch (err) {
    appLog('ERROR', `新增正能量记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/positives/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '记录不存在' })
  try {
    const removed = await deletePositiveLog(req.userId, id)
    if (!removed) return res.status(404).json({ error: '记录不存在' })
    await recalcAchievements(req.userId)
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除正能量记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

/** 编辑正能量记录：可改项目 / 数量 / 备注 / 时间。改项目或数量会触发成就重算。 */
router.patch('/positives/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '记录不存在' })
  const { activityKey, amount, note, happenedAt } = req.body || {}
  try {
    const current = await getPositiveLogById(req.userId, id)
    if (!current) return res.status(404).json({ error: '记录不存在' })
    const patch = {}
    if (activityKey !== undefined) {
      if (typeof activityKey !== 'string' || !KEY_PATTERN.test(activityKey)) {
        return res.status(400).json({ error: '项目标识非法' })
      }
      const acts = await loadActivities(req.userId)
      const act = acts.find((a) => a.activityKey === activityKey)
      if (!act) return res.status(400).json({ error: '项目不存在' })
      patch.activityKey = activityKey
      patch.name = act.name
      patch.unit = act.inputMode === 'count' ? act.unit || '' : ''
    }
    if (amount !== undefined) {
      const n = Number(amount)
      if (!Number.isFinite(n) || n < 0 || n > 100000) {
        return res.status(400).json({ error: '数量需在 0-100000 之间' })
      }
      patch.amount = n
    }
    if (note !== undefined) patch.note = typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : ''
    if (happenedAt !== undefined) {
      const d = new Date(happenedAt)
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: '时间格式非法' })
      // 客户端统一传北京时间 ISO（带 +08:00）；缺失偏移时按北京时间补全。
      patch.happenedAt = /[zZ]|[+-]\d{2}:?\d{2}$/.test(happenedAt) ? happenedAt : `${happenedAt}+08:00`
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: '没有可更新的内容' })
    const row = await updatePositiveLog(req.userId, id, patch)
    await recalcAchievements(req.userId)
    const actMap = new Map((await loadActivities(req.userId)).map((a) => [a.activityKey, a]))
    res.json({ ok: true, positive: serializePositive(row, actMap.get(row.activity_key)?.inputMode) })
  } catch (err) {
    appLog('ERROR', `编辑正能量记录失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// ========== 正能量活动（可配置类型）==========

router.get('/activities', requireAuth, async (req, res) => {
  try {
    res.json({ activities: await loadActivities(req.userId) })
  } catch (err) {
    appLog('ERROR', `正能量活动读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

router.post('/activities', requireAuth, async (req, res) => {
  const { name, emoji, unit, inputMode } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 12) {
    return res.status(400).json({ error: '活动名称需 1-12 个字符' })
  }
  const safeMode = inputMode === 'duration' ? 'duration' : 'count'
  try {
    const existing = await listPositiveActivities(req.userId)
    const customCount = existing.filter((row) => !isBuiltinActivity(row.activity_key)).length
    if (customCount >= 30) return res.status(400).json({ error: '自定义正能量活动最多 30 个' })
    const row = await upsertPositiveActivity(req.userId, {
      activityKey: randomKey('a'),
      name: name.trim(),
      emoji: typeof emoji === 'string' && emoji ? emoji.slice(0, 4) : '🌱',
      unit: safeMode === 'count' && typeof unit === 'string' ? unit.slice(0, 8) : '',
      inputMode: safeMode,
      archived: false,
      sortOrder: customCount
    })
    res.json({
      ok: true,
      activity: {
        activityKey: row.activity_key,
        name: row.name,
        emoji: row.emoji || '🌱',
        unit: row.unit || '',
        inputMode: row.input_mode,
        builtin: false,
        archived: false
      }
    })
  } catch (err) {
    appLog('ERROR', `新增正能量活动失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.patch('/activities/:activityKey', requireAuth, async (req, res) => {
  const { activityKey } = req.params
  if (!KEY_PATTERN.test(activityKey)) return res.status(400).json({ error: '活动标识非法' })
  const { name, emoji, unit, archived, inputMode } = req.body || {}
  try {
    const rows = await listPositiveActivities(req.userId)
    const current = rows.find((row) => row.activity_key === activityKey)
    const builtin = getBuiltinActivity(activityKey)
    if (!builtin && !current) return res.status(404).json({ error: '活动不存在' })
    const safeMode = inputMode === 'duration' ? 'duration' : current?.input_mode || builtin?.inputMode || 'count'
    const safeUnit = safeMode === 'count' && typeof unit === 'string' ? unit.slice(0, 8) : ''
    await upsertPositiveActivity(req.userId, {
      activityKey,
      name: (typeof name === 'string' && name.trim()) || current?.name || builtin?.name,
      emoji: (typeof emoji === 'string' && emoji) || current?.emoji || builtin?.emoji,
      unit: safeUnit || current?.unit || builtin?.unit || '',
      inputMode: safeMode,
      archived: archived === undefined ? Boolean(current?.archived) : Boolean(archived),
      sortOrder: Number(current?.sort_order) || 0
    })
    res.json({ ok: true, activities: await loadActivities(req.userId) })
  } catch (err) {
    appLog('ERROR', `更新正能量活动失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/activities/:activityKey', requireAuth, async (req, res) => {
  const { activityKey } = req.params
  if (isBuiltinActivity(activityKey)) {
    return res.status(400).json({ error: '内置活动不能删除' })
  }
  try {
    const removed = await deletePositiveActivity(req.userId, activityKey)
    if (!removed) return res.status(404).json({ error: '活动不存在' })
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除正能量活动失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// ========== 成就 ==========

router.get('/achievements', requireAuth, async (req, res) => {
  try {
    await settleDueResistances(req.userId)
    const { achievements } = await recalcAchievements(req.userId)
    const hiddenLocked = achievements.filter((item) => item.hidden && !item.unlocked).length
    res.json({
      achievements: maskHiddenAchievements(achievements),
      summary: {
        total: achievements.length,
        unlocked: achievements.filter((item) => item.unlocked).length,
        hiddenLocked,
        points: achievements
          .filter((item) => item.unlocked)
          .reduce((sum, item) => sum + (item.points || 0), 0)
      }
    })
  } catch (err) {
    appLog('ERROR', `成就读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

router.post('/achievements', requireAuth, async (req, res) => {
  const { name, description, rule, points, hidden } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 20) {
    return res.status(400).json({ error: '成就名称需 1-20 个字符' })
  }
  const ruleType = rule?.type
  if (!RULE_TYPES[ruleType]?.customizable) {
    return res.status(400).json({ error: '不支持的成就规则' })
  }
  const target = Number(rule?.target)
  if (!Number.isFinite(target) || target < 1 || target > 100000) {
    return res.status(400).json({ error: '目标数值需在 1-100000 之间' })
  }

  const safeRule = { type: ruleType, target: Math.floor(target) }
  if (['resist_count', 'time_window', 'single_day_count', 'resist_duration_minutes'].includes(ruleType)) {
    const demonKey = typeof rule.demonKey === 'string' && rule.demonKey ? rule.demonKey : '*'
    if (demonKey !== '*' && !KEY_PATTERN.test(demonKey)) {
      return res.status(400).json({ error: '心魔标识非法' })
    }
    safeRule.demonKey = demonKey
  }
  if (ruleType === 'time_window') {
    const hourFrom = Math.min(Math.max(parseInt(rule.hourFrom, 10) || 0, 0), 23)
    const rawTo = parseInt(rule.hourTo, 10)
    const hourTo = Math.min(Math.max(Number.isFinite(rawTo) ? rawTo : 24, 1), 24)
    safeRule.hourFrom = hourFrom
    safeRule.hourTo = hourTo
  }
  if (['positive_count', 'positive_amount'].includes(ruleType)) {
    const activityKey = typeof rule.activityKey === 'string' && rule.activityKey ? rule.activityKey : '*'
    if (activityKey !== '*' && !KEY_PATTERN.test(activityKey)) {
      return res.status(400).json({ error: '正能量项目标识非法' })
    }
    safeRule.activityKey = activityKey
  }

  try {
    const existing = await listCustomAchievements(req.userId)
    if (existing.length >= 50) return res.status(400).json({ error: '自定义成就最多 50 个' })
    if (existing.some((row) => row.name === name.trim())) {
      return res.status(409).json({ error: '已有同名成就' })
    }

    await createCustomAchievement(req.userId, {
      code: randomKey('u'),
      name: name.trim(),
      description: typeof description === 'string' ? description.slice(0, 100) : '',
      rule: safeRule,
      points: Math.min(Math.max(parseInt(points, 10) || 10, 1), 200),
      hidden: Boolean(hidden)
    })
    const { achievements } = await recalcAchievements(req.userId)
    res.json({ ok: true, achievements: maskHiddenAchievements(achievements) })
  } catch (err) {
    appLog('ERROR', `新增自定义成就失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/achievements/:code', requireAuth, async (req, res) => {
  const { code } = req.params
  if (!KEY_PATTERN.test(code)) return res.status(400).json({ error: '成就不存在' })
  try {
    const removed = await deleteCustomAchievement(req.userId, code)
    if (!removed) return res.status(404).json({ error: '只能删除自定义成就' })
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除自定义成就失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// ========== AI 报告（抵御心魔周报/日报/指定日期/时间段 分析）==========

/** 本地日历加法：YYYY-MM-DD 加减若干天，避免跨 UTC 边界错位。 */
function addDaysLocal(dateKey, delta) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** 把 scope 解析成 [from, to] 闭区间与中文标签。 */
function resolveReportRange(scope, date, from, to) {
  const dk = todayKey()
  const reDate = /^\d{4}-\d{2}-\d{2}$/
  if (scope === 'today') {
    return { from: dk, to: dk, label: `今天（${dk}）` }
  }
  if (scope === 'date') {
    if (!reDate.test(date || '')) return null
    return { from: date, to: date, label: `指定日期 ${date}` }
  }
  if (scope === 'last_week') {
    const dow = (new Date().getDay() + 6) % 7 // 0=周一
    const thisMonday = addDaysLocal(dk, -dow)
    const lastMonday = addDaysLocal(thisMonday, -7)
    const lastSunday = addDaysLocal(lastMonday, 6)
    return { from: lastMonday, to: lastSunday, label: `上周（${lastMonday} ~ ${lastSunday}）` }
  }
  if (scope === 'this_month') {
    const now = new Date()
    const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    return { from: first, to: dk, label: `本月（${first} ~ ${dk}）` }
  }
  if (scope === 'range') {
    if (!reDate.test(from || '') || !reDate.test(to || '')) return null
    if (from > to) return null
    return { from, to, label: `时间段（${from} ~ ${to}）` }
  }
  return null
}

/** 聚合某区间内的抵御与正能量数据，喂给模型做分析。 */
async function gatherReportData(userId, from, to) {
  const [rows, positiveRows, demonRows] = await Promise.all([
    listAllResistances(userId),
    listPositiveLogs(userId, 5000),
    loadDemons(userId)
  ])
  const inRange = (key) => key >= from && key <= to
  const demonNames = new Map(demonRows.map((item) => [item.demonKey, item]))

  const resist = rows.filter((r) => inRange(zonedParts(r.started_at).dateKey))
  const positives = positiveRows.filter((r) => inRange(zonedParts(r.happened_at).dateKey))
  const success = resist.filter((r) => r.status === 'success')
  const fail = resist.filter((r) => r.status === 'failed')
  const pending = resist.filter((r) => r.status === 'pending')

  const byDayMap = new Map()
  for (const r of resist) {
    const k = zonedParts(r.started_at).dateKey
    const e = byDayMap.get(k) || { date: k, success: 0, fail: 0 }
    if (r.status === 'success') e.success += 1
    else if (r.status === 'failed') e.fail += 1
    byDayMap.set(k, e)
  }
  const byDay = [...byDayMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1))

  const demonMap = new Map()
  for (const r of resist) {
    const e = demonMap.get(r.demon_key) || { demonKey: r.demon_key, success: 0, fail: 0 }
    if (r.status === 'success') e.success += 1
    else if (r.status === 'failed') e.fail += 1
    demonMap.set(r.demon_key, e)
  }
  const byDemon = [...demonMap.values()]
    .map((e) => ({
      name: demonNames.get(e.demonKey)?.name || e.demonKey,
      success: e.success,
      fail: e.fail
    }))
    .sort((a, b) => b.success + b.fail - (a.success + a.fail))
    .slice(0, 8)

  const total = resist.length
  const successRate = total ? Math.round((success.length / total) * 100) : 0
  const positiveTotal = positives.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  return {
    from,
    to,
    total,
    success: success.length,
    fail: fail.length,
    pending: pending.length,
    successRate,
    byDay,
    byDemon,
    positiveCount: positives.length,
    positiveTotal: Math.round(positiveTotal * 100) / 100
  }
}

/** 系统提示词：约束模型以「温和的心魔教练」口吻，基于数据给出鼓励与可执行建议。 */
function buildWillpowerReportPrompt(data, label) {
  const json = JSON.stringify(data)
  return `你是一位温和而专业的「抵御心魔」教练，帮助用户复盘他在一段时期内的自我克制表现。
下面是用户选定范围【${label}】的统计数据（JSON）：
${json}

请基于这份数据，用简洁、鼓励、有温度的中文给出分析，包含三部分：
1. 总体表现：概括这段时间的扛住/破防情况与成功率，肯定做得好的地方。
2. 关键观察：点出表现最好与最拉胯的心魔（按 byDemon），以及是否存在集中在某几天的波动。
3. 下一步建议：给出 2-3 条具体、可执行的改进动作，语气像朋友而非说教。

严格要求（务必遵守）：
- 心魔名称只能用数据里 byDemon 数组中的中文 name 字段（如「色魔」「食魔」），**绝对不要**出现英文标识（如 gluttony、lust 等），也不要写「（英文）」这样的括号补充。
- 控制在 350 字以内，使用 Markdown 排版（如 **加粗**、- 列表、- 小标题），不要编造数据里没有的信息，不要输出 JSON。`
}

const WILLPOWER_AI_DAILY = Number(process.env.WILLPOWER_AI_DAILY) || 5

/** GET /ai-report?scope=today — 返回缓存的历史报告列表或某 scope 的缓存。 */
router.get('/ai-report', requireAuth, async (req, res) => {
  const { scope } = req.query || {}
  const userId = req.userId
  try {
    if (scope) {
      // 返回指定 scope 的最近一次缓存
      const cached = await getCachedAiReport(userId, scope)
      if (!cached) return res.json({ cached: null })
      return res.json({
        cached: {
          report: cached.report,
          scope: cached.scope,
          range: { from: cached.date_from, to: cached.date_to },
          createdAt: cached.created_at
        }
      })
    }
    // 无 scope 时返回最近 N 条缓存列表
    const list = await listCachedAiReports(userId, 10)
    res.json({ reports: list.map((r) => ({ id: r.id, scope: r.scope, from: r.date_from, to: r.date_to, createdAt: r.created_at })) })
  } catch (err) {
    appLog('ERROR', `AI 报告缓存读取失败: uid=${userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败' })
  }
})

router.post('/ai-report', requireAuth, async (req, res) => {
  const { scope, date, from, to } = req.body || {}
  const range = resolveReportRange(scope, date, from, to)
  if (!range) return res.status(400).json({ error: 'scope 非法或日期参数不完整（格式需为 YYYY-MM-DD）' })
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(503).json({ error: 'AI 服务未配置（服务端缺少 DEEPSEEK_API_KEY）' })
  }

  const userId = req.userId
  const day = todayKey()
  try {
    const used = await reserveWillpowerAiUsage(userId, day, WILLPOWER_AI_DAILY)
    if (!used) {
      const usage = await getWillpowerAiUsage(userId, day)
      // 额度用完时，仍然尝试返回缓存（如果有）
      const cached = await getCachedAiReport(userId, scope)
      return res.status(429).json({
        error: `今日 AI 分析额度已用完（${WILLPOWER_AI_DAILY} 次/天），明天再来吧～`,
        quota: { used: usage, limit: WILLPOWER_AI_DAILY },
        cached: cached ? { report: cached.report, scope: cached.scope, range: { from: cached.date_from, to: cached.date_to }, createdAt: cached.created_at } : null
      })
    }
    let report
    try {
      const data = await gatherReportData(userId, range.from, range.to)
      report = await callDeepSeek(buildWillpowerReportPrompt(data, range.label), '请分析上述数据。')
    } catch (err) {
      await releaseWillpowerAiUsage(userId, day).catch(() => {})
      throw err
    }
    // 缓存报告内容，下次同一 scope 可直接读取
    try {
      await saveAiReport(userId, scope, range.from, range.to, report)
    } catch (cacheErr) {
      appLog('WARN', `AI 报告缓存写入失败（不影响响应）: uid=${userId}, error=${cacheErr?.message}`)
    }
    res.json({
      ok: true,
      report,
      range: { from: range.from, to: range.to, label: range.label },
      quota: { used, limit: WILLPOWER_AI_DAILY }
    })
  } catch (err) {
    appLog('ERROR', `AI 报告生成失败: uid=${userId}, scope=${scope}, error=${err?.message}`)
    res.status(500).json({ error: err.message || 'AI 分析失败，请稍后重试' })
  }
})

// ========== 数据看板 ==========

router.get('/overview', requireAuth, async (req, res) => {
  try {
    await settleDueResistances(req.userId)
    const { achievements, context } = await recalcAchievements(req.userId)
    const demons = await loadDemons(req.userId)
    const demonNames = new Map(demons.map((item) => [item.demonKey, item]))
    const overview = buildOverview(context)
    overview.byDemon = overview.byDemon.map((item) => ({
      ...item,
      name: demonNames.get(item.demonKey)?.name || item.demonKey,
      emoji: demonNames.get(item.demonKey)?.emoji || '👹',
      color: demonNames.get(item.demonKey)?.color || '#7c3aed'
    }))
    const pending = (await listPendingResistances(req.userId)).map(serializeResistance)
    res.json({
      overview,
      pending,
      achievementSummary: {
        total: achievements.length,
        unlocked: achievements.filter((item) => item.unlocked).length,
        points: achievements
          .filter((item) => item.unlocked)
          .reduce((sum, item) => sum + (item.points || 0), 0)
      },
      recent: (await listResistances(req.userId, 10)).map(serializeResistance)
    })
  } catch (err) {
    appLog('ERROR', `看板读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

export default router
