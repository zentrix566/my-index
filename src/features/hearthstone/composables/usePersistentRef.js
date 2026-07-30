import { ref, watch } from 'vue'

// 带 localStorage 持久化的 ref：用于在前端记住用户的视图/筛选偏好，避免刷新后重置。
// boolean：以 '1' / '0' 存储；其余以字符串存储。
// 读取或写入失败（隐私模式 / 无 localStorage）时静默降级为纯内存态。
export function usePersistentRef(key, initial, { boolean = false } = {}) {
  let start = initial
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw != null) start = boolean ? raw === '1' : raw
    }
  } catch {
    // 忽略存储读取异常，退回默认值
  }

  const state = ref(start)

  watch(state, (v) => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(key, boolean ? (v ? '1' : '0') : String(v))
    } catch {
      // 忽略存储写入异常（如隐私模式）
    }
  })

  return state
}
