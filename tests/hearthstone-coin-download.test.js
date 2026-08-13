import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isCosmeticCoin,
  splitCoinFlavor
} from '../scripts/download-hs-coins.mjs'

test('幸运币下载器只筛选外观幸运币并拆分中文详情', () => {
  assert.equal(isCosmeticCoin({ id: 'AT_COIN', name: '幸运币', type: 'SPELL', cost: 0 }), true)
  assert.equal(isCosmeticCoin({ id: 'GAME_005', name: '幸运币', type: 'SPELL', cost: 0 }), false)
  assert.deepEqual(splitCoinFlavor('整个世界，在你掌中。\n购买<i>深暗领域</i>炉石通行证后开放解锁。'), {
    flavorText: '整个世界，在你掌中。',
    howToGet: '购买《深暗领域》炉石通行证后开放解锁。'
  })
})
