import { ref } from 'vue'
import {
  fetchHearthstoneProfile,
  saveHearthstoneProfile as saveProfileRequest,
  mergeHearthstoneCollection as mergeCollectionRequest,
  setHearthstoneCosmeticOwned as setCosmeticOwnedRequest,
  clearHearthstoneCollectionType as clearCollectionTypeRequest
} from '../api/profile.js'
import { MAX_PINNED_ACHIEVEMENTS } from '../utils/constants.js'

const DEFAULT_PROFILE = Object.freeze({
  pinnedAchievementIds: [],
  collection: {
    heroSkins: [],
    coins: [],
    cardBacks: [],
    pets: []
  },
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
      .slice(0, MAX_PINNED_ACHIEVEMENTS),
    collection: {
      heroSkins: normalizeIds(value?.collection?.heroSkins),
      coins: normalizeIds(value?.collection?.coins),
      cardBacks: normalizeIds(value?.collection?.cardBacks),
      pets: normalizeIds(value?.collection?.pets)
    },
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

function normalizeIds(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string'))]
    : []
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
  // 未加载完成时拒绝保存，避免用默认空档案覆盖已存在的置顶与偏好。
  if (!loaded.value) {
    throw new Error('个人配置尚未加载，请稍候重试')
  }
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

async function runCollectionMutation(request, fallbackMessage) {
  if (!loaded.value) throw new Error('个人配置尚未加载，请稍候重试')
  saving.value = true
  error.value = ''
  try {
    const data = await request()
    profile.value = normalizeProfile(data)
    loaded.value = true
    return profile.value
  } catch (cause) {
    error.value = cause.message || fallbackMessage
    throw cause
  } finally {
    saving.value = false
  }
}

function mergeCollection(collection) {
  return runCollectionMutation(
    () => mergeCollectionRequest(collection),
    '导入收藏失败'
  )
}

function setCollectionOwned(type, id, owned) {
  return runCollectionMutation(
    () => setCosmeticOwnedRequest(type, id, owned),
    '保存收藏失败'
  )
}

function clearCollectionType(type) {
  return runCollectionMutation(
    () => clearCollectionTypeRequest(type),
    '批量清空收藏失败'
  )
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
  return {
    profile,
    loaded,
    loading,
    saving,
    error,
    load,
    save,
    mergeCollection,
    setCollectionOwned,
    clearCollectionType,
    clear
  }
}
