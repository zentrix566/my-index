const loadWithStyles = (loadPage) => Promise.all([import('./styles/notes.css'), loadPage()]).then(([, page]) => page)
export const loadNotesPage = () => loadWithStyles(() => import('./pages/NotesPage.vue'))
