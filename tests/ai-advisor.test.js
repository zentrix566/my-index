import assert from 'node:assert/strict'
import test from 'node:test'
import { todayKey } from '../server/ai-advisor.js'

test('AI 每日额度按香港时区跨日', () => {
  assert.equal(
    todayKey(new Date('2026-07-27T15:59:59.000Z'), 'Asia/Hong_Kong'),
    '2026-07-27'
  )
  assert.equal(
    todayKey(new Date('2026-07-27T16:00:00.000Z'), 'Asia/Hong_Kong'),
    '2026-07-28'
  )
})
