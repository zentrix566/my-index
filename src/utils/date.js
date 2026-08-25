/** 生成浏览器本地时区的 YYYY-MM-DD。 */
export function formatDateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 生成浏览器本地时区的 YYYY-MM。 */
export function formatMonthKey(date = new Date()) {
  return formatDateKey(date).slice(0, 7)
}

/** 在本地日历中加减天数，避免 UTC 跨日偏移。 */
export function addLocalDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function formatDateTime(date = new Date()) {
  const value = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${formatDateKey(value)} ${pad(value.getHours())}:${pad(value.getMinutes())}`
}

/** 生成北京时间的日期键，和 Todo / Willpower 后端的自然日口径一致。 */
export function formatBeijingDateKey(date = new Date()) {
  const shifted = new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000)
  const pad = (value) => String(value).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

export function formatBeijingMonthKey(date = new Date()) {
  return formatBeijingDateKey(date).slice(0, 7)
}

export function formatBeijingIso(date = new Date()) {
  const shifted = new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000)
  const pad = (value) => String(value).padStart(2, '0')
  const pad3 = (value) => String(value).padStart(3, '0')
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}.${pad3(shifted.getUTCMilliseconds())}+08:00`
}
