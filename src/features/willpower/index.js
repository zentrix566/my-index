// 「抵御心魔」模块懒加载入口。每个页面单独成 chunk。
export const loadWillpowerHome = () => import('./pages/WillpowerHome.vue')
export const loadWillpowerAchievements = () => import('./pages/AchievementsPage.vue')
export const loadWillpowerProfile = () => import('./pages/ProfilePage.vue')
export const loadWillpowerPositive = () => import('./pages/PositivePage.vue')
export const loadWillpowerCalendar = () => import('./pages/CalendarPage.vue')
export const loadWillpowerAiAnalysis = () => import('./pages/AiAnalysisPage.vue')
export const loadWillpowerData = () => import('./pages/DataDashboardPage.vue')
export const loadWillpowerChangelog = () => import('./pages/ChangelogPage.vue')
