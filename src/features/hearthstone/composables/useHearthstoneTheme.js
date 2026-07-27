import { ref, watch } from 'vue'

const THEME_STORAGE_KEY = 'hs-theme'
const sharedTheme = ref(readStoredTheme())
let watcherStarted = false

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function startPersistence() {
  if (watcherStarted) return
  watcherStarted = true
  watch(sharedTheme, (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // 隐私模式禁用本地存储时仍允许当前页面切换主题。
    }
  })
}

/** 返回跨炉石页面共享并持久化的主题状态。 */
export function useHearthstoneTheme() {
  startPersistence()
  const toggleTheme = () => {
    sharedTheme.value = sharedTheme.value === 'dark' ? 'light' : 'dark'
  }
  return { hsTheme: sharedTheme, toggleTheme }
}
