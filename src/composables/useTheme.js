import { ref, watch } from 'vue'

const THEME_STORAGE_KEY = 'site-theme'
const LEGACY_HEARTHSTONE_THEME_KEY = 'hs-theme'
const theme = ref(readInitialTheme())
let persistenceStarted = false

function readInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored

    const legacyTheme = localStorage.getItem(LEGACY_HEARTHSTONE_THEME_KEY)
    if (legacyTheme === 'light' || legacyTheme === 'dark') return legacyTheme

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyTheme(nextTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
}

function startPersistence() {
  if (persistenceStarted) return
  persistenceStarted = true
  applyTheme(theme.value)
  watch(theme, (nextTheme) => {
    applyTheme(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      localStorage.removeItem(LEGACY_HEARTHSTONE_THEME_KEY)
    } catch {
      // 隐私模式禁用本地存储时，主题仍在当前页面内生效。
    }
  })
}

/** 返回全站共享并持久化的白天/黑夜主题状态。 */
export function useTheme() {
  startPersistence()
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  return { theme, toggleTheme }
}
