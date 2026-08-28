/**
 * 「日程管理」(Todo) 业务路由，统一挂在 /api/todo 下。
 * 认证复用站点主账号体系（../auth.js 的 requireAuth，基于 site_token Cookie）；
 * 本文件只处理分组与任务（增删改查、视图过滤、日历聚合）。
 */
import express from 'express'
import { appLog } from '../logger.js'
import { requireAuth, trackModuleAccessMiddleware } from '../auth.js'
import { callDeepSeek } from '../ai-advisor.js'
import { isDateKey, isMonthKey, sendInternalError } from '../validation.js'
import {
  TODO_CONST,
  VALID_STATUS,
  createList,
  createTask,
  dateKeyOf,
  dayTasks,
  deleteList,
  deleteTask,
  ensureDefaultLists,
  getList,
  getTask,
  listLists,
  listTasks,
  listTasksInRange,
  todayKey,
  updateList,
  updateTask
} from './db.js'

const router = express.Router()

// 全模块统一鉴权，并记录模块使用（供「谁用了哪些模块」统计）
router.use(requireAuth)
router.use(trackModuleAccessMiddleware('todo'))

function serializeList(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#3b82f6',
    icon: row.icon || '📁'
  }
}

function serializeTask(row) {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    note: row.note || '',
    dueDate: row.due_date || '',
    status: row.status,
    priority: row.priority,
    isHarvest: Boolean(row.is_harvest),
    position: Number(row.position) || 0,
    createdAt: row.created_at,
    completedAt: row.completed_at || null,
    updatedAt: row.updated_at
  }
}

function safeColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#3b82f6'
}

// ========== 分组（todo_lists）==========

