/**
 * 心魔模块统一时间工具：所有时间戳以「北京时间（Asia/Shanghai, UTC+8）」为准。
 * - 入库时间存为带 +08:00 偏移的 ISO 字符串（如 2026-08-03T15:46:50.417+08:00），
 *   这样数据库里看到的就是北京时间，且 new Date() 仍能正确还原绝对时刻用于聚合。
 * - 展示一律用 formatBeijing / toBeijingInput 显式按北京时区格式化，与浏览器所在时区无关。
 */

import { formatBeijingIso } from '../../../utils/date.js'

export const BEIJING_TZ = 'Asia/Shanghai'

/** 当前北京时间，ISO 字符串带 +08:00 偏移。 */
export function nowBeijingIso() {
  return formatBeijingIso()
}

/** 把任意 ISO / 时间戳格式化为北京时间的「MM-DD HH:mm」。无效返回空串。 */
export function formatBeijing(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BEIJING_TZ,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d)
  const map = {}
  for (const p of parts) map[p.type] = p.value
  return `${map.month}-${map.day} ${map.hour}:${map.minute}`
}

/** 把任意 ISO 转成 datetime-local 用的「YYYY-MM-DDTHH:mm」（北京时间墙钟），供编辑输入框回填。 */
export function toBeijingInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BEIJING_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d)
  const map = {}
  for (const p of parts) map[p.type] = p.value
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`
}

/** 把 datetime-local 字符串（北京时间墙钟）解析回带 +08:00 的 ISO，入库即北京时间。 */
export function fromBeijingInput(localStr) {
  if (!localStr) return ''
  // localStr 形如 2026-08-03T15:46 或 2026-08-03T15:46:00
  const normalized = localStr.length === 16 ? `${localStr}:00` : localStr
  const d = new Date(`${normalized}+08:00`)
  if (Number.isNaN(d.getTime())) return ''
  return normalized + '+08:00'
}
