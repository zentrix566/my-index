/** 保存一组炉石成就进度，并统一处理服务端错误。 */
export async function saveAchievementProgress(progress) {
  const response = await fetch('/api/achievements/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress })
  })
  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || `进度保存失败（${response.status}）`)
  }
  return response.json().catch(() => ({ ok: true }))
}
