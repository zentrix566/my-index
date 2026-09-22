/** 黑市血石价格与攒取天数计算。owned 为已拥有份数，仅对剩余份数计算所需血石。 */
export function calculateBlackMarketItem({ initialPrice, currentPrice, quantity = 1, owned = 0, currentBloodstones = 900 }) {
  const base = Math.max(0, Number(initialPrice) || 0)
  const current = Math.max(0, Number(currentPrice) || 0)
  const count = Math.max(1, Math.floor(Number(quantity) || 1))
  const ownedCount = Math.min(Math.max(0, Math.floor(Number(owned) || 0)), count)
  const remainingCount = count - ownedCount
  const bloodstones = Math.max(0, Number(currentBloodstones) || 0)
  const initialTotal = base * remainingCount
  const currentTotal = current * remainingCount
  const priceDifference = currentTotal - initialTotal
  const changePercent = initialTotal ? (priceDifference / initialTotal) * 100 : 0
  const remainingBloodstones = Math.max(0, currentTotal - bloodstones)

  return {
    ownedCount,
    remainingCount,
    initialTotal,
    currentTotal,
    priceDifference,
    changePercent,
    remainingBloodstones,
    daysNeeded: Math.ceil(remainingBloodstones / 900),
    canBuyNow: remainingBloodstones === 0
  }
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
