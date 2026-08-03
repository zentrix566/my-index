/**
 * 「抵御心魔」前端 API 客户端。
 * 业务接口统一挂在 /api/willpower 下；认证接口在 /api/willpower/auth。
 * 同源请求自动携带 wp_token Cookie，无需手动设置 credentials。
 */

async function readJson(resp) {
  const text = await resp.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('服务响应格式异常，请确认后端服务已正常启动')
  }
}

async function request(url, options = {}) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await readJson(resp)
  if (!resp.ok) throw new Error(data.error || '请求失败，请稍后重试')
  return data
}

const BASE = '/api/willpower'

export const willpowerApi = {
  // 公开目录：内置心魔 / 正能量活动 / 可用成就规则
  catalog() {
    return request(`${BASE}/catalog`)
  },

  // 心魔：内置与用户自定义合并后的完整列表
  listDemons() {
    return request(`${BASE}/demons`)
  },
  createDemon(payload) {
    return request(`${BASE}/demons`, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateDemon(demonKey, payload) {
    return request(`${BASE}/demons/${encodeURIComponent(demonKey)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },
  deleteDemon(demonKey) {
    return request(`${BASE}/demons/${encodeURIComponent(demonKey)}`, { method: 'DELETE' })
  },
  reorderDemons(keys) {
    return request(`${BASE}/demons/reorder`, { method: 'POST', body: JSON.stringify({ keys }) })
  },

  // 正能量活动（可配置类型）
  listActivities() {
    return request(`${BASE}/activities`)
  },
  createActivity(payload) {
    return request(`${BASE}/activities`, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateActivity(activityKey, payload) {
    return request(`${BASE}/activities/${encodeURIComponent(activityKey)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },
  deleteActivity(activityKey) {
    return request(`${BASE}/activities/${encodeURIComponent(activityKey)}`, { method: 'DELETE' })
  },

  // 抵御记录
  listResistances(limit = 50) {
    return request(`${BASE}/resistances?limit=${limit}`)
  },
  createResistance(payload) {
    return request(`${BASE}/resistances`, { method: 'POST', body: JSON.stringify(payload) })
  },
  resolveResistance(id, result) {
    return request(`${BASE}/resistances/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ result })
    })
  },
  deleteResistance(id) {
    return request(`${BASE}/resistances/${id}`, { method: 'DELETE' })
  },
  updateResistance(id, payload) {
    return request(`${BASE}/resistances/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  // 日历点某天时拉取当天明细（抵御 + 正能量）
  dayDetail(date) {
    return request(`${BASE}/days/${encodeURIComponent(date)}`)
  },

  // 正能量记录
  listPositives() {
    return request(`${BASE}/positives`)
  },
  createPositive(payload) {
    return request(`${BASE}/positives`, { method: 'POST', body: JSON.stringify(payload) })
  },
  deletePositive(id) {
    return request(`${BASE}/positives/${id}`, { method: 'DELETE' })
  },
  updatePositive(id, payload) {
    return request(`${BASE}/positives/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  // 成就
  listAchievements() {
    return request(`${BASE}/achievements`)
  },
  createAchievement(payload) {
    return request(`${BASE}/achievements`, { method: 'POST', body: JSON.stringify(payload) })
  },
  deleteAchievement(code) {
    return request(`${BASE}/achievements/${encodeURIComponent(code)}`, { method: 'DELETE' })
  },

  // 数据看板
  overview() {
    return request(`${BASE}/overview`)
  },
  // AI 报告：scope 支持 last_week / today / date / range
  aiReport(payload) {
    return request(`${BASE}/ai-report`, { method: 'POST', body: JSON.stringify(payload) })
  },
  /** 获取缓存的 AI 报告（传 scope 返回单条，不传返回列表） */
  aiReportCache(scope) {
    return request(`${BASE}/ai-report${scope ? `?scope=${encodeURIComponent(scope)}` : ''}`)
  }
}

export default willpowerApi
