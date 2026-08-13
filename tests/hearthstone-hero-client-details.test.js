import assert from 'node:assert/strict'
import test from 'node:test'
import { splitHeroClientDescription } from '../scripts/extract-hs-hero-details-from-client.mjs'

test('客户端英雄说明拆分为中文风味描述和获取方式', () => {
  assert.deepEqual(splitHeroClientDescription('瓦莉拉重启了杀戮终日的生活。\n\n完成“旅店生活”成就获得该奖励。'), {
    flavorText: '瓦莉拉重启了杀戮终日的生活。',
    howToGet: '完成“旅店生活”成就获得该奖励。'
  })
  assert.deepEqual(splitHeroClientDescription('可以在上架期间在商店中购买。'), {
    flavorText: '',
    howToGet: '可以在上架期间在商店中购买。'
  })
  assert.deepEqual(splitHeroClientDescription('天灾食尸鬼都是优秀的打手，更是优秀的扶手。\n参与特殊活动以获得该奖励。'), {
    flavorText: '天灾食尸鬼都是优秀的打手，更是优秀的扶手。',
    howToGet: '参与特殊活动以获得该奖励。'
  })
})
