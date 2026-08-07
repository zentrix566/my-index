import { useTheme } from '../../../composables/useTheme.js'

/** 兼容炉石页面原有接口，主题状态统一交由全站主题管理。 */
export function useHearthstoneTheme() {
  const { theme, toggleTheme } = useTheme()
  return { hsTheme: theme, toggleTheme }
}
