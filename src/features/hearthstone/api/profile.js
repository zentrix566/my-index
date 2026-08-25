async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || '请求失败')
  return data
}

/** 读取当前登录用户的炉石置顶成就与显示偏好。 */
export async function fetchHearthstoneProfile() {
  const response = await fetch('/api/hearthstone/profile', {
    cache: 'no-store',
    credentials: 'same-origin'
  })
  return parseResponse(response)
}

/** 保存当前登录用户的炉石置顶成就与显示偏好。 */
export async function saveHearthstoneProfile(profile) {
  const response = await fetch('/api/hearthstone/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      pinnedAchievementIds: profile.pinnedAchievementIds,
      preferences: profile.preferences
    })
  })
  return parseResponse(response)
}

/** 增量合并收藏导入，已有收藏不会被删除。 */
export async function mergeHearthstoneCollection(collection) {
  const response = await fetch('/api/hearthstone/collection/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ collection })
  })
  return parseResponse(response)
}

/** 设置一个收藏项的拥有状态。 */
export async function setHearthstoneCosmeticOwned(type, id, owned) {
  const response = await fetch('/api/hearthstone/collection/item', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ type, id, owned })
  })
  return parseResponse(response)
}

/** 用户明确确认后清空一种收藏。 */
export async function clearHearthstoneCollectionType(type) {
  const response = await fetch(`/api/hearthstone/collection/${encodeURIComponent(type)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ confirm: true })
  })
  return parseResponse(response)
}
