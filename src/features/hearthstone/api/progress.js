import { request } from '../../../api/http.js'

/** 保存一组炉石成就进度，并统一处理服务端错误。 */
export function saveAchievementProgress(progress) {
  return request('/api/achievements/progress', {
    method: 'PUT',
    body: JSON.stringify({ progress })
  })
}

/** 读取当前登录用户的炉石置顶成就与显示偏好。 */
export function fetchHearthstoneProfile() {
  return request('/api/hearthstone/profile', { cache: 'no-store' })
}

/** 保存当前登录用户的炉石置顶成就与显示偏好。 */
export function saveHearthstoneProfile(profile) {
  return request('/api/hearthstone/profile', {
    method: 'PUT',
    body: JSON.stringify({
      pinnedAchievementIds: profile.pinnedAchievementIds,
      preferences: profile.preferences
    })
  })
}
