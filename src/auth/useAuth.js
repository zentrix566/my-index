/**
 * 认证状态 composable（全局单例）
 * 登录态由后端 httpOnly Cookie 承载，前端不存 token，只维护 user 状态。
 * 同源 fetch 自动携带 Cookie，无需手动设置 credentials。
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
    throw new Error('服务响应格式错误，请确认后端服务已正常启动')
  }
}

async function init() {
  if (initialized.value || initializing.value) return initPromise
  initializing.value = true
  initPromise = (async () => {
    try {
      const resp = await fetch('/api/auth/me')
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

// 强制重新拉取当前登录用户（绕过 init 的缓存守卫，供登录/注册成功后调用）
async function refreshUser() {
  try {
    const resp = await fetch('/api/auth/me')
    const data = await readJsonResponse(resp)
    user.value = data.user || null
  } catch {
    user.value = null
  }
  return user.value
}

async function login(username, password) {
  const resp = await fetch('/api/auth/login', {
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
  const resp = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(email ? { username, password, email } : { username, password })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '注册失败')
  await refreshUser()
  return data.user
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    user.value = null
  }
}

// 忘记密码：提交用户名/邮箱，后端统一返回（不暴露账号是否存在）
async function forgotPassword(identifier) {
  const resp = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  return data.message || '如果该账号存在且已绑定邮箱，我们已发送重置邮件。'
}

// 用链接 token 重置密码；成功后后端会直接登录，这里同步本地用户态
async function resetPassword(token, password) {
  const resp = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  await refreshUser()
  return data
}

// 已登录改密码：校验旧密码后设新密码
async function changePassword(currentPassword, newPassword) {
  const resp = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  return data
}

// 设置/清空绑定邮箱；空串视为清空。返回 needsActivation 提示是否发了激活邮件
async function setEmail(email) {
  const resp = await fetch('/api/auth/me/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  if (data.user) user.value = { ...user.value, ...data.user }
  return data
}

// 用链接 token 激活邮箱；成功后后端直接登录，这里同步本地用户态
async function verifyEmail(token) {
  const resp = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  await refreshUser()
  return data
}

// 首次设置密码（尚无密码的账号）；成功后刷新用户态（hasPassword 变为 true）
async function setPassword(newPassword) {
  const resp = await fetch('/api/auth/set-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  await refreshUser()
  return data
}

// 设置昵称（心魔等模块展示用）；成功后同步本地用户态
async function setDisplayName(displayName) {
  const resp = await fetch('/api/auth/display-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  if (data.user) user.value = { ...user.value, ...data.user }
  return data
}

async function setAvatar(avatar) {
  const resp = await fetch('/api/auth/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatar })
  })
  const data = await readJsonResponse(resp)
  if (!resp.ok) throw new Error(data.error || '操作失败')
  if (data.user) user.value = { ...user.value, ...data.user }
  return data
}

export function useAuth() {
  return {
    user,
    initialized,
    initializing,
    init,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    setEmail,
    verifyEmail,
    setPassword,
    setDisplayName,
    setAvatar
  }
}
