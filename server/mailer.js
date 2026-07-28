/**
 * 发信模块（仅在「忘记密码」流程用到）。
 * - 配置来自环境变量：SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM
 * - 未配置 SMTP_HOST 时降级：把重置链接打到控制台日志，方便本地无邮件服务时测试
 * - 不把任何密钥写死在代码里
 */
import nodemailer from 'nodemailer'
import { appLog } from './logger.js'

let transporter = null
let transporterResolved = false

function getTransporter() {
  if (transporterResolved) return transporter
  transporterResolved = true
  const host = process.env.SMTP_HOST
  if (!host) return null
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  })
  return transporter
}

/** 是否已配置真实发信通道。 */
export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST)
}

/**
 * 发送密码重置邮件。
 * @param {string} to 收件邮箱
 * @param {string} resetUrl 带 token 的重置链接（前端页面）
 * @returns {Promise<{ devFallback?: boolean, resetUrl?: string }>}
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  const t = getTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@zentrix566.top'
  const siteName = 'Zentrix 个人索引'

  if (!t) {
    // 开发兜底：未配置 SMTP，不阻塞流程，仅打印链接供手动测试
    appLog('MAIL', `未配置 SMTP，跳过真实发信。重置链接： ${resetUrl}`)
    return { devFallback: true, resetUrl }
  }

  const text = [
    `你好，`,
    ``,
    `我们收到了重置 ${siteName} 账号密码的请求。如果是你本人操作，请点击下方链接在 30 分钟内设置新密码：`,
    ``,
    resetUrl,
    ``,
    `如果这不是你发起的，忽略本邮件即可，你的密码不会更改。`,
    `链接仅可使用一次，且 30 分钟后失效。`
  ].join('\n')

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a;">
    <h2 style="margin:0 0 16px;font-size:20px;">重置你的密码</h2>
    <p style="margin:0 0 16px;line-height:1.6;color:#334155;">我们收到了重置 ${siteName} 账号密码的请求。如果是你本人操作，请在 30 分钟内点击按钮设置新密码：</p>
    <p style="margin:0 0 24px;">
      <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#15803d;color:#fff;text-decoration:none;font-weight:700;">重置密码</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;word-break:break-all;">链接也可手动打开：<a href="${resetUrl}" style="color:#d97706;">${resetUrl}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">如果这不是你发起的，忽略本邮件即可，你的密码不会更改。链接仅可使用一次。</p>
  </div>`

  await t.sendMail({ from, to, subject: `重置你的 ${siteName} 密码`, text, html })
  return {}
}

/**
 * 发送邮箱激活邮件。
 * @param {string} to 收件邮箱
 * @param {string} verifyUrl 带 token 的激活链接（前端页面）
 * @returns {Promise<{ devFallback?: boolean, verifyUrl?: string }>}
 */
export async function sendEmailVerification(to, verifyUrl) {
  const t = getTransporter()
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@zentrix566.top'
  const siteName = 'Zentrix 个人索引'

  if (!t) {
    // 开发兜底：未配置 SMTP，不阻塞流程，仅打印链接供手动测试
    appLog('MAIL', `未配置 SMTP，跳过真实发信。激活链接： ${verifyUrl}`)
    return { devFallback: true, verifyUrl }
  }

  const text = [
    `你好，`,
    ``,
    `感谢注册 ${siteName}。请点击下方链接激活你的邮箱，激活后账号将成为正式用户：`,
    ``,
    verifyUrl,
    ``,
    `链接 30 分钟内有效，仅可使用一次。如果这不是你本人的操作，忽略本邮件即可。`
  ].join('\n')

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a;">
    <h2 style="margin:0 0 16px;font-size:20px;">激活你的邮箱</h2>
    <p style="margin:0 0 16px;line-height:1.6;color:#334155;">感谢注册 Zentrix 个人索引。请点击下方按钮激活邮箱，激活后账号将成为正式用户：</p>
    <p style="margin:0 0 24px;">
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#15803d;color:#fff;text-decoration:none;font-weight:700;">激活邮箱</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;word-break:break-all;">链接也可手动打开：<a href="${verifyUrl}" style="color:#d97706;">${verifyUrl}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">链接 30 分钟内有效，仅可使用一次。如果这不是你本人的操作，忽略本邮件即可。</p>
  </div>`

  await t.sendMail({ from, to, subject: `激活你的 ${siteName} 邮箱`, text, html })
  return {}
}
