/**
 * 认证模块：注册 / 登录 / 登出 / 当前用户
 * - 密码仅存 bcrypt 哈希
 * - 登录态用 httpOnly Cookie 承载 JWT
 * - 注册/登录加限流（express-rate-limit）；Turnstile 人机验证后续接 TURNSTILE_SECRET 时补
 */
import express from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import {
  getUserByUsername,
  createUser,
  getUserById,
  getUserByEmail,
  getUserByIdentifier,
  getUserAuthById,
  setUserEmail,
  setEmailVerified,
  setHasPassword,
  updatePasswordById,
  createResetToken,
  getValidResetToken,
  consumeResetToken,
  invalidateUserResetTokens,
  createVerificationToken,
  getValidVerificationToken,
  consumeVerificationToken,
  invalidateUserVerificationTokens
} from './db.js'
import { sendPasswordResetEmail, sendEmailVerification } from './mailer.js'
import { appLog } from './logger.js'
import { isOwnerUser } from './auth-policy.js'

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

// 忘记密码限流：单 IP 每小时最多 5 次，挡住批量轰炸/枚举
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: '操作过于频繁，请稍后再试' }
})

// 邮箱格式校验（宽松，仅挡明显非法输入）
function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// 防轰炸：同一账号两次发信至少间隔 5 分钟（内存级，重启即清，足够挡住批量）
const resetCooldownMs = 5 * 60 * 1000
const lastResetSentAt = new Map()
function checkResetCooldown(key) {
  const last = lastResetSentAt.get(key)
  if (last && Date.now() - last < resetCooldownMs) return false
  lastResetSentAt.set(key, Date.now())
  return true
}

// 重置链接前端地址（默认本地前端；生产用 APP_URL 指向站点域名）
function buildResetUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`
}

// 激活链接前端地址（与重置链接共用 APP_URL）
function buildVerifyUrl(token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base.replace(/\/+$/, '')}/verify-email?token=${encodeURIComponent(token)}`
}

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

/** 仅允许配置的 owner 用户访问管理接口。 */
export async function requireOwner(req, res, next) {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return res.status(401).json({ error: '请先登录所有者账号' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await getUserById(payload.uid)
    if (!isOwnerUser(user)) {
      return res.status(403).json({ error: '仅所有者可查看访问统计' })
    }
    req.userId = payload.uid
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
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
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' })
  }
  if (password.length > 128) {
    return res.status(400).json({ error: '密码不能超过 128 位' })
  }
  // 邮箱可选：填了就校验格式与唯一性
  let safeEmail = null
  if (email) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' })
    }
    if (await getUserByEmail(email)) {
      return res.status(409).json({ error: '该邮箱已被使用' })
    }
    safeEmail = email
  }

  try {
    if (await getUserByUsername(username)) {
      return res.status(409).json({ error: '用户名已存在' })
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const id = await createUser(username, hash, safeEmail)
    setTokenCookie(req, res, id)
    appLog('AUTH', `注册成功: ${username} (id=${id})${safeEmail ? ' 已绑定邮箱' : ''}`)
    return res.json({ ok: true, user: { id, username } })
  } catch (err) {
    // 查询后到插入前仍可能有同名请求并发写入，以数据库唯一约束为最终准绳。
    if (err?.code === '23505') {
      return res.status(409).json({ error: '用户名或邮箱已存在' })
    }
    appLog('ERROR', `注册失败: username=${username}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// 登录
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' })
  }

  try {
    const user = await getUserByUsername(username)
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    setTokenCookie(req, res, user.id)
    appLog('AUTH', `登录成功: ${user.username} (id=${user.id})`)
    return res.json({ ok: true, user: { id: user.id, username: user.username } })
  } catch (err) {
    appLog('ERROR', `登录失败: username=${username}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '登录服务暂时不可用，请稍后重试' })
  }
})

// 登出
router.post('/logout', async (req, res) => {
  const token = req.cookies?.[TOKEN_NAME]
  let who = '未知'
  if (token) {
    try {
      const p = jwt.verify(token, JWT_SECRET)
      const u = await getUserById(p.uid)
      who = u ? u.username : `#${p.uid}`
    } catch { /* ignore */ }
  }
  res.clearCookie(TOKEN_NAME)
  appLog('AUTH', `登出: ${who}`)
  res.json({ ok: true })
})

// 当前登录用户（供前端初始化 auth 状态）
router.get('/me', async (req, res) => {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return res.json({ user: null })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await getUserById(payload.uid)
    return res.json({
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email || null,
            emailVerified: Boolean(user.email_verified),
            hasPassword: Boolean(user.has_password),
            isOwner: isOwnerUser(user)
          }
        : null
    })
  } catch {
    return res.json({ user: null })
  }
})

