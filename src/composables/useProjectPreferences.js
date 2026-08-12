import { computed, ref } from 'vue'

const FAVORITES_KEY = 'zentrix-project-favorites'
const RECENTS_KEY = 'zentrix-project-recents'

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const favorites = ref(readList(FAVORITES_KEY))
const recents = ref(readList(RECENTS_KEY))

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function toggleFavorite(path) {
  favorites.value = favorites.value.includes(path)
    ? favorites.value.filter((item) => item !== path)
    : [path, ...favorites.value]
  persist(FAVORITES_KEY, favorites.value)
}

function recordVisit(path) {
  recents.value = [path, ...recents.value.filter((item) => item !== path)].slice(0, 6)
  persist(RECENTS_KEY, recents.value)
}

/** 管理项目收藏与最近访问，数据仅保存在当前浏览器。 */
export function useProjectPreferences() {
  return {
    favorites,
    recents,
    favoriteSet: computed(() => new Set(favorites.value)),
    toggleFavorite,
    recordVisit
  }
}

