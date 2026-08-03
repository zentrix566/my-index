/**
 * 「抵御域外心魔」的独立认证：注册 / 登录 / 登出 / 当前用户 / 忘记密码 / 重置密码。
 * - 账号体系与炉石站点完全隔离：独立的 users 表、独立的 Cookie（wp_token）
 * - JWT 载荷带 scope 标记，避免与站点主 Token 互相冒用
 * - 密码只存 bcrypt 哈希；重置令牌库里只存 SHA-256，原始 token 仅出现在邮件链接
 */
import express from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { appLog } from '../logger.js'
import { sendPasswordResetEmail } from '../mailer.js'
import {
  consumeResetToken,
  createResetToken,
  createUser,
  getUserAuthById,
  getUserByEmail,
  getUserById,
  getUserByIdentifier,
  getUserByUsername,
  getValidResetToken,
  invalidateUserResetTokens,
  setUserEmail,
  updateDisplayName,
  updatePasswordById
} from './db.js'

const router = express.Router()
const SALT_ROUNDS = 10
const TOKEN_NAME = 'wp_token'
const TOKEN_SCOPE = 'willpower'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000

function isHttps(req) {
  return (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https'
}

function setTokenCookie(req, res, userId) {
  const token = jwt.sign({ uid: userId, scope: TOKEN_SCOPE }, JWT_SECRET, { expiresIn: '30d' })
  res.cookie(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(req),
    maxAge: 30 * 24 * 60 * 60 * 1000
  })
}

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: '尝试过于频繁，请稍后再试' }
})

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: '操作过于频繁，请稍后再试' }
})

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// 同一账号两次发信至少间隔 5 分钟（内存级即可挡住批量轰炸）
const resetCooldownMs = 5 * 60 * 1000
const lastResetSentAt = new Map()
function checkResetCooldown(key) {
  const last = lastResetSentAt.get(key)
  if (last && Date.now() - last < resetCooldownMs) return false
  lastResetSentAt.set(key, Date.now())
  return true
}

function buildResetUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/+$/, '')}/willpower/reset-password?token=${encodeURIComponent(token)}`
}

function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    email: user.email || null,
    displayName: user.display_name || null,
    createdAt: user.created_at || null
  }
}

/** 解析 Cookie 中的 JWT，注入 req.wpUserId；未登录返回 401。 */
export function requireWpAuth(req, res, next) {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.scope !== TOKEN_SCOPE) return res.status(401).json({ error: '登录状态无效' })
    req.wpUserId = payload.uid
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期' })
  }
}

/** 宽松解析：返回 userId 或 null，供可选登录的接口使用。 */
export function getWpUserIdFromReq(req) {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    return payload.scope === TOKEN_SCOPE ? payload.uid : null
  } catch {
    return null
  }
}

router.post('/register', authLimiter, async (req, res) => {
  const { username, password, email } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' })
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: '用户名需 3-20 个字符' })
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return res.status(400).json({ error: '用户名仅限字母、数字、下划线、中文' })
  }
  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: '密码需 6-128 位' })
  }

  let safeEmail = null
  if (email) {
    if (!isValidEmail(email)) return res.status(400).json({ error: '邮箱格式不正确' })
    if (await getUserByEmail(email)) return res.status(409).json({ error: '该邮箱已被使用' })
    safeEmail = email
  }

  try {
    if (await getUserByUsername(username)) {
      return res.status(409).json({ error: '用户名已存在' })
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const id = await createUser(username, hash, safeEmail)
    setTokenCookie(req, res, id)
    appLog('WILLPOWER', `注册成功: ${username} (id=${id})`)
    return res.json({ ok: true, user: { id, username, email: safeEmail } })
  } catch (err) {
    if (err?.code === '23505' || String(err?.code || '').startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: '用户名或邮箱已存在' })
    }
    appLog('ERROR', `心魔注册失败: username=${username}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' })
  }
  try {
    const user = await getUserByUsername(username)
    if (!user) return res.status(401).json({ error: '用户名或密码错误' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: '用户名或密码错误' })
    setTokenCookie(req, res, user.id)
    appLog('WILLPOWER', `登录成功: ${user.username} (id=${user.id})`)
    return res.json({ ok: true, user: publicUser(user) })
  } catch (err) {
    appLog('ERROR', `心魔登录失败: username=${username}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '登录服务暂时不可用，请稍后重试' })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_NAME)
  res.json({ ok: true })
})

router.get('/me', async (req, res) => {
  const userId = getWpUserIdFromReq(req)
  if (!userId) return res.json({ user: null })
  try {
    const user = await getUserById(userId)
    return res.json({ user: publicUser(user) })
  } catch {
    return res.json({ user: null })
  }
})

/** 修改昵称与绑定邮箱（需登录）。 */
router.post('/profile', requireWpAuth, async (req, res) => {
  const { displayName, email } = req.body || {}
  try {
    if (typeof displayName === 'string') {
      if (displayName.length > 20) return res.status(400).json({ error: '昵称不能超过 20 个字符' })
      await updateDisplayName(req.wpUserId, displayName.trim() || null)
    }
    if (email !== undefined) {
      let safeEmail = null
      if (email) {
        if (!isValidEmail(email)) return res.status(400).json({ error: '邮箱格式不正确' })
        const existing = await getUserByEmail(email)
        if (existing && existing.id !== req.wpUserId) {
          return res.status(409).json({ error: '该邮箱已被使用' })
        }
        safeEmail = email
      }
      await setUserEmail(req.wpUserId, safeEmail)
    }
    const user = await getUserById(req.wpUserId)
    return res.json({ ok: true, user: publicUser(user) })
  } catch (err) {
    appLog('ERROR', `心魔资料更新失败: uid=${req.wpUserId}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.post('/change-password', requireWpAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ error: '请输入当前密码' })
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
    return res.status(400).json({ error: '新密码需 6-128 位' })
  }
  try {
    const user = await getUserAuthById(req.wpUserId)
    if (!user) return res.status(401).json({ error: '登录已过期' })
    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) return res.status(401).json({ error: '当前密码不正确' })
    await updatePasswordById(user.id, await bcrypt.hash(newPassword, SALT_ROUNDS))
    await invalidateUserResetTokens(user.id)
    return res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `心魔改密码失败: uid=${req.wpUserId}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// 忘记密码：无论账号是否存在都返回同一句话，防止账号枚举
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const { identifier } = req.body || {}
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ error: '请输入用户名或邮箱' })
  }
  const GENERIC = '如果该账号存在且已绑定邮箱，我们已发送重置邮件，请查收（链接 30 分钟内有效）。'
  try {
    const user = await getUserByIdentifier(identifier.trim())
    if (user && user.email && checkResetCooldown(`wp:${user.id}`)) {
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString()
      await createResetToken(user.id, tokenHash, expiresAt)
      await sendPasswordResetEmail(user.email, buildResetUrl(token))
      appLog('WILLPOWER', `发起重置密码: ${user.username} (id=${user.id})`)
    }
    return res.json({ ok: true, message: GENERIC })
  } catch (err) {
    appLog('ERROR', `心魔忘记密码失败: error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {}
  if (typeof token !== 'string' || !token) return res.status(400).json({ error: '缺少重置令牌' })
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: '新密码需 6-128 位' })
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const row = await getValidResetToken(tokenHash)
    if (!row) return res.status(400).json({ error: '重置链接无效或已过期，请重新申请' })
    await updatePasswordById(row.user_id, await bcrypt.hash(password, SALT_ROUNDS))
    await consumeResetToken(tokenHash, row.user_id)
    // 已通过邮件令牌证明身份，直接登录，省去再输一次密码
    setTokenCookie(req, res, row.user_id)
    appLog('WILLPOWER', `重置密码成功: uid=${row.user_id}`)
    return res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `心魔重置密码失败: error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

export default router
