import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isConstructedHeroSkin,
  splitHeroFlavor
} from '../scripts/download-hs-hero-skins.mjs'

test('英雄皮肤下载器排除战棋英雄并识别中文获取方式', () => {
  assert.equal(isConstructedHeroSkin({ set: 'HERO_SKINS', type: 'HERO', cardClass: 'MAGE' }), true)
  assert.equal(isConstructedHeroSkin({ set: 'BATTLEGROUNDS', type: 'HERO', cardClass: 'NEUTRAL' }), false)
  assert.deepEqual(splitHeroFlavor('在商店中购买以获得该奖励。'), {
    flavorText: '',
    howToGet: '在商店中购买以获得该奖励。'
  })
})
