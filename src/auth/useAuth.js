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

async function init() {
  if (initialized.value || initializing.value) return initPromise
  initializing.value = true
  initPromise = (async () => {
    try {
      const resp = await fetch('/api/auth/me')
      const data = await resp.json()
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
    const data = await resp.json()
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
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || '登录失败')
  await refreshUser()
  return data.user
}

async function register(username, password) {
  const resp = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await resp.json()
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

export function useAuth() {
  return { user, initialized, initializing, init, login, register, logout }
}
