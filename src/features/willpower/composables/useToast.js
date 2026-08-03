/**
 * 轻量全局 Toast，用于在记录成功后弹出「解锁新成就」等提示。
 * 模块级单例，任意页面 import 后共享同一队列。
 */
import { ref } from 'vue'

const toasts = ref([])
let seq = 0

function push(message, opts = {}) {
  const id = ++seq
  const type = opts.type || 'info'
  const ttl = opts.ttl || 3800
  toasts.value.push({ id, message, type })
  setTimeout(() => dismiss(id), ttl)
  return id
}

function dismiss(id) {
  const idx = toasts.value.findIndex((item) => item.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

export function useToast() {
  return { toasts, push, dismiss }
}
