import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDbfIdIndex } from '../scripts/fetch-hsjson-cards.mjs'

test('卡组索引统一按 dbfId 收录普通卡、衍生卡和英雄', () => {
  const index = buildDbfIdIndex([
    {
      dbfId: 1,
      id: 'CARD_001',
      name: '测试随从',
      type: 'MINION',
      cardClass: 'MAGE',
      rarity: 'RARE',
      set: 'TEST_SET',
      cost: 2
    },
    {
      dbfId: 2,
      id: 'TOKEN_001',
      name: '测试衍生卡',
      type: 'SPELL',
      cardClass: 'NEUTRAL',
      set: 'TEST_SET'
    },
    {
      dbfId: 3,
      id: 'HERO_001',
      name: '测试英雄',
      type: 'HERO',
      cardClass: 'WARRIOR',
      set: 'TEST_SET'
    },
    { dbfId: 4, id: 'ENCHANT_001', name: '测试附魔', type: 'ENCHANT' }
  ])

  assert.deepEqual(Object.keys(index.cards), ['1', '2', '3'])
  assert.equal(index.cards['1'].rarity, '稀有')
  assert.equal(index.cards['2'].cost, 0)
  assert.equal(index.heroClasses['3'], '战士')
})
