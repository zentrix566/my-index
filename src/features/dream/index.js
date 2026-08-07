const loadWithStyles = (loadPage) => Promise.all([
  import('./styles/dream.css'),
  loadPage()
]).then(([, page]) => page)

export const loadDreamPage = () => loadWithStyles(() => import('./pages/DreamPage.vue'))
