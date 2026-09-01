import { request } from '../../../api/http.js'

const BASE = '/api/notes'
export const notesApi = {
  list: (month) => request(`${BASE}/?month=${encodeURIComponent(month || '')}`),
  create: (payload) => request(BASE, { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
  analyze: (monthKey) => request(`${BASE}/ai-analysis`, { method: 'POST', body: JSON.stringify({ monthKey }) }),
  seedAugust: () => request(`${BASE}/seed-august-2026`, { method: 'POST' })
}
