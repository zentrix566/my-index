/**
 * 「黄粱一梦」前端调用封装。
 * 只与服务端 /api/dream 通信，绝不持有任何 Key。
 * 服务端以 SSE 逐字推送 { content } 事件，这里解析后逐步 yield 文本片段，
 * 让页面呈现「烹梦」打字机效果。
 */

/**
 * 流式生成人生剧本
 * @param {{currentAge:number, targetAge:number, achievements:string}} payload
 * @returns {AsyncGenerator<string>} 逐块产出的文本片段
 */
export async function* streamDream({ currentAge, targetAge, achievements }) {
  const resp = await fetch('/api/dream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentAge, targetAge, achievements })
  })

  if (!resp.ok) {
    let msg = `梦境生成失败（${resp.status}）`
    try {
      const data = await resp.json()
      if (data?.error) msg = data.error
    } catch {
      /* 响应体非 JSON 时沿用状态码文案 */
    }
    throw new Error(msg)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed?.error) throw new Error(parsed.error)
        const content = parsed?.content
        if (content) yield content
      } catch (err) {
        // JSON 解析失败（如 keep-alive 心跳注释）则跳过；真正的业务错误向上抛出
        if (err instanceof SyntaxError) continue
        throw err
      }
    }
  }
}

/**
 * 根据年龄跨度返回提示文案（用于前端表单警告）。
 * 与原始项目的 getRangeWarning 保持一致。
 */
export function getRangeWarning(currentAge, targetAge) {
  const span = Number(targetAge) - Number(currentAge)
  if (!Number.isFinite(span) || span <= 0) return ''
  if (span > 5000) return '时间跨度极大，梦境将以跳跃叙事呈现，仅选取关键转折点'
  if (span > 500) return '时间跨度较大，梦境将选取标志性事件，非逐年罗列'
  if (span > 150) return '寿命超过常人，梦境将选取关键年龄段的事件'
  return ''
}
