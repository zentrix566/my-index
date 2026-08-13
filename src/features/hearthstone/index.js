const loadWithStyles = (loadPage) => Promise.all([
  import('./styles/index.js'),
  loadPage()
]).then(([, page]) => page)

export const loadHearthstoneAchievementsPage = () => loadWithStyles(() => import('./pages/HearthstoneAchievements.vue'))
export const loadDeckCodeViewerPage = () => loadWithStyles(() => import('./pages/DeckCodeViewer.vue'))
export const loadTavernPassXpPage = () => loadWithStyles(() => import('./pages/TavernPassCalculator.vue'))
export const loadEventCalculatorPage = () => loadWithStyles(() => import('./pages/EventCalculator.vue'))
export const loadFrogSuspectCardPage = () => loadWithStyles(() => import('./pages/FrogSuspectCard.vue'))
export const loadFrogReviewPage = () => loadWithStyles(() => import('./pages/FrogReviewPage.vue'))
export const loadCardLookupPage = () => loadWithStyles(() => import('./pages/CardLookup.vue'))
export const loadHearthstoneCollectionPage = () => loadWithStyles(() => import('./pages/HearthstoneCollection.vue'))
