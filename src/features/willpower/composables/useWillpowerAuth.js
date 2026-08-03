/**
 * 心魔模块独立认证状态 composable（全局单例，与站点主账号隔离）。
 * 登录态由后端 httpOnly Cookie（wp_token）承载，前端只维护 user 状态。
 * 所有请求同源，浏览器自动携带 Cookie，无需手动设置 credentials。
 */
import { ref } from 'vue'

const user = ref(null)
const initialized = ref(false)
const initializing = ref(false)
let initPromise = null

async function readJsonResponse(resp) {
  const text = await resp.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('服务响应格式异常，请确认后端服务已正常启动')
  }
}

async function init() {
  if (initialized.value || initializing.value) return initPromise
  initializing.value = true
  initPromise = (async () => {
    try {
      const resp = await fetch('/api/willpower/auth/me')
      const data = await readJsonResponse(resp)
      user.value = data.user || null
    } catch {
      user.value = null
    } finally {
      initialized.value = true
      initializing.value = false
    }
  })()
  return initPromise
}

// 绕过缓存守卫强制重拉（登录/注册/重置成功后调用）
async function refreshUser() {
  try {
    const resp = await fetch('/api/willpower/auth/me')
    const data = await readJsonResponse(resp)
    user.value = data.user || null
  } catch {
    user.value = null
  }
  return user.value
}

async function login(username, password) {
  const resp = await fetch('/api/willpower/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '登录失败')
  await refreshUser()
  return data.user
}

async function register(username, password, email) {
  const resp = await fetch('/api/willpower/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '注册失败')
  await refreshUser()
  return data.user
}

async function logout() {
  try {
    await fetch('/api/willpower/auth/logout', { method: 'POST' })
  } finally {
    user.value = null
  }
}

async function forgotPassword(identifier) {
  const resp = await fetch('/api/willpower/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  return data.message || '如果该账号存在且已绑定邮箱，我们已发送重置邮件。'
}

async function resetPassword(token, password) {
  const resp = await fetch('/api/willpower/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  await refreshUser()
  return data
}

async function updateProfile(payload) {
  const resp = await fetch('/api/willpower/auth/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  if (data.user) user.value = { ...user.value, ...data.user }
  return data.user
}

async function changePassword(currentPassword, newPassword) {
  const resp = await fetch('/api/willpower/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  return data
}

export function useWillpowerAuth() {
  return {
    user,
    initialized,
    initializing,
    init,
    refreshUser,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword
  }
}
