import assert from 'node:assert/strict'
import test from 'node:test'

import todoApi, { TODO_TASKS_CHANGED_EVENT } from '../src/features/todo/api/todo.js'

test('更新任务成功后通知侧栏刷新今日角标', async (t) => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  const eventTarget = new EventTarget()
  let changedCount = 0

  globalThis.window = eventTarget
  globalThis.fetch = async () => new Response(JSON.stringify({ task: { id: 1, status: 'done' } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
  eventTarget.addEventListener(TODO_TASKS_CHANGED_EVENT, () => {
    changedCount += 1
  })

  t.after(() => {
    globalThis.fetch = originalFetch
    globalThis.window = originalWindow
  })

  await todoApi.updateTask(1, { status: 'done' })

  assert.equal(changedCount, 1)
})
