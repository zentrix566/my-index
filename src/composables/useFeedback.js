import { ref } from 'vue'

const toasts = ref([])
const confirmation = ref(null)
let nextToastId = 1

function dismiss(id) {
  const index = toasts.value.findIndex((item) => item.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function push(message, options = {}) {
  const id = nextToastId++
  const toast = {
    id,
    message,
    type: options.type || 'info',
    actionLabel: options.actionLabel || '',
    action: options.action || null,
    busy: false
  }
  toasts.value.push(toast)
  const duration = options.duration ?? (toast.action ? 5000 : 3200)
  if (duration > 0) window.setTimeout(() => dismiss(id), duration)
  return id
}

async function runAction(toast) {
  if (!toast.action || toast.busy) return
  toast.busy = true
  try {
    await toast.action()
    dismiss(toast.id)
  } catch (error) {
    toast.busy = false
    push(error.message || '操作失败，请稍后重试', { type: 'error' })
  }
}

function confirm(options) {
  return new Promise((resolve) => {
    confirmation.value = {
      title: options.title || '确认操作',
      message: options.message || '',
      confirmLabel: options.confirmLabel || '确认',
      cancelLabel: options.cancelLabel || '取消',
      danger: options.danger !== false,
      resolve
    }
  })
}

function resolveConfirmation(result) {
  const current = confirmation.value
  confirmation.value = null
  current?.resolve(result)
}

/** 提供全站统一的轻提示、可撤销操作与确认弹窗。 */
export function useFeedback() {
  return { toasts, confirmation, push, dismiss, runAction, confirm, resolveConfirmation }
}

