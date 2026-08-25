/**
 * API 入参校验工具，统一日期与常见错误响应格式。
 */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_RE = /^(\d{4})-(\d{2})$/

export function isDateKey(value) {
  if (typeof value !== 'string') return false
  const match = value.match(DATE_RE)
  if (!match) return false
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
}

export function isMonthKey(value) {
  if (typeof value !== 'string') return false
  const match = value.match(MONTH_RE)
  return Boolean(match) && Number(match[2]) >= 1 && Number(match[2]) <= 12
}

export function sendInternalError(res, fallback) {
  return res.status(500).json({ error: fallback })
}