// 设置/清空绑定邮箱（需登录）；邮箱变化则重置为未激活并发送激活邮件
router.post('/me/email', requireAuth, async (req, res) => {
  const { email } = req.body || {}
  const current = await getUserById(req.userId)
  let safeEmail = null
  if (email) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' })
    }
    const existing = await getUserByEmail(email)
    if (existing && existing.id !== req.userId) {
      return res.status(409).json({ error: '该邮箱已被使用' })
    }
    safeEmail = email
  }
  const emailChanged = safeEmail !== (current?.email || null)
  try {
    await setUserEmail(req.userId, safeEmail)
    let needsActivation = false
    if (safeEmail) {
      const alreadyVerified = !emailChanged && current?.email_verified
      if (!alreadyVerified) {
        await setEmailVerified(req.userId, false)
        await invalidateUserVerificationTokens(req.userId)
        const token = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
        await createVerificationToken(req.userId, tokenHash, expiresAt)
        await sendEmailVerification(safeEmail, buildVerifyUrl(token))
        needsActivation = true
      }
    } else {
      await setEmailVerified(req.userId, false)
      await invalidateUserVerificationTokens(req.userId)
    }
    const user = await getUserById(req.userId)
    appLog('AUTH', `更新邮箱: uid=${req.userId} -> ${safeEmail || '（清空）'}${needsActivation ? ' 已发激活邮件' : ''}`)
    return res.json({
      ok: true,
      needsActivation,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email || null,
            emailVerified: Boolean(user.email_verified),
            hasPassword: Boolean(user.has_password)
          }
        : null
    })
  } catch (err) {
    appLog('ERROR', `更新邮箱失败: uid=${req.userId}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// 改密码（需登录）：校验旧密码后更新
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ error: '请输入当前密码' })
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 128) {
    return res.status(400).json({ error: '新密码需 6-128 位' })
  }
  try {
    const user = await getUserAuthById(req.userId)
    if (!user) return res.status(401).json({ error: '登录已过期' })
    const ok = await bcrypt.compare(currentPassword, user.password_hash)
    if (!ok) return res.status(401).json({ error: '当前密码不正确' })
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await updatePasswordById(user.id, hash)
    await invalidateUserResetTokens(user.id)
    appLog('AUTH', `改密码成功: ${user.username} (id=${user.id})`)
    return res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `改密码失败: uid=${req.userId}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// 忘记密码：按用户名/邮箱定位账号，有绑定邮箱才发重置邮件；统一返回避免账号枚举
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const { identifier } = req.body || {}
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ error: '请输入用户名或邮箱' })
  }
  const GENERIC = '如果该账号存在且已绑定邮箱，我们已发送重置邮件，请查收（链接 30 分钟内有效）。'
  try {
    const user = await getUserByIdentifier(identifier.trim())
    if (user && user.email && checkResetCooldown(`u:${user.id}`)) {
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      await createResetToken(user.id, tokenHash, expiresAt)
      const resetUrl = buildResetUrl(token)
      await sendPasswordResetEmail(user.email, resetUrl)
      appLog('AUTH', `发起重置密码: ${user.username} (id=${user.id})`)
    } else if (user) {
      appLog('AUTH', `重置请求未发信: ${user.username} (id=${user.id}) 原因=${user.email ? '冷却中' : '无绑定邮箱'}`)
    } else {
      appLog('AUTH', `重置请求: 未知账号 identifier=${identifier.trim()}`)
    }
    // 无论账号是否存在，均返回统一成功，防止枚举
    return res.json({ ok: true, message: GENERIC })
  } catch (err) {
    appLog('ERROR', `忘记密码失败: identifier=${identifier.trim()}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// 用链接里的 token 重置密码（未登录也可，靠 token 证明身份）
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {}
  if (typeof token !== 'string' || !token) {
    return res.status(400).json({ error: '缺少重置令牌' })
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: '新密码需 6-128 位' })
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const row = await getValidResetToken(tokenHash)
    if (!row) {
      return res.status(400).json({ error: '重置链接无效或已过期，请重新申请' })
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    await updatePasswordById(row.user_id, hash)
    await setHasPassword(row.user_id, true)
    await consumeResetToken(tokenHash, row.user_id)
    // 重置成功后直接登录，提升体验（已通过 token 证明身份）
    setTokenCookie(req, res, row.user_id)
    appLog('AUTH', `重置密码成功: uid=${row.user_id}`)
    return res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `重置密码失败: error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// 用链接 token 激活邮箱（未登录也可，靠 token 证明身份）；成功后直接登录
router.post('/verify-email', async (req, res) => {
  const { token } = req.body || {}
  if (typeof token !== 'string' || !token) {
    return res.status(400).json({ error: '缺少激活令牌' })
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const row = await getValidVerificationToken(tokenHash)
    if (!row) {
      return res.status(400).json({ error: '激活链接无效或已过期，请重新获取' })
    }
    await consumeVerificationToken(tokenHash, row.user_id)
    // 激活成功后直接登录，提升体验
    setTokenCookie(req, res, row.user_id)
    const user = await getUserById(row.user_id)
    appLog('AUTH', `激活邮箱成功: uid=${row.user_id}`)
    return res.json({
      ok: true,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email || null,
            emailVerified: true,
            hasPassword: Boolean(user.has_password)
          }
        : null
    })
  } catch (err) {
    appLog('ERROR', `激活邮箱失败: error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

// 首次设置密码（仅限尚无密码的账号；已有密码请用 /change-password）
router.post('/set-password', requireAuth, async (req, res) => {
  const { password } = req.body || {}
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ error: '密码需 6-128 位' })
  }
  try {
    const user = await getUserAuthById(req.userId)
    if (!user) return res.status(401).json({ error: '登录已过期' })
    if (user.has_password) {
      return res.status(400).json({ error: '已有密码，请使用「修改密码」' })
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    await updatePasswordById(user.id, hash)
    await setHasPassword(user.id, true)
    appLog('AUTH', `首次设置密码成功: ${user.username} (id=${user.id})`)
    return res.json({ ok: true })
  } catch (err) {
    appLog('ERROR', `首次设置密码失败: uid=${req.userId}, error=${err?.message || 'unknown'}`)
    return res.status(500).json({ error: '操作失败，请稍后重试' })
  }
})

export default router

if (!process.env.JWT_SECRET) {
  appLog('WARN', '未设置 JWT_SECRET，使用默认不安全密钥；生产环境请通过环境变量/Secret 配置')
}