router.get('/lists', async (req, res) => {
  try {
    // 全新用户自动种入「工作 / 学习 / 生活」默认分组
    const rows = await ensureDefaultLists(req.userId)
    res.json({ lists: rows.map(serializeList) })
  } catch (err) {
    appLog('ERROR', `分组列表读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

/** 一键恢复默认分组（按名称补齐缺失的 工作/学习/生活，已有的不动） */
router.post('/lists/restore-defaults', async (req, res) => {
  try {
    const rows = await ensureDefaultLists(req.userId, { force: true })
    res.json({ ok: true, lists: rows.map(serializeList) })
  } catch (err) {
    appLog('ERROR', `恢复默认分组失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.post('/lists', async (req, res) => {
  const { name, color, icon } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > TODO_CONST.LIST_NAME_MAX) {
    return res.status(400).json({ error: `分组名称需 1-${TODO_CONST.LIST_NAME_MAX} 个字符` })
  }
  try {
    const existing = await listLists(req.userId)
    if (existing.length >= 50) return res.status(400).json({ error: '分组最多 50 个' })
    const row = await createList(req.userId, {
      name: name.trim(),
      color: safeColor(color),
      icon: typeof icon === 'string' && icon ? icon.slice(0, 4) : null
    })
    res.json({ ok: true, list: serializeList(row) })
  } catch (err) {
    if (String(err?.code || '').includes('23505') || String(err?.code || '').includes('CONSTRAINT')) {
      return res.status(409).json({ error: '该分组名已存在' })
    }
    appLog('ERROR', `新增分组失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.patch('/lists/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '分组不存在' })
  const { name, color, icon } = req.body || {}
  try {
    const current = await getList(req.userId, id)
    if (!current) return res.status(404).json({ error: '分组不存在' })
    const patch = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > TODO_CONST.LIST_NAME_MAX) {
        return res.status(400).json({ error: `分组名称需 1-${TODO_CONST.LIST_NAME_MAX} 个字符` })
      }
      patch.name = name.trim()
    }
    if (color !== undefined) patch.color = safeColor(color)
    if (icon !== undefined) patch.icon = typeof icon === 'string' && icon ? icon.slice(0, 4) : null
    const row = await updateList(req.userId, id, patch)
    res.json({ ok: true, list: serializeList(row) })
  } catch (err) {
    appLog('ERROR', `更新分组失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/lists/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '分组不存在' })
  try {
    const removed = await deleteList(req.userId, id)
    if (!removed) return res.status(404).json({ error: '分组不存在' })
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除分组失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// ========== 任务（todos）===========

const VIEW_RE = /^(today_todo|today_done|all|list:\d+)$/

router.get('/tasks', async (req, res) => {
  const view = typeof req.query.view === 'string' ? req.query.view : 'all'
  if (!VIEW_RE.test(view)) return res.status(400).json({ error: 'view 非法' })
  // 分组视图需校验归属
  if (view.startsWith('list:')) {
    const listId = parseInt(view.slice(5), 10)
    const list = await getList(req.userId, listId).catch(() => null)
    if (!list) return res.status(404).json({ error: '分组不存在' })
  }
  try {
    const rows = await listTasks(req.userId, view)
    res.json({ tasks: rows.map(serializeTask) })
  } catch (err) {
    appLog('ERROR', `任务列表读取失败: uid=${req.userId}, view=${view}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

router.post('/tasks', async (req, res) => {
  const { title, note, dueDate, priority, isHarvest, listId, status, completedAt } = req.body || {}
  if (typeof title !== 'string' || !title.trim() || title.trim().length > TODO_CONST.TITLE_MAX) {
    return res.status(400).json({ error: `任务标题需 1-${TODO_CONST.TITLE_MAX} 个字符` })
  }
  if (note !== undefined && typeof note !== 'string') return res.status(400).json({ error: '备注格式错误' })
  if (dueDate !== undefined && dueDate !== null && !isDateKey(dueDate)) {
    return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
  }
  if (completedAt !== undefined && completedAt !== null && completedAt !== '' && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}.*)?$/.test(completedAt)) {
    return res.status(400).json({ error: '完成日期格式应为 YYYY-MM-DD' })
  }
  const safePriority = priority === 'low' || priority === 'high' ? priority : 'medium'
  try {
    let safeListId = null
    if (listId !== undefined && listId !== null) {
      const id = parseInt(listId, 10)
      if (!Number.isInteger(id)) return res.status(400).json({ error: '分组标识非法' })
      const list = await getList(req.userId, id)
      if (!list) return res.status(400).json({ error: '分组不存在' })
      safeListId = id
    }
    const row = await createTask(req.userId, {
      title: title.trim(),
      note: note ? note.slice(0, TODO_CONST.NOTE_MAX) : null,
      dueDate: dueDate || null,
      priority: safePriority,
      status: VALID_STATUS.has(status) ? status : 'pending',
      isHarvest: Boolean(isHarvest),
      listId: safeListId,
      completedAt
    })
    res.json({ ok: true, task: serializeTask(row) })
  } catch (err) {
    appLog('ERROR', `新增任务失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.patch('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '任务不存在' })
  const { title, note, dueDate, priority, isHarvest, listId, status, position, completedAt } = req.body || {}
  try {
    const current = await getTask(req.userId, id)
    if (!current) return res.status(404).json({ error: '任务不存在' })
    const patch = {}
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > TODO_CONST.TITLE_MAX) {
        return res.status(400).json({ error: `任务标题需 1-${TODO_CONST.TITLE_MAX} 个字符` })
      }
      patch.title = title.trim()
    }
    if (note !== undefined) {
      if (typeof note !== 'string') return res.status(400).json({ error: '备注格式错误' })
      patch.note = note.slice(0, TODO_CONST.NOTE_MAX)
    }
    if (dueDate !== undefined) {
      if (dueDate !== null && !isDateKey(dueDate)) {
        return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
      }
      patch.dueDate = dueDate
    }
    if (priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(priority)) return res.status(400).json({ error: '优先级非法' })
      patch.priority = priority
    }
    if (isHarvest !== undefined) patch.isHarvest = Boolean(isHarvest)
    if (position !== undefined) {
      const n = Number(position)
      if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: '排序值非法' })
      patch.position = n
    }
    if (listId !== undefined) {
      if (listId === null) {
        patch.listId = null
      } else {
        const lid = parseInt(listId, 10)
        if (!Number.isInteger(lid)) return res.status(400).json({ error: '分组标识非法' })
        const list = await getList(req.userId, lid)
        if (!list) return res.status(400).json({ error: '分组不存在' })
        patch.listId = lid
      }
    }
    if (status !== undefined) {
      if (!VALID_STATUS.has(status)) return res.status(400).json({ error: '状态非法' })
      patch.status = status
    }
    if (completedAt !== undefined) {
      if (completedAt !== null && completedAt !== '' && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}.*)?$/.test(completedAt)) {
        return res.status(400).json({ error: '完成日期格式应为 YYYY-MM-DD' })
      }
      patch.completedAt = completedAt
    }
    const row = await updateTask(req.userId, id, patch)
    res.json({ ok: true, task: serializeTask(row) })
  } catch (err) {
    appLog('ERROR', `更新任务失败: uid=${req.userId}, id=${id}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isInteger(id)) return res.status(400).json({ error: '任务不存在' })
  try {
    const removed = await deleteTask(req.userId, id)
    if (!removed) return res.status(404).json({ error: '任务不存在' })
    res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `删除任务失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// ========== 单日明细（日历点某天用）===========

router.get('/day/:date', async (req, res) => {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
  try {
    const rows = await dayTasks(req.userId, date)
    const tasks = rows.map(serializeTask)
    const summary = { total: tasks.length, done: 0, cancelled: 0, active: 0 }
    for (const t of tasks) {
      if (t.status === 'done') summary.done += 1
      else if (t.status === 'cancelled') summary.cancelled += 1
      else summary.active += 1
    }
    res.json({
      date,
      tasks,
      // pending 保留以兼容旧前端；其语义等同于 active（已完成/已取消之外的活跃态）
      summary: { ...summary, pending: summary.active }
    })
  } catch (err) {
    appLog('ERROR', `单日明细读取失败: uid=${req.userId}, date=${date}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

// ========== 日历月视图聚合 ============

function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const pad = (n) => String(n).padStart(2, '0')
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` }
}

router.get('/calendar', async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : todayKey().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month 格式应为 YYYY-MM' })
  try {
    const { from, to } = monthRange(month)
    const rows = await listTasksInRange(req.userId, from, to)
    const days = {}
    for (const row of rows) {
      const key = row.due_date
      if (!days[key]) days[key] = { total: 0, done: 0, cancelled: 0, active: 0, tasks: [] }
      days[key].total += 1
      if (row.status === 'done') days[key].done += 1
      else if (row.status === 'cancelled') days[key].cancelled += 1
      else days[key].active += 1
      days[key].tasks.push(serializeTask(row))
    }
    res.json({ month, today: todayKey(), days })
  } catch (err) {
    appLog('ERROR', `日历聚合失败: uid=${req.userId}, month=${month}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

router.get('/range', async (req, res) => {
  const from = typeof req.query.from === 'string' ? req.query.from : ''
  const to = typeof req.query.to === 'string' ? req.query.to : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'from/to 格式应为 YYYY-MM-DD' })
  }
  try {
    const rows = await listTasksInRange(req.userId, from, to)
    res.json({ from, to, tasks: rows.map(serializeTask) })
  } catch (err) {
    appLog('ERROR', `区间任务读取失败: uid=${req.userId}, error=${err?.message}`)
    res.status(500).json({ error: '读取失败，请稍后重试' })
  }
})

// ========== AI 日程分析（复用站点内置 DeepSeek） ============

/** 在 YYYY-MM-DD 上加减天数 */
export function addDaysToKey(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** 以某天为锚点，返回其所在周一~周日的区间 */
export function weekRangeOf(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // 周一=0 … 周日=6
  return { from: addDaysToKey(key, -dow), to: addDaysToKey(key, 6 - dow) }
}

/** 不同 scope 对应的系统提示词 */
export function buildTodoSystemPrompt(scope) {
  // 通用约束 1：完成时间不送进上下文，也严禁据此推断用户的工作节奏/执行时间
  const timingRule =
    '重要约束：数据中没有「完成时间」字段，也请勿依据完成时间推断用户的工作节奏或真实执行时间——用户习惯在晚间统一整理并标记完成，完成时间不等于实际执行时间。分析只基于计划日期(date)、分类(category)、状态(status)与内容(title/note)进行客观判断。'
  // 通用约束 2：用户本人并不看重任务优先级，禁止以优先级作为评判/排序/建议依据
  const priorityRule =
    '不要以任务优先级(priority)作为评判、排序或建议的依据——用户本人并不看重优先级，请忽略该维度，聚焦任务内容、分类与完成情况本身；数据中也不会提供 priority 字段。'
  if (scope === 'week') {
    return [
      '你是一个周计划助理。下面是用户本周的日程清单（JSON 数组）。',
      '字段：date 计划日期、title 标题、note 备注、category 分类、status 状态(pending 待办 / in_progress 进行中 / deferred 已延期 / waiting 等待中 / done 已办 / cancelled 已取消)。',
      timingRule,
      priorityRule,
      '请基于这份清单生成一份「周计划」：按日期梳理每天的重点任务、标注关键交付或里程碑、指出哪几天可能过载或冲突、给出精力分配建议。',
      '用简洁的中文回答，使用 Markdown 排版（含小标题与 - 列表），控制在 600 字以内。'
    ].join('\n')
  }
  if (scope === 'month') {
    return [
      '你是一个月计划助理。下面是用户本月的日程清单（JSON 数组）。',
      '字段：date 计划日期、title 标题、note 备注、category 分类、status 状态(pending 待办 / in_progress 进行中 / deferred 已延期 / waiting 等待中 / done 已办 / cancelled 已取消)。',
      timingRule,
      priorityRule,
      '请生成一份「月计划概览」：整体完成率、各分类的任务分布、关键时间节点（按计划日期）、本月建议聚焦的主题与节奏安排。',
      '用简洁的中文回答，使用 Markdown 排版（含小标题与 - 列表），控制在 600 字以内。'
    ].join('\n')
  }
  return [
    '你是一个日程助理。下面是用户某一天的日程清单（JSON 数组）。',
    '字段：date 计划日期、title 标题、note 备注、category 分类、status 状态(pending 待办 / done 已办)。',
    timingRule,
    priorityRule,
    '请做一段「日程分析」：已完成 / 未完成各多少、当天任务的重点与均衡度、给出具体行动建议与风险提示（不要评价完成时间早晚，也不要猜测是否「深夜补录」；不要提及或依据任务优先级）。',
    '用简洁的中文回答，使用 Markdown 排版（含小标题与 - 列表），控制在 450 字以内。'
  ].join('\n')
}

router.post('/ai-analyze', async (req, res) => {
  const { scope, date, month } = req.body || {}
  if (!['day', 'week', 'month'].includes(scope)) {
    return res.status(400).json({ error: 'scope 非法（应为 day/week/month）' })
  }
  // 1) 计算分析区间
  let from
  let to
  try {
    if (scope === 'day') {
      if (!isDateKey(date)) return res.status(400).json({ error: 'date 格式应为 YYYY-MM-DD' })
      from = date
      to = date
    } else if (scope === 'week') {
      const anchor = isDateKey(date) ? date : todayKey()
      ;({ from, to } = weekRangeOf(anchor))
    } else {
      const mm = isMonthKey(month) ? month : todayKey().slice(0, 7)
      ;({ from, to } = monthRange(mm))
    }
  } catch {
    return res.status(400).json({ error: '分析区间计算失败' })
  }

  try {
    // 2) 拉取区间任务 + 分组名映射
    const [rows, lists] = await Promise.all([
      listTasksInRange(req.userId, from, to),
      listLists(req.userId)
    ])
    const nameMap = new Map(lists.map((l) => [l.id, l.name]))
    const tasks = rows.map((row) => ({
      date: row.due_date || '',
      title: row.title,
      note: row.note || '',
      category: row.list_id ? nameMap.get(row.list_id) || '' : '',
      status: row.status
    }))

    // 3) 空数据直接返回友好提示，不消耗 AI 额度
    if (!tasks.length) {
      const label = scope === 'day' ? `日期 ${from}` : scope === 'week' ? `本周（${from} ~ ${to}）` : `本月（${from} ~ ${to}）`
      return res.json({
        scope,
        from,
        to,
        report: `📭 **${label}** 内还没有记录任何日程。\n\n先去「今日待办」或「日历视图」添加一些任务，再回来让 AI 帮你做分析吧。`
      })
    }

    // 4) 调用内置 DeepSeek 生成分析
    const systemPrompt = buildTodoSystemPrompt(scope)
    const userQuestion = `以下是需要分析的日程数据（JSON）：\n${JSON.stringify(tasks, null, 2)}`
    const report = await callDeepSeek(systemPrompt, userQuestion)
    res.json({ scope, from, to, report })
  } catch (err) {
    appLog('ERROR', `日程 AI 分析失败: uid=${req.userId}, scope=${scope}, error=${err?.message}`)
    sendInternalError(res, 'AI 分析失败，请稍后重试')
  }
})

export default router
