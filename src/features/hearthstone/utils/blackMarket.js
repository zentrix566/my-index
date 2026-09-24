import { formatBeijingDateKey } from '../../../utils/date.js'

const DAILY_BLOODSTONES = 900
const MARKET_DEADLINE = new Date('2026-10-06T16:00:00Z')
const DEADLINE_DATE_KEY = '2026-10-07'
const DAY_MS = 24 * 60 * 60 * 1000

/** 黑市血石价格与攒取天数计算。 */
export function calculateBlackMarketItem({ initialPrice, currentPrice, quantity = 1, currentBloodstones = 900 }) {
  const base = Math.max(0, Number(initialPrice) || 0)
  const current = Math.max(0, Number(currentPrice) || 0)
  const count = Math.max(0, Math.floor(Number(quantity) || 0))
  const bloodstones = Math.max(0, Number(currentBloodstones) || 0)
  const initialTotal = base * count
  const currentTotal = current * count
  const priceDifference = currentTotal - initialTotal
  const changePercent = initialTotal ? (priceDifference / initialTotal) * 100 : 0
  const remainingBloodstones = Math.max(0, currentTotal - bloodstones)

  return {
    initialTotal,
    currentTotal,
    lowerPrice: Math.round(current * 0.85),
    upperPrice: Math.round(current * 1.15),
    priceDifference,
    changePercent,
    remainingBloodstones,
    daysNeeded: Math.ceil(remainingBloodstones / DAILY_BLOODSTONES),
    canBuyNow: remainingBloodstones === 0
  }
}

/** 分别估算各项兑换所需血石与天数，并汇总活动截止前能否买齐。 */
export function calculateBlackMarketPlan(items, currentBloodstones, now = new Date()) {
  const todayKey = formatBeijingDateKey(now)
  const todayUtc = Date.parse(`${todayKey}T00:00:00Z`)
  const balance = Math.max(0, Number(currentBloodstones) || 0)
  const hasEnded = now >= MARKET_DEADLINE
  const dates = {}
  let totalPrice = 0
  for (const item of items) {
    const price = Math.max(0, Number(item.currentTotal) || 0)
    totalPrice += price
    const shortfall = Math.max(0, price - balance)
    const daysNeeded = Math.ceil(shortfall / DAILY_BLOODSTONES)
    const date = new Date(todayUtc + daysNeeded * DAY_MS).toISOString().slice(0, 10)
    dates[item.id] = { date, shortfall, daysNeeded, canBuyNow: shortfall === 0, onTime: !hasEnded && date < DEADLINE_DATE_KEY }
  }
  const remainingBloodstones = Math.max(0, totalPrice - balance)
  const daysNeeded = Math.ceil(remainingBloodstones / DAILY_BLOODSTONES)
  const completionDate = items.length ? new Date(todayUtc + daysNeeded * DAY_MS).toISOString().slice(0, 10) : null
  const canComplete = items.length === 0 || (!hasEnded && completionDate < DEADLINE_DATE_KEY)

  return { totalPrice, remainingBloodstones, daysNeeded, completionDate, canComplete, hasEnded, dates }
}

/** 根据相对首发价的变动给出黑市入手建议。 */
export function getBlackMarketAdvice(changePercent) {
  const change = Number(changePercent) || 0
  if (change <= -10) {
    return {
      level: 'buy',
      title: '建议入手',
      description: `当前低于首发价 ${Math.abs(change).toFixed(1)}%，已达到 10% 入手线。`
    }
  }
  if (change < 0) {
    return {
      level: 'consider',
      title: '可酌情入手',
      description: `当前低于首发价 ${Math.abs(change).toFixed(1)}%，但尚未达到 10% 入手线。`
    }
  }
  if (change > 0) {
    return {
      level: 'wait',
      title: '建议观望',
      description: `当前高于首发价 ${change.toFixed(1)}%，可等待后续变价。`
    }
  }
  return {
    level: 'neutral',
    title: '按需兑换',
    description: '当前与首发价持平；急需可兑换，否则可以继续观察。'
  }
}
