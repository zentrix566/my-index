/**
 * 认证模块：注册 / 登录 / 登出 / 当前用户
 * - 密码仅存 bcrypt 哈希
 * - 登录态用 httpOnly Cookie 承载 JWT
 * - 注册/登录加限流（express-rate-limit）；Turnstile 人机验证后续接 TURNSTILE_SECRET 时补
 */
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { getUserByUsername, createUser, getUserById } from './db.js'
import { appLog } from './logger.js'

const router = express.Router()
const SALT_ROUNDS = 10
const TOKEN_NAME = 'ztt_token' // zentrix token
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'

// CF 在边缘终止 TLS 后，原始协议在 x-forwarded-proto 里
function isHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
}

function signToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' })
}

function setTokenCookie(req, res, userId) {
  res.cookie(TOKEN_NAME, signToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(req),
    maxAge: 30 * 24 * 60 * 60 * 1000
  })
}

// 登录/注册限流：单 IP 每分钟最多 10 次，挡暴力破解与机器人
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // 已通过 `trust proxy = 1` 正确限定可信任代理，显式关闭限流器的 trust proxy 校验
  validate: { trustProxy: false },
  message: { error: '尝试过于频繁，请稍后再试' }
})

// 鉴权中间件：解析 Cookie 中的 JWT，注入 req.userId
// 失败返回 401，业务接口（如 PUT 进度）前置使用
export function requireAuth(req, res, next) {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.uid
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期' })
  }
}

// 宽松解析：返回 userId 或 null（不抛错），供 GET 进度等「可选登录」接口使用
export function getUserIdFromReq(req) {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET).uid
  } catch {
    return null
  }
}

// 注册
router.post('/register', authLimiter, async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' })
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: '用户名需 3-20 个字符' })
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return res.status(400).json({ error: '用户名仅限字母、数字、下划线、中文' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' })
  }
  if (getUserByUsername(username)) {
    return res.status(409).json({ error: '用户名已存在' })
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const id = createUser(username, hash)
  setTokenCookie(req, res, id)
  appLog('AUTH', `注册成功: ${username} (id=${id})`)
  res.json({ ok: true, user: { id, username } })
})

// 登录
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body || {}
  const user = getUserByUsername(username)
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  setTokenCookie(req, res, user.id)
  appLog('AUTH', `登录成功: ${user.username} (id=${user.id})`)
  res.json({ ok: true, user: { id: user.id, username: user.username } })
})

// 登出
router.post('/logout', (req, res) => {
  const token = req.cookies?.[TOKEN_NAME]
  let who = '未知'
  if (token) {
    try {
      const p = jwt.verify(token, JWT_SECRET)
      const u = getUserById(p.uid)
      who = u ? u.username : `#${p.uid}`
    } catch { /* ignore */ }
  }
  res.clearCookie(TOKEN_NAME)
  appLog('AUTH', `登出: ${who}`)
  res.json({ ok: true })
})

// 当前登录用户（供前端初始化 auth 状态）
router.get('/me', (req, res) => {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return res.json({ user: null })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = getUserById(payload.uid)
    return res.json({ user: user ? { id: user.id, username: user.username } : null })
  } catch {
    return res.json({ user: null })
  }
})

export default router

if (!process.env.JWT_SECRET) {
  appLog('WARN', '未设置 JWT_SECRET，使用默认不安全密钥；生产环境请通过环境变量/Secret 配置')
}
