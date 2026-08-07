const loadWithStyles = (loadPage) => Promise.all([
  import('./styles/index.js'),
  loadPage()
]).then(([, page]) => page)

export const loadHearthstoneAchievementsPage = () => loadWithStyles(() => import('./pages/HearthstoneAchievements.vue'))
export const loadDeckCodeViewerPage = () => loadWithStyles(() => import('./pages/DeckCodeViewer.vue'))
export const loadTavernPassXpPage = () => loadWithStyles(() => import('./pages/TavernPassCalculator.vue'))
export const loadFrogSuspectCardPage = () => loadWithStyles(() => import('./pages/FrogSuspectCard.vue'))
