/**
 * 「日程管理」前端 API 客户端。
 * 业务接口统一挂在 /api/todo 下。
 * 认证复用站点统一登录（/api/auth/*，同源自动携带 site_token Cookie）。
 */

import { sortTodoLists } from '../constants.js'

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

const BASE = '/api/todo'

export const todoApi = {
  // 分组
  listLists() {
    return request(`${BASE}/lists`).then((data) => ({
      ...data,
      lists: sortTodoLists(data.lists || [])
    }))
  },
  createList(payload) {
    return request(`${BASE}/lists`, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateList(id, payload) {
    return request(`${BASE}/lists/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  deleteList(id) {
    return request(`${BASE}/lists/${id}`, { method: 'DELETE' })
  },
  restoreDefaultLists() {
    return request(`${BASE}/lists/restore-defaults`, { method: 'POST' })
  },

  // 任务
  listTasks(view) {
    return request(`${BASE}/tasks?view=${encodeURIComponent(view)}`)
  },
  createTask(payload) {
    return request(`${BASE}/tasks`, { method: 'POST', body: JSON.stringify(payload) })
  },
  updateTask(id, payload) {
    return request(`${BASE}/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  deleteTask(id) {
    return request(`${BASE}/tasks/${id}`, { method: 'DELETE' })
  },

  // 单日明细（日历点某天）
  dayDetail(date) {
    return request(`${BASE}/day/${encodeURIComponent(date)}`)
  },
  // 日历月视图聚合（含每日任务列表）
  calendar(month) {
    return request(`${BASE}/calendar?month=${encodeURIComponent(month)}`)
  },
  // 日期区间任务（周视图用）
  range(from, to) {
    return request(`${BASE}/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  },
  // AI 日程分析（day/week/month）
  aiAnalyze(payload) {
    return request(`${BASE}/ai-analyze`, { method: 'POST', body: JSON.stringify(payload) })
  }
}

export default todoApi
