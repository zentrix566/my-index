/**
 * 炉石卡组分享 API：保存、我的卡组、公开广场、编辑与删除。
 * 统一走 src/api/http.js，错误时抛出带 status 的 Error。
 */
import { http } from '../../../api/http.js'

/** 保存卡组（deckCode 必填；achievementId 可选关联成就；visibility 取 private/public）。 */
export function createDeck(payload) {
  return http.post('/api/hearthstone/decks', payload)
}

/** 我的卡组列表（含私密，含卡组代码与快照）。 */
export function fetchMyDecks() {
  return http.get('/api/hearthstone/decks/mine', { cache: 'no-store' })
}

/** 公开卡组广场：class/format/q/achievement/page 均可选。 */
export function fetchPublicDecks(params = {}) {
  const query = new URLSearchParams()
  if (params.class) query.set('class', params.class)
  if (params.format) query.set('format', String(params.format))
  if (params.q) query.set('q', params.q)
  if (params.achievement) query.set('achievement', params.achievement)
  if (params.page) query.set('page', String(params.page))
  const qs = query.toString()
  return http.get(`/api/hearthstone/decks/public${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
}

/** 批量拉取一批成就的玩家分享卡组（公开，每成就最多 3 套），返回 { 成就slug: [卡组] }。 */
export function fetchDecksByAchievements(ids) {
  return http.get(`/api/hearthstone/decks/public/by-achievements?ids=${encodeURIComponent(ids.join(','))}`, { cache: 'no-store' })
}

/** 卡组详情（含卡组代码与快照）。 */
export function fetchDeckDetail(id) {
  return http.get(`/api/hearthstone/decks/${id}`, { cache: 'no-store' })
}

/** 修改名称/描述/可见性。 */
export function updateDeck(id, patch) {
  return http.patch(`/api/hearthstone/decks/${id}`, patch)
}

/** 删除卡组。 */
export function deleteDeck(id) {
  return http.delete(`/api/hearthstone/decks/${id}`)
}

/** 管理列表（仅所有者，含被隐藏卡组）。 */
export function fetchAllDecksAdmin(params = {}) {
  const query = new URLSearchParams()
  if (params.visibility) query.set('visibility', params.visibility)
  if (params.page) query.set('page', String(params.page))
  const qs = query.toString()
  return http.get(`/api/hearthstone/decks/admin/all${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
}

/** 管理员隐藏/恢复卡组（visibility 取 hidden/public）。 */
export function moderateDeck(id, visibility) {
  return http.patch(`/api/hearthstone/decks/${id}/moderation`, { visibility })
}
