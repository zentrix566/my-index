/**
 * AI 建议（实验性功能）服务端逻辑
 * - 密钥与模型/接口地址均固定在服务端，前端不接触 Key，也不配置地址/模型
 * - 根据用户的成就进度，在服务端直接计算「剩余成就」上下文，避免前端搬运大量数据
 * - 每日额度：固定问答 AI_FIXED_DAILY 次 + 自由问答 AI_FREE_DAILY 次（按用户/IP + 日期 限流，由 db.js 落地）
 */
import { getAllAchievementMeta } from './achievements-meta.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// core-expansion-ids.js 同时被前端（src/…）与服务端引用。生产镜像里没有 src/
// （Dockerfile 仅复制 server/ + 成就 JSON），故优先从 server/achievements-data/
// （Dockerfile 复制而来）加载，本地开发回退到 ../src/…。用候选路径动态 import，
// 避免写死 ../src 导致生产 ERR_MODULE_NOT_FOUND 而 CrashLoop。
async function loadCoreExpansionIds() {
  const candidates = [
    path.resolve(__dirname, 'achievements-data/core-expansion-ids.js'),
    path.resolve(__dirname, '../src/hearthstone-achievements/data/core-expansion-ids.js')
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const mod = await import(pathToFileURL(p).href)
      return mod.default
    }
  }
  throw new Error('[ai-advisor] 找不到 core-expansion-ids.js，候选路径：' + candidates.join(' , '))
}

const CORE_EXPANSION_IDS = await loadCoreExpansionIds()
const CORE_EXPANSION_SET = new Set(CORE_EXPANSION_IDS)

// 每日额度（可用环境变量调整，默认 5 次固定 + 1 次自由）
export const AI_FIXED_DAILY = Number(process.env.AI_FIXED_DAILY) || 5
export const AI_FREE_DAILY = Number(process.env.AI_FREE_DAILY) || 1

// 固定服务端配置：前端不配置地址/模型，Key 仅存于服务端环境变量
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
const DEEPSEEK_MODEL = 'deepseek-v4-flash'
const DEEPSEEK_TEMPERATURE = 0.5
const DEEPSEEK_TIMEOUT_MS = 30_000

/** 本地日期 YYYY-MM-DD（用于每日额度重置） */
export function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * 由用户进度构建「剩余成就」精简上下文，供系统提示词使用。
 * progress 结构：{ [achId]: { stages: {0:bool,...}, count: number } }
 * options.hardcore：true 时纳入全部版本；false 时仅包含核心（有经验值）9 个版本。
 */
export function buildAiContext(progress = {}, { hardcore = false } = {}) {
  const meta = getAllAchievementMeta()
  const items = []
  for (const [id, m] of Object.entries(meta)) {
    // 非硬核模式：仅统计核心 9 个有经验版本
    if (!hardcore && m.expansionId && !CORE_EXPANSION_SET.has(m.expansionId)) continue
    const prog = progress[id]
    let remaining = 0
    let typeLabel = '一次性'
    if (m.type === '累计') {
      const count = prog?.count ?? 0
      remaining = Math.max(0, (m.lastQuota || 0) - count)
      if (remaining <= 0) continue
      typeLabel = m.metric === 'points' ? '累计-点数' : '累计-次数'
    } else {
      const stages = prog?.stages || {}
      const done = Object.values(stages).filter((v) => v === true).length
      remaining = Math.max(0, m.stageCount - done)
      if (remaining <= 0) continue
    }
    items.push({
      name: m.name || id,
      class: m.heroClass || '未知',
      version: m.version || '未知',
      type: typeLabel,
      remaining
    })
  }
  return {
    mode: '炉石传说成就',
    remainingCount: items.length,
    items
  }
}

/**
 * 调用 DeepSeek 聊天补全，返回模型生成的 Markdown 文本。
 * 失败抛出带可读信息的错误。
 */
export async function callDeepSeek(systemPrompt, userQuestion) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('AI 服务未配置（服务端缺少 DEEPSEEK_API_KEY）')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS)
  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: DEEPSEEK_TEMPERATURE,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuestion }
        ]
      }),
      signal: controller.signal
    })
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `DeepSeek 请求失败（${resp.status}）`)
    }
    const result = await resp.json()
    return result?.choices?.[0]?.message?.content?.trim() || '（无返回内容）'
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI 请求超时，请稍后重试')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** 系统提示词：把剩余成就清单作为上下文交给模型，约束输出为简洁中文 + Markdown */
export function buildSystemPrompt(context) {
  return `你是炉石传说成就规划助手。下面是用户当前未完成的成就清单（JSON）：
${JSON.stringify(context)}
请基于这份清单，用简洁的中文回答用户的问题，给出「下一步该做哪一块成就」的具体建议，
并指出最容易快速完成、性价比最高的方向。回答控制在 220 字以内，必要时用 Markdown（如 **加粗**、- 列表）排版。`
}
