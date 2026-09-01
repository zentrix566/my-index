function wrapText(context, text, maxWidth) {
  const rows = []
  let line = ''
  for (const char of text) {
    if (context.measureText(line + char).width > maxWidth && line) { rows.push(line); line = char } else line += char
  }
  if (line) rows.push(line)
  return rows
}

/** 在浏览器本地合成一张备忘图片，不附加站点标识或追踪信息。 */
export function downloadNoteImage(note, { categoryLabel, statusLabel }) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 1500
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, 1200, 1500)
  gradient.addColorStop(0, '#f4efff'); gradient.addColorStop(1, '#fafbff')
  context.fillStyle = gradient; context.fillRect(0, 0, 1200, 1500)
  context.fillStyle = '#6d28d9'; context.fillRect(72, 72, 14, 1356)
  context.fillStyle = '#6d28d9'; context.font = '700 32px sans-serif'; context.fillText(categoryLabel(note.category), 126, 135)
  if (note.status) { context.fillStyle = '#166534'; context.font = '700 30px sans-serif'; context.fillText(`✓ ${statusLabel(note.status)}`, 930, 135) }
  context.fillStyle = '#172033'; context.font = '700 70px sans-serif'
  let y = 245
  for (const row of wrapText(context, note.title, 940)) { context.fillText(row, 126, y); y += 90 }
  const tags = (note.tags || []).join(' · ')
  if (tags) { context.fillStyle = '#5b21b6'; context.font = '500 30px sans-serif'; context.fillText(tags, 126, y + 28); y += 105 }
  context.fillStyle = '#4b5563'; context.font = '400 38px sans-serif'
  const content = note.content || '一条被妥善保存的念头。'
  for (const paragraph of content.split('\n')) {
    for (const row of wrapText(context, paragraph || ' ', 930)) { if (y > 1300) break; context.fillText(row, 126, y); y += 58 }
    y += 18
  }
  context.fillStyle = '#64748b'; context.font = '400 26px sans-serif'
  context.fillText(`记录于 ${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(note.createdAt))}`, 126, 1400)
  const link = document.createElement('a')
  link.download = `${note.title.slice(0, 30)}-备忘.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
