import { nextTick, onBeforeUnmount, watch } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

// 弹窗打开期间锁定背景滚动：模块级计数器支持同屏多个/嵌套弹窗，
// 全部关闭后才恢复。补偿滚动条消失引起的页面横向跳动。
let scrollLockCount = 0
let savedBodyOverflow = ''
let savedBodyPaddingRight = ''

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow
    savedBodyPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

function unlockBodyScroll() {
  if (scrollLockCount === 0) return
  scrollLockCount -= 1
  if (scrollLockCount === 0) {
    document.body.style.overflow = savedBodyOverflow
    document.body.style.paddingRight = savedBodyPaddingRight
  }
}

/**
 * 为弹窗提供焦点进入/恢复、Tab 循环、Escape 关闭与背景滚动锁定。
 * @param {object} [options] lockScroll=true 时锁定背景滚动；浮层类弹窗可传 false，
 *                           让背景页面照常滚动、弹窗固定在视口不动。
 */
export function useDialogFocus(visible, dialogElement, close, { lockScroll = true } = {}) {
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
    if (lockScroll) unlockBodyScroll()
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
      if (lockScroll) lockBodyScroll()
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
