/**
 * 统一的同源 JSON 请求封装。
 */
export async function parseResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('服务响应格式异常，请确认后端服务已正常启动')
  }
}

export async function request(url, options = {}) {
  const headers = new Headers(options.headers || {})
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers
  })
  const data = await parseResponse(response)
  if (!response.ok) {
    const error = new Error(data.error || '请求失败，请稍后重试')
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

export const http = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, options) => request(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body, options) => request(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' })
}
