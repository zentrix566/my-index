/**
 * 「日程管理」任务状态字典（前后端共用语义）。
 * 状态分三类：
 *   - 活跃态（isActive）：只有 pending，计入「未完成」与完成率、进今日待办待处理与逾期提醒
 *   - 挂起态（isParked）：suspended，在今日待办中单独分区展示方便知晓，但不标逾期、
 *     不计未完成与完成率、不进侧边栏角标；曾挂起的任务完成后也不算「晚于预期」
 *     （was_suspended 由服务端持久化，进入挂起态时置位，见 server/todo/db.js）
 *   - 终止态（terminal）：done（算完成）、cancelled（不算完成、也不计入完成率分母）
 * done 是唯一计入「完成」的状态；cancelled 是另一种终点态，应排除在完成率分母之外。
 */

export const TASK_STATUS_META = {
  pending: { label: '待办', color: '#3b82f6', done: false, terminal: false, parked: false },
  suspended: { label: '已挂起', color: '#f59e0b', done: false, terminal: false, parked: true },
  done: { label: '已完成', color: '#22c55e', done: true, terminal: true, parked: false },
  cancelled: { label: '已取消', color: '#94a3b8', done: false, terminal: true, parked: false }
}

// 列表/下拉展示顺序（与任务排序权重保持一致）
export const TASK_STATUS_ORDER = [
  'pending',
  'suspended',
  'done',
  'cancelled'
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
  'suspended',
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
export const isParkedStatus = (status) => status === 'suspended'
export const isActiveStatus = (status) =>
  status !== 'done' && status !== 'cancelled' && status !== 'suspended'

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
