// 「抵御心魔」模块懒加载入口。每个页面单独成 chunk。
const loadWithStyles = (loadPage) => Promise.all([
  import('./styles/index.js'),
  loadPage()
]).then(([, page]) => page)

export const loadWillpowerHome = () => loadWithStyles(() => import('./pages/WillpowerHome.vue'))
export const loadWillpowerAchievements = () => loadWithStyles(() => import('./pages/AchievementsPage.vue'))
export const loadWillpowerProfile = () => loadWithStyles(() => import('./pages/ProfilePage.vue'))
export const loadWillpowerPositive = () => loadWithStyles(() => import('./pages/PositivePage.vue'))
export const loadWillpowerCalendar = () => loadWithStyles(() => import('./pages/CalendarPage.vue'))
export const loadWillpowerAiAnalysis = () => loadWithStyles(() => import('./pages/AiAnalysisPage.vue'))
export const loadWillpowerData = () => loadWithStyles(() => import('./pages/DataDashboardPage.vue'))
