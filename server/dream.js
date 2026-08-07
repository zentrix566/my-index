/**
 * 「黄粱一梦」人生模拟器 —— 服务端逻辑
 *
 * 设计要点：
 * - DeepSeek API Key 仅存于服务端环境变量（K8s Secret zentrix-secrets → DEEPSEEK_API_KEY），
 *   前端通过本站 /api/dream 代理调用，绝不接触 Key，也不配置模型/接口地址。
 * - 采用与原始项目一致的流式（SSE）输出：服务端边收边转发 content 分片，
 *   前端拿到的是干净的 `data: {"content":"..."}` 事件，便于逐字渲染「烹梦」打字效果。
 */

// 与原始 huangliangyimeng 项目保持一致的系统提示词
export const DREAM_SYSTEM_PROMPT = `你是「黄粱一梦」人生模拟器。根据用户提供的当前年龄、期望寿命和成就清单，生成一段按时间线排列的人生剧本。要求：
1. 全部用白话文（现代书面语/口语），严禁文言文、半文半白或诗化描写。
2. 每条单独成行，固定格式：「YYYY年（XX岁）：做了什么事」。例如「2030年（26岁）：考进选调生，到基层锻炼」。
3. 必须覆盖用户提到的每一个成就，合理分配到不同年龄段，并按时间先后顺序逐条列出；成就之间可补 1-2 件过渡小事，也用同样的句式。
4. 结尾用一两句话点题：一切不过是黄粱一梦。不要展开抒情。
5. 语言简洁直白，不要写小说式长段落。
6. 如果用户寿命超过 150 岁，说明这是一个超长待机的传奇人生——你可以尽情放飞想象，加入修仙、科技永生、星际殖民、文明兴衰、轮回转世等脑洞。时间线用跳跃叙事，挑选关键转折点，每隔几十年、几百年甚至几千年选取一两个标志性事件，别逐岁罗列。总体控制在 20 条以内。
7. 如果用户寿命在 150 岁以内，按常规人生叙事，从当前年龄到目标年龄全程覆盖，适当加密事件，确保人生线不断档。`

function buildUserPrompt({ currentAge, targetAge, achievements }) {
  const goals = (achievements || '')
    .split(/[，,、\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join('、')
  const currentYear = new Date().getFullYear()
  const birthYear = currentYear - Number(currentAge)
  return `现在是 ${currentYear} 年。我今年 ${currentAge} 岁（即 ${birthYear} 年出生），希望活到 ${targetAge} 岁。
我此生想达成的成就有：${goals || '（你替我安排一场波澜壮阔的人生）'}。

请按「年份（岁数）：做了什么」的格式，为我列出从 ${currentAge} 岁到 ${targetAge} 岁的人生大梦，并以 ${currentYear} 年为基准推算每件事发生的年份。`
}

// 参数校验：返回 { ok, error, data }
export function validateDreamPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: '请求体格式不正确' }
  }
  const cur = Number(body.currentAge)
  const tar = Number(body.targetAge)
  if (!Number.isFinite(cur) || !Number.isFinite(tar)) {
    return { ok: false, error: '请输入有效的当前年龄与期望寿命' }
  }
  if (cur <= 0 || tar <= 0) {
    return { ok: false, error: '年龄需大于 0' }
  }
  if (cur >= tar) {
    return { ok: false, error: '期望寿命需大于当前年龄' }
  }
  if (tar > 10000) {
    return { ok: false, error: '期望寿命请控制在 10000 岁以内' }
  }
  const achievements = typeof body.achievements === 'string' ? body.achievements : ''
  if (achievements.length > 2000) {
    return { ok: false, error: '成就描述过长（最多 2000 字）' }
  }
  return {
    ok: true,
    data: { currentAge: cur, targetAge: tar, achievements: achievements.trim() }
  }
}

/**
 * 向 DeepSeek 发起流式请求，并把 content 分片以 SSE 形式转发到 res。
 * 调用方需先确保已通过参数校验与 Key 检查。
 * @returns {Promise<boolean>} 是否成功完成（false 表示上游异常）
 */
export async function streamDream(res, { currentAge, targetAge, achievements }) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const model = process.env.DEEPSEEK_DREAM_MODEL || 'deepseek-chat'
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: DREAM_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt({ currentAge, targetAge, achievements }) }
      ],
      stream: true,
      temperature: 0.9,
      max_tokens: 8000
    })
  })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    throw new Error(`DeepSeek 调用失败（${upstream.status}）：${errText || upstream.statusText}`)
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  // 关掉 Nginx 等反代的缓冲，保证逐字推送
  res.setHeader('X-Accel-Buffering', 'no')

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let aborted = false
  const onClose = () => { aborted = true }
  req_close(res, onClose)

  try {
    while (true) {
      if (aborted) {
        await reader.cancel().catch(() => {})
        break
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed?.choices?.[0]?.delta?.content
          if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`)
        } catch {
          // 忽略单行解析失败（keep-alive 注释行等）
        }
      }
    }
  } finally {
    res.removeListener('close', onClose)
  }
  res.write('data: [DONE]\n\n')
  res.end()
  return true
}

// 兼容 Express res 的 close 事件监听（抽象出来便于未来替换）
function req_close(res, handler) {
  res.on('close', handler)
}
