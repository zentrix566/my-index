import { ref } from 'vue'

const toasts = ref([])
let sequence = 0

function dismiss(id) {
  const index = toasts.value.findIndex((item) => item.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function push(message, options = {}) {
  const id = ++sequence
  const type = options.type || 'info'
  const ttl = options.ttl || 3800
  toasts.value.push({ id, message, type })
  window.setTimeout(() => dismiss(id), ttl)
  return id
}

export function useToast() {
  return {
    toasts,
    push,
    success: (message, options) => push(message, { ...options, type: 'success' }),
    error: (message, options) => push(message, { ...options, type: 'error' }),
    info: (message, options) => push(message, { ...options, type: 'info' }),
    dismiss
  }
}
