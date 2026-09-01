import { request } from '../../../api/http.js'

const BASE = '/api/notes'
export const notesApi = {
  list: (month) => request(`${BASE}/?month=${encodeURIComponent(month || '')}`),
  create: (payload) => request(BASE, { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
  uploadImage: async (id, file) => {
    const response = await fetch(`${BASE}/${id}/images`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name || '图片') },
      body: file
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '图片上传失败，请稍后重试')
    return data
  },
  removeImage: (noteId, imageId) => request(`${BASE}/${noteId}/images/${imageId}`, { method: 'DELETE' }),
  analyze: (monthKey) => request(`${BASE}/ai-analysis`, { method: 'POST', body: JSON.stringify({ monthKey }) }),
  seedAugust: () => request(`${BASE}/seed-august-2026`, { method: 'POST' })
}
