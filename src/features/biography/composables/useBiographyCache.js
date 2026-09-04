const STORAGE_KEY = 'biography:results-v3'
const MAX_ENTRIES = 20

function loadEntries() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

const entries = loadEntries()

function persistEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // 隐私模式或存储配额不足时，查询功能仍保持可用。
  }
}

function evictOldestEntries() {
  const keys = Object.keys(entries)
  if (keys.length <= MAX_ENTRIES) return

  keys
    .sort((left, right) => (entries[left]?.savedAt || 0) - (entries[right]?.savedAt || 0))
    .slice(0, keys.length - MAX_ENTRIES)
    .forEach((key) => delete entries[key])
}

/** 统一查询缓存键，避免首尾或连续空白产生重复记录。 */
export function normalizeBiographyName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ')
}

/** 提供人物纪年查询结果的本地缓存与最近查询列表。 */
export function useBiographyCache() {
  return {
    get(name) {
      const key = normalizeBiographyName(name)
      return key ? entries[key] : undefined
    },
    save(name, result) {
      const key = normalizeBiographyName(name)
      if (!key || !result) return

      entries[key] = {
        name: key,
        result,
        savedAt: Date.now()
      }
      evictOldestEntries()
      persistEntries()
    },
    recent(limit = MAX_ENTRIES) {
      return Object.values(entries)
        .filter((entry) => entry?.name && entry?.result && Number.isFinite(entry.savedAt))
        .sort((left, right) => right.savedAt - left.savedAt)
        .slice(0, limit)
        .map(({ name, savedAt }) => ({ name, savedAt }))
    }
  }
}
