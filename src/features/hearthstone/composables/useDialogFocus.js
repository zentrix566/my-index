import { nextTick, onBeforeUnmount, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

/** 为弹窗提供焦点进入/恢复、Tab 循环和 Escape 关闭。 */
export function useDialogFocus(visible, dialogElement, close) {
  let previouslyFocused = null

  const focusableElements = () => {
    if (!dialogElement.value) return []
    return [...dialogElement.value.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((element) => !element.closest('[data-nested-dialog="true"]'))
  }

  const onKeydown = (event) => {
    if (!dialogElement.value) return
    if (event.key === 'Escape') {
      if (dialogElement.value.querySelector('[data-nested-dialog="true"]')) return
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab') return

    const elements = focusableElements()
    if (elements.length === 0) {
      event.preventDefault()
      dialogElement.value.focus()
      return
    }
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const stop = (restoreFocus = true) => {
    window.removeEventListener('keydown', onKeydown)
    if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus()
    previouslyFocused = null
  }

  watch(
    visible,
    (isVisible) => {
      if (!isVisible) {
        stop()
        return
      }
      previouslyFocused = document.activeElement
      window.addEventListener('keydown', onKeydown)
      nextTick(() => {
        const first = focusableElements()[0]
        ;(first || dialogElement.value)?.focus()
      })
    },
    { immediate: true }
  )

  onBeforeUnmount(() => stop(false))
}
