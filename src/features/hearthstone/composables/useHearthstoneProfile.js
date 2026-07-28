import { ref } from 'vue'
import {
  fetchHearthstoneProfile,
  saveHearthstoneProfile as saveProfileRequest
} from '../api/profile.js'

const DEFAULT_PROFILE = Object.freeze({
  pinnedAchievementIds: [],
  preferences: {
    hardcore: false,
    defaultExpansionId: '',
    compactMode: false
  },
  updatedAt: null
})

const profile = ref(structuredClone(DEFAULT_PROFILE))
const loaded = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
let loadPromise = null

function normalizeProfile(value) {
  const rawPinnedIds = Array.isArray(value?.pinnedAchievementIds)
    ? value.pinnedAchievementIds
    : typeof value?.pinnedAchievementId === 'string'
      ? [value.pinnedAchievementId]
      : []
  return {
    pinnedAchievementIds: [...new Set(rawPinnedIds.filter((id) => typeof id === 'string'))]
      .slice(0, 5),
    preferences: {
      hardcore: value?.preferences?.hardcore === true,
      defaultExpansionId:
        typeof value?.preferences?.defaultExpansionId === 'string'
          ? value.preferences.defaultExpansionId
          : '',
      compactMode: value?.preferences?.compactMode === true
    },
    updatedAt: value?.updatedAt || null
  }
}

async function load({ force = false } = {}) {
  if (!force && loaded.value) return profile.value
  if (loading.value) return loadPromise
  loading.value = true
  error.value = ''
  loadPromise = fetchHearthstoneProfile()
    .then((data) => {
      profile.value = normalizeProfile(data)
      loaded.value = true
      return profile.value
    })
    .catch((cause) => {
      error.value = cause.message || '读取个人配置失败'
      throw cause
    })
    .finally(() => {
      loading.value = false
      loadPromise = null
    })
  return loadPromise
}

async function save(nextProfile) {
  saving.value = true
  error.value = ''
  try {
    const data = await saveProfileRequest(normalizeProfile(nextProfile))
    profile.value = normalizeProfile(data)
    loaded.value = true
    return profile.value
  } catch (cause) {
    error.value = cause.message || '保存个人配置失败'
    throw cause
  } finally {
    saving.value = false
  }
}

function clear() {
  profile.value = structuredClone(DEFAULT_PROFILE)
  loaded.value = false
  loading.value = false
  saving.value = false
  error.value = ''
  loadPromise = null
}

export function useHearthstoneProfile() {
  return { profile, loaded, loading, saving, error, load, save, clear }
}
