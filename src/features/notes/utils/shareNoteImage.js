function wrapText(context, text, maxWidth) {
  const rows = []
  let line = ''
  for (const char of text) {
    if (context.measureText(line + char).width > maxWidth && line) {
      rows.push(line)
      line = char
    } else line += char
  }
  if (line) rows.push(line)
  return rows
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.arcTo(x + width, y, x + width, y + height, safeRadius)
  context.arcTo(x + width, y + height, x, y + height, safeRadius)
  context.arcTo(x, y + height, x, y, safeRadius)
  context.arcTo(x, y, x + width, y, safeRadius)
  context.closePath()
}

function drawPill(context, text, x, y, fill, color) {
  context.font = '700 28px sans-serif'
  const width = context.measureText(text).width + 40
  roundRect(context, x, y, width, 48, 24)
  context.fillStyle = fill
  context.fill()
  context.fillStyle = color
  context.fillText(text, x + 20, y + 33)
}

/** 在浏览器本地绘制分享图，返回预览地址与下载文件名，不上传用户内容。 */
export function createNoteImage(note, { categoryLabel, statusLabel }) {
  const width = 1200
  const inset = 84
  const contentWidth = width - inset * 2
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const title = note.title || '未命名灵感'
  const content = note.content || '一条被妥善保存的念头。'

  context.font = '700 68px sans-serif'
  const titleRows = wrapText(context, title, contentWidth)
  context.font = '400 36px "PingFang SC", "Microsoft YaHei", sans-serif'
  const contentRows = content.split('\n').flatMap((paragraph) => wrapText(context, paragraph || '　', contentWidth - 64))
  const tags = note.tags || []
  const titleHeight = titleRows.length * 86
  const contentHeight = Math.max(96, contentRows.length * 60 + Math.max(0, content.split('\n').length - 1) * 16)
  const tagsHeight = tags.length ? 76 : 0
  const height = Math.max(920, 390 + titleHeight + contentHeight + tagsHeight + 170)

  canvas.width = width
  canvas.height = height
  const background = context.createLinearGradient(0, 0, width, height)
  background.addColorStop(0, '#f1ebff')
  background.addColorStop(.48, '#fdfcff')
  background.addColorStop(1, '#eaf2ff')
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
  context.fillStyle = 'rgba(124, 58, 237, .12)'
  context.beginPath(); context.arc(1050, 74, 240, 0, Math.PI * 2); context.fill()
  context.fillStyle = 'rgba(96, 165, 250, .12)'
  context.beginPath(); context.arc(1130, height - 10, 210, 0, Math.PI * 2); context.fill()
  drawPill(context, categoryLabel(note.category), inset + 42, 94, '#e9ddff', '#6425ca')
  if (note.status) drawPill(context, `✓ ${statusLabel(note.status)}`, 860, 94, '#dcfce7', '#166534')
  context.fillStyle = '#21113f'
  context.font = '700 68px sans-serif'
  let y = 246
  titleRows.forEach((row) => { context.fillText(row, inset + 42, y); y += 86 })

  const cardY = y + 24
  const cardHeight = contentHeight + tagsHeight + 76
  context.shadowColor = 'rgba(76, 29, 149, .12)'
  context.shadowBlur = 24
  context.shadowOffsetY = 8
  roundRect(context, inset + 22, cardY, contentWidth - 44, cardHeight, 24)
  context.fillStyle = 'rgba(255,255,255,.9)'
  context.fill()
  context.shadowColor = 'transparent'
  context.fillStyle = '#8b5cf6'
  context.font = '700 24px sans-serif'
  context.fillText('详情', inset + 58, cardY + 46)
  context.fillStyle = '#675878'
  context.font = '400 36px "PingFang SC", "Microsoft YaHei", sans-serif'
  let contentY = cardY + 108
  contentRows.forEach((row) => { context.fillText(row, inset + 58, contentY); contentY += 60 })

  if (tags.length) {
    let tagX = inset + 58
    const tagY = cardY + contentHeight + 26
    tags.slice(0, 5).forEach((tag) => {
      const text = `# ${tag}`
      context.font = '600 24px sans-serif'
      const tagWidth = context.measureText(text).width + 32
      if (tagX + tagWidth > width - inset - 30) return
      roundRect(context, tagX, tagY, tagWidth, 40, 20)
      context.fillStyle = '#f0ebff'
      context.fill()
      context.fillStyle = '#604285'
      context.fillText(text, tagX + 16, tagY + 28)
      tagX += tagWidth + 10
    })
  }

  context.fillStyle = '#6b5a82'
  context.font = '400 26px sans-serif'
  const editedAt = new Date(note.updatedAt || note.createdAt)
  const date = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'medium', hour12: false }).format(editedAt)
  context.fillText(`最后编辑于 ${date}`, inset + 42, height - 96)
  context.fillStyle = '#a78bfa'
  context.fillRect(inset + 42, height - 62, 180, 4)

  const timestamp = `${editedAt.getFullYear()}${String(editedAt.getMonth() + 1).padStart(2, '0')}${String(editedAt.getDate()).padStart(2, '0')}-${String(editedAt.getHours()).padStart(2, '0')}${String(editedAt.getMinutes()).padStart(2, '0')}${String(editedAt.getSeconds()).padStart(2, '0')}`
  return { dataUrl: canvas.toDataURL('image/png'), filename: `${title.slice(0, 30)}-${timestamp}-灵感分享.png` }
}

export function downloadNoteImage(preview) {
  const link = document.createElement('a')
  link.download = preview.filename
  link.href = preview.dataUrl
  link.click()
}
