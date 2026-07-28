import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeDeck } from '../src/features/hearthstone/utils/deckstring.js'

const VALID_DECK_CODE =
  'AAEBAe2/BATguwKb6AKPzgOJiwQNVooO4RWgzQKHzgKe0gKP9gKpogPcogPougPuugPw1APanwQA'

test('卡组代码解码接受有效代码', () => {
  const deck = decodeDeck(VALID_DECK_CODE)
  assert.equal(deck.valid, true)
  assert.equal(deck.total, 30)
  assert.ok(deck.cards.length > 0)
})

test('卡组代码解码拒绝错误头、截断数据和超长输入', () => {
  assert.equal(decodeDeck('//8BAQcBewAA').valid, false)
  assert.equal(decodeDeck('AAEBAQ').valid, false)
  assert.equal(decodeDeck('A'.repeat(4097)).valid, false)
})
