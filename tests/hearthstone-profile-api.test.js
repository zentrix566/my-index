import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchHearthstoneProfile,
  saveHearthstoneProfile
} from '../src/features/hearthstone/api/profile.js'
import {
  normalizePinnedAchievementIds
} from '../server/hearthstone-profile.js'

test('置顶成就兼容旧单项值并限制为十项', () => {
  assert.deepEqual(normalizePinnedAchievementIds('legacy-achievement'), [
    'legacy-achievement'
  ])
  assert.deepEqual(
    normalizePinnedAchievementIds(JSON.stringify(['a', 'b', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'])),
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
  )
})

test('炉石个人配置 API 发送并保留最多十项置顶成就与显示偏好', async () => {
  const originalFetch = globalThis.fetch
  const profile = {
    pinnedAchievementIds: ['target-achievement', 'second-achievement'],
    preferences: {
      hardcore: true,
      defaultExpansionId: 'violet-hold',
      compactMode: true
    }
  }
  try {
    let calls = 0
    globalThis.fetch = async (url, options = {}) => {
      calls += 1
      if (calls === 1) {
        assert.equal(url, '/api/hearthstone/profile')
        assert.equal(options.method, undefined)
      } else {
        assert.equal(url, '/api/hearthstone/profile')
        assert.equal(options.method, 'PUT')
        assert.deepEqual(JSON.parse(options.body), profile)
      }
      return new Response(JSON.stringify(profile), { status: 200 })
    }

    assert.deepEqual(await fetchHearthstoneProfile(), profile)
    assert.deepEqual(await saveHearthstoneProfile(profile), profile)
  } finally {
    globalThis.fetch = originalFetch
  }
})
