/**
 * 「日程管理」任务状态字典（前后端共用语义）。
 * 状态分两类：
 *   - 活跃态（isActive）：pending / in_progress / deferred / waiting，计入「未完成」
 *   - 终止态（terminal）：done（算完成）、cancelled（不算完成、也不计入完成率分母）
 * done 是唯一计入「完成」的状态；cancelled 是另一种终点态，应排除在完成率分母之外。
 */

export const TASK_STATUS_META = {
  pending: { label: '待办', color: '#3b82f6', done: false, terminal: false },
  in_progress: { label: '进行中', color: '#f59e0b', done: false, terminal: false },
  deferred: { label: '已延期', color: '#8b5cf6', done: false, terminal: false },
  waiting: { label: '等待中', color: '#ef4444', done: false, terminal: false },
  done: { label: '已完成', color: '#22c55e', done: true, terminal: true },
  cancelled: { label: '已取消', color: '#94a3b8', done: false, terminal: true }
}

// 列表/下拉展示顺序（与任务排序权重保持一致）
export const TASK_STATUS_ORDER = [
  'done',
  'cancelled',
  'in_progress',
  'pending',
  'deferred',
  'waiting'
]

// 排序权重：直接由 TASK_STATUS_ORDER 派生，靠前的权重小（排在前面）。
// 修改展示顺序只需改上面的 TASK_STATUS_ORDER，这里自动同步。
export const TASK_STATUS_WEIGHT = Object.fromEntries(
  TASK_STATUS_ORDER.map((key, i) => [key, i])
)

export const TASK_STATUS_LIST = TASK_STATUS_ORDER.map((key) => ({
  value: key,
  ...TASK_STATUS_META[key]
}))

const CALENDAR_TASK_STATUS_ORDER = [
  'done',
  'pending',
  'in_progress',
  'deferred',
  'waiting',
  'cancelled'
]
const CALENDAR_TASK_STATUS_WEIGHT = Object.fromEntries(
  CALENDAR_TASK_STATUS_ORDER.map((key, index) => [key, index])
)

/** 日历内按已完成、待办、其余状态排列，同状态保持接口原有顺序。 */
export function sortCalendarTasks(tasks = []) {
  return [...tasks].sort((a, b) => {
    const fallbackWeight = CALENDAR_TASK_STATUS_ORDER.length
    const aWeight = CALENDAR_TASK_STATUS_WEIGHT[a.status] ?? fallbackWeight
    const bWeight = CALENDAR_TASK_STATUS_WEIGHT[b.status] ?? fallbackWeight
    return aWeight - bWeight
  })
}

export const isDoneStatus = (status) => status === 'done'
export const isCancelledStatus = (status) => status === 'cancelled'
export const isActiveStatus = (status) =>
  status !== 'done' && status !== 'cancelled'

/** 取状态元信息（缺省回退到 pending），用于渲染文案/颜色。 */
export function statusMeta(status) {
  return TASK_STATUS_META[status] || TASK_STATUS_META.pending
}

/** 状态下拉框的内联样式：用状态色描边与着色，直观区分。 */
export function statusStyle(status) {
  const meta = statusMeta(status)
  return { color: meta.color, borderColor: meta.color }
}

// 默认分组固定顺序（「工作 / 学习 / 生活」），其余分组排在其后。
export const DEFAULT_LIST_ORDER = ['工作', '学习', '生活']

/**
 * 分组列表排序：默认三组永远排在最前且按 工作→学习→生活 固定顺序，
 * 其余分组保持后端给出的 (sort_order, id) 顺序。用于侧边栏、筛选下拉等所有分组列表。
 */
export function sortTodoLists(lists = []) {
  const rank = (l) => {
    const i = DEFAULT_LIST_ORDER.indexOf(l.name)
    return i === -1 ? DEFAULT_LIST_ORDER.length : i
  }
  return [...lists].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    const sa = a.sortOrder ?? 0
    const sb = b.sortOrder ?? 0
    if (sa !== sb) return sa - sb
    return (a.id ?? 0) - (b.id ?? 0)
  })
}
