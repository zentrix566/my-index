// 隔离逻辑测试：无需 Postgres / 完整服务器。
// 验证 todo 数据层(sqlite) 的 range/all 查询，以及 AI 路由的纯函数（日期区间 / 提示词）。
// 运行：env -u NODE_OPTIONS node scripts/test-todo-logic.mjs
import assert from 'node:assert'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

process.env.NODE_ENV = 'development'
process.env.LOCAL_DEV_MODE = 'true'
const dbPath = path.join(os.tmpdir(), `todo-logic-test-${Date.now()}.db`)
process.env.TODO_LOCAL_SQLITE_PATH = dbPath

const {
  ensureTodoSchema,
  createList,
  createTask,
  listLists,
  listTasks,
  listTasksInRange,
  updateTask
} = await import('../server/todo/db.js')

const { addDaysToKey, weekRangeOf, buildTodoSystemPrompt } = await import('../server/todo/routes.js')

let passed = 0
function ok(name) { passed++; console.log('  ok -', name) }

try {
  fs.rmSync(dbPath, { force: true })
  await ensureTodoSchema()

  // ===== 数据层 =====
  const list = await createList(1, { name: '测试组', color: '#3b82f6', icon: 'x' })
  assert.ok(list.id, 'createList 返回 id')
  const listId = list.id

  const today = new Date().toISOString().slice(0, 10)
  const in3 = addDaysToKey(today, 3)
  const in40 = addDaysToKey(today, 40)

  await createTask(1, { title: '今天', dueDate: today, priority: 'high', listId })
  await createTask(1, { title: '三天后', dueDate: in3, priority: 'medium', listId })
  await createTask(1, { title: '下月', dueDate: in40, priority: 'low', listId: null })

  const all = await listTasks(1, 'all')
  assert.equal(all.length, 3, 'all 视图返回 3 条')
  ok('listTasks(all) 返回全部 3 条')

  const todayRows = await listTasksInRange(1, today, today)
  assert.equal(todayRows.length, 1, '今日区间 1 条')
  ok('listTasksInRange(今日) 返回 1 条')

  const wk = await listTasksInRange(1, today, in3)
  assert.equal(wk.length, 2, '今日~三日后 区间 2 条')
  ok('listTasksInRange(今日~+3) 返回 2 条')

  // ===== 任务状态：挂起任务仍进今日待办（前端单独分区、不施压），旧枚举值回退待办 =====
  const yesterday = addDaysToKey(today, -1)
  await createTask(1, { title: '今天挂起', dueDate: today, status: 'suspended', listId })
  await createTask(1, { title: '逾期挂起', dueDate: yesterday, status: 'suspended', listId })
  const legacy = await createTask(1, { title: '旧状态', dueDate: today, status: 'in_progress', listId })
  assert.equal(legacy.status, 'pending', '已下线的 in_progress 回退 pending')
  const todoToday = await listTasks(1, 'today_todo')
  assert.ok(todoToday.some((t) => t.title === '今天挂起'), '今天到期的挂起任务在今日待办中可见')
  assert.ok(todoToday.some((t) => t.title === '逾期挂起'), '逾期挂起任务也带出（前端不标逾期）')
  assert.ok(todoToday.some((t) => t.title === '旧状态' && t.status === 'pending'), '旧状态迁移后按待办返回')
  ok('挂起任务在今日待办可见，旧状态值回退待办')

  // ===== 挂起语义：曾挂起的任务完成后不算「晚于预期」，由 was_suspended 标记驱动 =====
  const parked = await createTask(1, { title: '挂起后完成', dueDate: yesterday, status: 'suspended', listId })
  const parkedDone = await updateTask(1, parked.id, { status: 'done' })
  assert.equal(parkedDone.was_suspended, 1, '挂起转完成保留 was_suspended 标记')
  const resumedAndDone = await updateTask(1, parkedDone.id, { status: 'pending' })
  assert.equal(resumedAndDone.was_suspended, 1, '标记是历史事实，撤销完成也不回滚')
  const plain = await createTask(1, { title: '普通逾期完成', dueDate: yesterday, listId })
  const plainDone = await updateTask(1, plain.id, { status: 'done' })
  assert.equal(plainDone.was_suspended, 0, '从未挂起的任务完成不带标记，照常显示晚于预期')
  ok('曾挂起任务完成后带 was_suspended 标记，普通任务不带')

  const lists = await listLists(1)
  assert.ok(lists.some((l) => l.id === listId), 'listLists 含测试组')
  ok('listLists 含新建分组')

  // ===== AI 路由纯函数 =====
  assert.equal(addDaysToKey('2026-08-10', 1), '2026-08-11', '加一天')
  assert.equal(addDaysToKey('2026-02-28', 1), '2026-03-01', '跨月/非闰年')
  ok('addDaysToKey 跨月正确')

  const wr = weekRangeOf('2026-08-10')
  const startDow = new Date(wr.from.split('-').map(Number)[0], wr.from.split('-').map(Number)[1] - 1, wr.from.split('-').map(Number)[2]).getDay()
  assert.equal((startDow + 6) % 7, 0, '周起点为周一')
  assert.equal(addDaysToKey(wr.to, 1), addDaysToKey(wr.from, 7), '周区间跨度 7 天')
  ok(`weekRangeOf 周一~周日: ${wr.from} ~ ${wr.to}`)

  assert.match(buildTodoSystemPrompt('day'), /日程编辑/, 'day 提示词')
  assert.match(buildTodoSystemPrompt('week'), /周计划编辑/, 'week 提示词')
  assert.match(buildTodoSystemPrompt('month'), /月计划编辑/, 'month 提示词')
  for (const scope of ['day', 'week', 'month']) {
    const prompt = buildTodoSystemPrompt(scope)
    assert.match(prompt, /suspended 已挂起/, `${scope} 提示词含已挂起`)
    assert.doesNotMatch(prompt, /in_progress|deferred|waiting/, `${scope} 提示词无旧状态`)
  }
  ok('buildTodoSystemPrompt 三种 scope 提示词正确')

  console.log(`\nTODO_LOGIC_OK ✅ 通过 ${passed} 项`)
} catch (e) {
  console.error('\nTODO_LOGIC_FAIL ❌', e.message)
  process.exitCode = 1
} finally {
  try { fs.rmSync(dbPath, { force: true }) } catch {}
}
