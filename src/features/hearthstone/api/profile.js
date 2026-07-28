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
    body: JSON.stringify(profile)
  })
  return parseResponse(response)
}
