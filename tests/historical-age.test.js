import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateHistoricalAge,
  formatHistoricalYear,
  toAstronomicalYear
} from '../src/features/age-calculator/utils/historicalYear.js'

test('同为公元前年份时按时间前进方向计算年龄', () => {
  assert.equal(
    calculateHistoricalAge(
      { era: 'bce', year: 200 },
      { era: 'bce', year: 180 }
    ),
    20
  )
})

test('跨越公元前与公元时不计入不存在的公元 0 年', () => {
  assert.equal(
    calculateHistoricalAge(
      { era: 'bce', year: 100 },
      { era: 'ce', year: 20 }
    ),
    119
  )
  assert.equal(toAstronomicalYear('bce', 1), 0)
  assert.equal(toAstronomicalYear('ce', 1), 1)
  assert.equal(
    calculateHistoricalAge(
      { era: 'bce', year: 1 },
      { era: 'ce', year: 1 }
    ),
    1
  )
})

test('同为公元年份时保持普通年份差', () => {
  assert.equal(
    calculateHistoricalAge(
      { era: 'ce', year: 10 },
      { era: 'ce', year: 25 }
    ),
    15
  )
})

test('支持汉代常见的公元前出生与公元前卒年', () => {
  assert.equal(
    calculateHistoricalAge(
      { era: 'bce', year: 145 },
      { era: 'bce', year: 86 }
    ),
    59
  )
  assert.equal(formatHistoricalYear({ era: 'bce', year: 145 }), '公元前 145 年')
})

test('拒绝公元 0 年、非整数和早于出生的特定年份', () => {
  assert.throws(() => toAstronomicalYear('bce', 0), /大于 0 的整数/)
  assert.throws(() => toAstronomicalYear('ce', 1.5), /大于 0 的整数/)
  assert.throws(
    () => calculateHistoricalAge(
      { era: 'bce', year: 180 },
      { era: 'bce', year: 200 }
    ),
    /不能早于出生年份/
  )
})
