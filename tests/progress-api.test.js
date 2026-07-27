import assert from 'node:assert/strict'
import test from 'node:test'
import { saveAchievementProgress } from '../src/features/hearthstone/api/progress.js'

test('统一进度 API 发送预期请求体', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/achievements/progress')
    assert.equal(options.method, 'PUT')
    assert.deepEqual(JSON.parse(options.body), {
      progress: { demo: { stages: { 0: true }, count: 1 } }
    })
    return new Response(JSON.stringify({ ok: true, saved: 1 }), { status: 200 })
  }

  const result = await saveAchievementProgress({
    demo: { stages: { 0: true }, count: 1 }
  })
  assert.deepEqual(result, { ok: true, saved: 1 })
})

test('统一进度 API 保留服务端错误信息', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: '仅用于测试的错误' }), { status: 400 })

  await assert.rejects(
    () => saveAchievementProgress({ demo: { stages: {}, count: 0 } }),
    /仅用于测试的错误/
  )
})
