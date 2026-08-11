// 「日程管理」模块懒加载入口。每个页面单独成 chunk。
const loadWithStyles = (loadPage) => Promise.all([
  import('./styles/index.js'),
  loadPage()
]).then(([, page]) => page)

export const loadTodoHome = () => loadWithStyles(() => import('./pages/TodoHome.vue'))
export const loadTodoCalendar = () => loadWithStyles(() => import('./pages/TodoCalendar.vue'))
export const loadTodoManage = () => loadWithStyles(() => import('./pages/TodoManage.vue'))
export const loadTodoAi = () => loadWithStyles(() => import('./pages/TodoAiAnalysis.vue'))
export const loadTodoGroups = () => loadWithStyles(() => import('./pages/TodoGroups.vue'))
export const loadTodoProfile = () => loadWithStyles(() => import('./pages/TodoProfile.vue'))
