// 临时 E2E 冒烟：通过真实 HTTP 验证 todo 模块（注册/登录/分组/任务/视图/日历/AI 分析）
const BASE = 'http://localhost:3000'
const U = 'e2e_todo_' + Date.now().toString(36)
const P = 'e2e_pwd_123'

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAIL: ' + msg)
  console.log('  ok -', msg)
}

let cookie = ''
async function call(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers['Cookie'] = cookie
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0]
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

const main = async () => {
  console.log('[1] register', U)
  let r = await call('POST', '/api/auth/register', { username: U, password: P })
  assert(r.status === 200 && r.json.ok, 'register 200 + ok')
  assert(cookie.includes('site_token'), 'set-cookie 含 site_token')

  console.log('[2] 未带 cookie 访问应 401')
  const saved = cookie
  cookie = ''
  r = await call('GET', '/api/todo/lists')
  assert(r.status === 401, '无 token 访问 /api/todo/lists -> 401')
  cookie = saved

  console.log('[3] 建分组')
  r = await call('POST', '/api/todo/lists', { name: '工作', color: '#3b82f6', icon: 'briefcase' })
  assert(r.status === 200 && r.json.list && r.json.list.id, 'createList -> id=' + r.json.list.id)
  const listId = r.json.list.id

  console.log('[4] 建任务（今天待办）')
  r = await call('POST', '/api/todo/tasks', {
    title: '写周报', listId, priority: 'high', dueDate: new Date().toISOString().slice(0, 10),
  })
  assert(r.status === 200 && r.json.task && r.json.task.id, 'createTask -> id=' + r.json.task.id)
  const taskId = r.json.task.id
  assert(r.json.task.status === 'pending', '新建任务默认 pending')

  console.log('[5] today_todo 视图包含该任务')
  r = await call('GET', '/api/todo/tasks?view=today_todo')
  assert(r.status === 200 && Array.isArray(r.json.tasks), 'today_todo 返回数组')
  assert(r.json.tasks.some((t) => t.id === taskId), 'today_todo 含刚建任务')

  console.log('[6] 完成该任务')
  r = await call('PATCH', `/api/todo/tasks/${taskId}`, { status: 'done' })
  assert(r.status === 200 && r.json.task && r.json.task.status === 'done', 'updateTask done')
  assert(typeof r.json.task.completedAt === 'string' && r.json.task.completedAt.includes('+08:00'), 'completedAt 北京时间 ISO: ' + r.json.task.completedAt)

  console.log('[7] done 后 today_done 含、today_todo 不含')
  r = await call('GET', '/api/todo/tasks?view=today_done')
  assert(r.json.tasks.some((t) => t.id === taskId), 'today_done 含')
  r = await call('GET', '/api/todo/tasks?view=today_todo')
  assert(!r.json.tasks.some((t) => t.id === taskId), 'today_todo 不含')

  console.log('[8] all 视图（日程管理表格数据源）含该任务')
  r = await call('GET', '/api/todo/tasks?view=all')
  assert(r.status === 200 && Array.isArray(r.json.tasks), 'all 返回数组')
  assert(r.json.tasks.some((t) => t.id === taskId), 'all 含刚建任务')

  console.log('[9] 非法 view 应 400')
  r = await call('GET', '/api/todo/tasks?view=hack')
  assert(r.status === 400, '非法 view -> 400')

  console.log('[10] 日历聚合当月')
  const month = new Date().toISOString().slice(0, 7)
  r = await call('GET', `/api/todo/calendar?month=${month}`)
  assert(r.status === 200 && r.json.days && typeof r.json.days === 'object', 'calendar.days 为对象')
  const todayKey = new Date().toISOString().slice(0, 10)
  assert(r.json.days[todayKey] && r.json.days[todayKey].done >= 1, `今日(${todayKey}) done>=1`)
  assert(Array.isArray(r.json.days[todayKey].tasks), `今日(${todayKey}) tasks 为数组`)

  console.log('[11] day 详情')
  r = await call('GET', `/api/todo/day/${todayKey}`)
  assert(r.status === 200 && Array.isArray(r.json.tasks), 'day detail 返回 tasks')

  console.log('[12] AI 分析 - 非法 scope 应 400')
  r = await call('POST', '/api/todo/ai-analyze', { scope: 'hack' })
  assert(r.status === 400, '非法 scope -> 400')

  console.log('[13] AI 分析 - 空数据返回友好提示（不消耗额度）')
  const farDate = '2099-01-01'
  r = await call('POST', '/api/todo/ai-analyze', { scope: 'day', date: farDate })
  assert(r.status === 200 && typeof r.json.report === 'string' && r.json.report.length > 0, `空数据返回 report(${farDate})`)
  assert(!/deepseek|error/i.test(r.json.report), '空数据提示不含错误文案')

  console.log('[14] AI 分析 - 真实调用（依赖服务端 DEEPSEEK_API_KEY，环境失败仅告警）')
  try {
    r = await call('POST', '/api/todo/ai-analyze', { scope: 'day', date: todayKey })
    if (r.status === 200 && r.json.report) {
      assert(r.json.report.length > 0, 'AI 真实返回非空分析')
      console.log('  (AI 报告前 80 字)', r.json.report.slice(0, 80).replace(/\n/g, ' '))
    } else {
      console.log('  ⚠ AI 真实调用未成功（status=' + r.status + '，msg=' + (r.json.error || '?') + '），跳过断言（环境相关）')
    }
  } catch (e) {
    console.log('  ⚠ AI 真实调用异常，跳过断言：', e.message)
  }

  console.log('[15] 列表与删除')
  r = await call('GET', '/api/todo/lists')
  assert(r.status === 200 && r.json.lists.some((l) => l.id === listId), 'lists 列表含新建分组')
  r = await call('DELETE', `/api/todo/tasks/${taskId}`)
  assert(r.status === 200, 'deleteTask 200')
  r = await call('DELETE', `/api/todo/lists/${listId}`)
  assert(r.status === 200, 'deleteList 200')

  console.log('\nE2E_TODO_OK ✅ 全部通过')
}

main().catch((e) => {
  console.error('\nE2E_TODO_FAIL ❌', e.message)
  process.exit(1)
})
