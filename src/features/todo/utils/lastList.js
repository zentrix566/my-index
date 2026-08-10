// 记住「上次新建任务时选择的分组」，让下次新建默认带出该分组。
// 仅前端记忆（localStorage），不依赖服务端；每个浏览器独立。
const KEY = 'todo:lastListId'

export function getLastListId() {
  try {
    const v = localStorage.getItem(KEY)
    return v ? Number(v) : ''
  } catch {
    return ''
  }
}

export function setLastListId(id) {
  try {
    if (id) localStorage.setItem(KEY, String(id))
  } catch {
    /* 忽略：隐私模式等无法写入场景 */
  }
}

/** 分组被删除时清掉记忆（不传 id 则无条件清空），避免默认带出已不存在的分组。 */
export function clearLastListId(id) {
  try {
    if (id === undefined || String(getLastListId()) === String(id)) {
      localStorage.removeItem(KEY)
    }
  } catch {
    /* 忽略 */
  }
}
