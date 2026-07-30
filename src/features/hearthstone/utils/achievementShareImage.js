// 炉石成就分享卡片生成工具（原生 Canvas，无第三方依赖）
// 三种模式：
//   - completed      : 单条已完成成就的金色徽章风格
//   - progress       : 单条进行中成就的蓝色进度风格
//   - pinned-bundle  : 置顶成就合集（多条），逐行绘制
// 卡图从本站相对路径加载（同源代理到 OSS，crossOrigin=anonymous 可安全 drawImage）
import { getAchievementCardCrop } from './achievementCardImages.js'
import { getClassName } from './achievements.js'
import { drawImageCover, prepareShareCanvas } from './shareCanvas.js'

const FONT_FAMILY = '"Microsoft YaHei","PingFang SC","Segoe UI",sans-serif'
const WATERMARK = '由 zentrix566.top/hearthstone 生成'

// 单条成就分享图尺寸
const CARD_WIDTH = 780
const CARD_HEADER_H = 132
const CARD_STAGE_ROW_H = 30
const CARD_STAGE_GAP = 6
const CARD_STAGE_BLOCK_PAD = 22
const CARD_THUMB_ROW_H = 130
const CARD_FOOTER_H = 56
const CARD_PAD_X = 32

// 合集分享图尺寸
const BUNDLE_WIDTH = 780
const BUNDLE_HEADER_H = 132
const BUNDLE_ROW_H = 68
const BUNDLE_ROW_GAP = 10
const BUNDLE_FOOTER_H = 56
const BUNDLE_PAD_X = 32

// 加载一张图片（同源反代，crossOrigin=anonymous 允许 Canvas 导出）
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// 圆角矩形路径（兼容无 ctx.roundRect 的老浏览器）
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 按最大宽度对文本截断，超出加省略号
function truncateText(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1)
  }
  return out + '…'
}

/** 手动换行（按 max 宽度切分中文长文本，最多 lines 行） */
function wrapText(ctx, text, maxWidth, maxLines = 2) {
  if (!text) return []
  const lines = []
  let current = ''
  for (const ch of text) {
    const next = current + ch
    if (ctx.measureText(next).width > maxWidth) {
      lines.push(current)
      current = ch
      if (lines.length === maxLines - 1) break
    } else {
      current = next
    }
  }
  if (current) {
    if (ctx.measureText(current).width > maxWidth) {
      lines.push(truncateText(ctx, current, maxWidth))
    } else {
      lines.push(current)
    }
  }
  return lines
}

// 从 dbfid-cardnames.json 或成就 cards 数组里挑最多 6 张缩略图
function pickThumbSources(achievement) {
  const cards = Array.isArray(achievement?.cards) ? achievement.cards : []
  const names = cards.map((c) => c?.name).filter(Boolean)
  const uniq = [...new Set(names)].slice(0, 6)
  return uniq.map((n) => ({ name: n, src: getAchievementCardCrop(n) }))
}

/** 绘制页脚水印 */
function drawFooter(ctx, y, width, palette) {
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.subtle
  ctx.font = `400 12px ${FONT_FAMILY}`
  ctx.fillText(WATERMARK, CARD_PAD_X, y + 20)
  // 右侧站点标识
  ctx.textAlign = 'right'
  ctx.fillStyle = palette.accent
  ctx.font = `700 12px ${FONT_FAMILY}`
  ctx.fillText('Zentrix · Hearthstone Tracker', width - CARD_PAD_X, y + 20)
  ctx.textAlign = 'left'
}

/** 根据模式取配色 */
function getPalette(mode) {
  if (mode === 'completed') {
    return {
      bgTop: '#3f2a08',
      bgBottom: '#0f0a03',
      border: 'rgba(251,191,36,0.55)',
      accent: '#fbbf24',
      accentSoft: '#f6c667',
      text: '#f8fafc',
      subtle: 'rgba(255,255,255,0.55)',
      chip: 'rgba(251,191,36,0.18)',
      chipText: '#fde68a',
      progressBg: 'rgba(255,255,255,0.08)',
      progressFill: '#fbbf24'
    }
  }
  return {
    bgTop: '#1c2740',
    bgBottom: '#0e1526',
    border: 'rgba(96,165,250,0.45)',
    accent: '#60a5fa',
    accentSoft: '#93c5fd',
    text: '#f1f5f9',
    subtle: 'rgba(226,232,240,0.55)',
    chip: 'rgba(96,165,250,0.16)',
    chipText: '#bfdbfe',
    progressBg: 'rgba(255,255,255,0.08)',
    progressFill: '#60a5fa'
  }
}

function drawBackground(ctx, w, h, palette) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, palette.bgTop)
  g.addColorStop(1, palette.bgBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = palette.border
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, w - 2, h - 2)
}

// 画一个 chip（版本/职业/类型标签）
function drawChip(ctx, x, y, label, palette) {
  ctx.font = `600 12px ${FONT_FAMILY}`
  const padX = 10
  const w = Math.ceil(ctx.measureText(label).width) + padX * 2
  const h = 22
  ctx.fillStyle = palette.chip
  roundRect(ctx, x, y, w, h, 11)
  ctx.fill()
  ctx.fillStyle = palette.chipText
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + padX, y + h / 2 + 1)
  ctx.textBaseline = 'alphabetic'
  return x + w + 8
}

/**
 * 生成单条成就分享图。
 * @param {object} options
 * @param {object} options.achievement 成就对象
 * @param {object} options.progressInfo useAchievementProgress().getProgressInfo(achievement)
 * @param {object} [options.user] 当前用户 { username }
 * @returns {Promise<{ dataUrl: string, filename: string }>}
 */
export async function generateAchievementShareImage({ achievement, progressInfo, user }) {
  if (!achievement) throw new Error('缺少成就数据')
  const mode = progressInfo?.completed ? 'completed' : 'progress'
  const palette = getPalette(mode)

  // 卡图预加载（关联卡）
  const thumbSources = pickThumbSources(achievement)
  const thumbImages = await Promise.all(thumbSources.map((t) => loadImage(t.src)))
  const hasThumbs = thumbImages.some(Boolean)

  const stages = Array.isArray(achievement.stages) ? achievement.stages : []
  const stagesH = stages.length
    ? CARD_STAGE_BLOCK_PAD * 2 + stages.length * CARD_STAGE_ROW_H + (stages.length - 1) * CARD_STAGE_GAP
    : 0

  const thumbBlockH = hasThumbs ? CARD_THUMB_ROW_H : 0
  const H = CARD_HEADER_H + stagesH + thumbBlockH + CARD_FOOTER_H

  const canvas = document.createElement('canvas')
  const ctx = prepareShareCanvas(canvas, CARD_WIDTH, H)

  // 背景
  drawBackground(ctx, CARD_WIDTH, H, palette)

  // ── 头部 ──
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // 状态徽章（左上）
  const badgeLabel = mode === 'completed' ? '✓ 已完成' : `进行中 · ${progressInfo?.percent ?? 0}%`
  ctx.fillStyle = palette.accent
  ctx.font = `700 14px ${FONT_FAMILY}`
  const badgeW = Math.ceil(ctx.measureText(badgeLabel).width) + 22
  roundRect(ctx, CARD_PAD_X, 24, badgeW, 26, 13)
  ctx.fill()
  ctx.fillStyle = mode === 'completed' ? '#1a1305' : '#0b1a3d'
  ctx.textBaseline = 'middle'
  ctx.fillText(badgeLabel, CARD_PAD_X + 11, 24 + 14)
  ctx.textBaseline = 'alphabetic'

  // 用户名（右上）
  if (user?.username) {
    ctx.fillStyle = palette.subtle
    ctx.font = `500 13px ${FONT_FAMILY}`
    ctx.textAlign = 'right'
    ctx.fillText(`@${user.username}`, CARD_WIDTH - CARD_PAD_X, 40)
    ctx.textAlign = 'left'
  }

  // 成就名（大号）
  ctx.fillStyle = palette.text
  ctx.font = `800 30px ${FONT_FAMILY}`
  const title = truncateText(ctx, achievement.name || '未命名成就', CARD_WIDTH - CARD_PAD_X * 2)
  ctx.fillText(title, CARD_PAD_X, 84)

  // Chips: 版本 / 职业 / 类型
  let cx = CARD_PAD_X
  if (achievement._expansionName) cx = drawChip(ctx, cx, 98, achievement._expansionName, palette)
  const className = getClassName(achievement)
  if (className) cx = drawChip(ctx, cx, 98, className, palette)
  if (achievement.type) cx = drawChip(ctx, cx, 98, achievement.type, palette)

  // ── 阶段列表 ──
  if (stages.length) {
    const blockY = CARD_HEADER_H - 8
    // 底纹
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    roundRect(ctx, CARD_PAD_X, blockY, CARD_WIDTH - CARD_PAD_X * 2, stagesH, 14)
    ctx.fill()

    let rowY = blockY + CARD_STAGE_BLOCK_PAD
    stages.forEach((stage, idx) => {
      // 完成态：完成态优先看 doneStages（对累计成就用序号判定）
      const stageDone =
        mode === 'completed' ||
        (progressInfo && idx < (progressInfo.doneStages ?? 0))
      // 状态圆点
      const dotX = CARD_PAD_X + 18
      const dotY = rowY + CARD_STAGE_ROW_H / 2
      ctx.beginPath()
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2)
      ctx.fillStyle = stageDone ? palette.accent : palette.subtle
      ctx.fill()
      if (stageDone) {
        ctx.strokeStyle = palette.text
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(dotX - 3, dotY)
        ctx.lineTo(dotX - 1, dotY + 2)
        ctx.lineTo(dotX + 3, dotY - 2)
        ctx.stroke()
      }
      // 描述文字
      ctx.fillStyle = stageDone ? palette.subtle : palette.text
      ctx.font = `500 14px ${FONT_FAMILY}`
      ctx.textBaseline = 'middle'
      const desc = truncateText(
        ctx,
        stage.description || `阶段 ${idx + 1}`,
        CARD_WIDTH - CARD_PAD_X * 2 - 40 - 120
      )
      ctx.fillText(desc, dotX + 16, dotY + 1)
      // 奖励（右对齐）
      const rewardText = []
      if (stage.xpReward) rewardText.push(`${stage.xpReward} 经验`)
      if (stage.points) rewardText.push(`${stage.points} 点`)
      if (rewardText.length) {
        ctx.fillStyle = palette.accentSoft
        ctx.font = `600 13px ${FONT_FAMILY}`
        ctx.textAlign = 'right'
        ctx.fillText(rewardText.join(' · '), CARD_WIDTH - CARD_PAD_X - 18, dotY + 1)
        ctx.textAlign = 'left'
      }
      ctx.textBaseline = 'alphabetic'
      rowY += CARD_STAGE_ROW_H + CARD_STAGE_GAP
    })
  }

  // ── 关联卡缩略图（如有）──
  if (hasThumbs) {
    const thumbY = CARD_HEADER_H + stagesH + 8
    const thumbH = CARD_THUMB_ROW_H - 16
    const cols = thumbSources.length
    const availW = CARD_WIDTH - CARD_PAD_X * 2
    const thumbW = Math.min(180, Math.floor((availW - (cols - 1) * 10) / cols))
    thumbSources.forEach((info, i) => {
      const x = CARD_PAD_X + i * (thumbW + 10)
      const img = thumbImages[i]
      ctx.save()
      roundRect(ctx, x, thumbY, thumbW, thumbH, 10)
      ctx.clip()
      if (img) {
        drawImageCover(ctx, img, x, thumbY, thumbW, thumbH)
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.fillRect(x, thumbY, thumbW, thumbH)
        ctx.fillStyle = palette.subtle
        ctx.font = `500 12px ${FONT_FAMILY}`
        ctx.textAlign = 'center'
        ctx.fillText(info.name, x + thumbW / 2, thumbY + thumbH / 2)
        ctx.textAlign = 'left'
      }
      ctx.restore()
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'
      ctx.lineWidth = 1
      roundRect(ctx, x + 0.5, thumbY + 0.5, thumbW - 1, thumbH - 1, 10)
      ctx.stroke()
    })
  }

  // ── 底部：进度条（进行中）+ 页脚 ──
  const footerY = H - CARD_FOOTER_H
  if (mode === 'progress' && progressInfo) {
    const barX = CARD_PAD_X
    const barY = footerY - 12
    const barW = CARD_WIDTH - CARD_PAD_X * 2
    const barH = 10
    ctx.fillStyle = palette.progressBg
    roundRect(ctx, barX, barY, barW, barH, barH / 2)
    ctx.fill()
    const pct = Math.max(0, Math.min(100, progressInfo.percent || 0))
    if (pct > 0) {
      ctx.fillStyle = palette.progressFill
      const filledW = Math.max(barH, (barW * pct) / 100)
      roundRect(ctx, barX, barY, filledW, barH, barH / 2)
      ctx.fill()
    }
    // 阶段完成度文本（左）
    ctx.fillStyle = palette.subtle
    ctx.font = `500 12px ${FONT_FAMILY}`
    const stageText = `阶段 ${progressInfo.doneStages ?? 0} / ${progressInfo.totalStages ?? 0}`
    ctx.fillText(stageText, barX, barY - 8)
    // 剩余提示（右）
    if (progressInfo.remainingText) {
      ctx.textAlign = 'right'
      ctx.fillStyle = palette.accentSoft
      ctx.fillText(progressInfo.remainingText, CARD_WIDTH - CARD_PAD_X, barY - 8)
      ctx.textAlign = 'left'
    }
  }
  drawFooter(ctx, footerY, CARD_WIDTH, palette)

  const dataUrl = canvas.toDataURL('image/png')
  const safeName = (achievement.name || 'achievement').replace(/[\\/:*?"<>|]/g, '_')
  return {
    dataUrl,
    filename: `炉石成就-${safeName}.png`
  }
}

/**
 * 生成置顶合集分享图（多条成就）。
 * @param {object} options
 * @param {Array} options.achievements 成就数组（≤ MAX_PINNED_ACHIEVEMENTS）
 * @param {(achievement:object) => object} options.getProgressInfo 从外部注入的进度信息函数
 * @param {object} [options.user]
 */
export async function generateBundleShareImage({ achievements, getProgressInfo, user }) {
  const list = Array.isArray(achievements) ? achievements.slice(0, 10) : []
  if (!list.length) throw new Error('没有可分享的成就')
  const palette = getPalette('progress')

  const H =
    BUNDLE_HEADER_H +
    list.length * BUNDLE_ROW_H +
    (list.length - 1) * BUNDLE_ROW_GAP +
    BUNDLE_FOOTER_H +
    16

  const canvas = document.createElement('canvas')
  const ctx = prepareShareCanvas(canvas, BUNDLE_WIDTH, H)

  drawBackground(ctx, BUNDLE_WIDTH, H, palette)

  // ── 头部 ──
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = palette.subtle
  ctx.font = `600 13px ${FONT_FAMILY}`
  ctx.fillText('炉石追踪清单 · 我的置顶成就', BUNDLE_PAD_X, 44)

  ctx.fillStyle = palette.text
  ctx.font = `800 30px ${FONT_FAMILY}`
  const title = user?.username
    ? `${user.username} 正在冲刺的 ${list.length} 项`
    : `正在冲刺的 ${list.length} 项`
  ctx.fillText(truncateText(ctx, title, BUNDLE_WIDTH - BUNDLE_PAD_X * 2), BUNDLE_PAD_X, 84)

  // 已完成汇总
  const completedCount = list.filter((a) => getProgressInfo(a).completed).length
  ctx.fillStyle = palette.accentSoft
  ctx.font = `600 14px ${FONT_FAMILY}`
  ctx.fillText(`已完成 ${completedCount} / ${list.length}`, BUNDLE_PAD_X, 108)

  // ── 每行成就 ──
  let rowY = BUNDLE_HEADER_H
  list.forEach((ach) => {
    const info = getProgressInfo(ach)
    const done = info.completed
    // 行底纹
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    roundRect(ctx, BUNDLE_PAD_X, rowY, BUNDLE_WIDTH - BUNDLE_PAD_X * 2, BUNDLE_ROW_H, 12)
    ctx.fill()

    // 左侧：完成态圆点
    const dotX = BUNDLE_PAD_X + 22
    const dotY = rowY + BUNDLE_ROW_H / 2
    ctx.beginPath()
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2)
    ctx.fillStyle = done ? '#fbbf24' : palette.accent
    ctx.fill()
    if (done) {
      ctx.strokeStyle = '#1a1305'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(dotX - 4, dotY)
      ctx.lineTo(dotX - 1, dotY + 3)
      ctx.lineTo(dotX + 5, dotY - 3)
      ctx.stroke()
    }

    // 成就名（左上）
    ctx.fillStyle = palette.text
    ctx.font = `700 16px ${FONT_FAMILY}`
    ctx.textBaseline = 'top'
    const nameMax = BUNDLE_WIDTH - BUNDLE_PAD_X * 2 - 60 - 100
    ctx.fillText(truncateText(ctx, ach.name || '未命名', nameMax), dotX + 20, rowY + 12)

    // 版本 · 职业（左下）
    ctx.fillStyle = palette.subtle
    ctx.font = `500 12px ${FONT_FAMILY}`
    const meta = [ach._expansionName, getClassName(ach)].filter(Boolean).join(' · ')
    ctx.fillText(truncateText(ctx, meta, nameMax), dotX + 20, rowY + 38)

    // 右侧：进度徽章
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    if (done) {
      ctx.fillStyle = '#fbbf24'
      ctx.font = `800 14px ${FONT_FAMILY}`
      ctx.fillText('✓ 已完成', BUNDLE_WIDTH - BUNDLE_PAD_X - 20, dotY)
    } else {
      // 进度条
      const barW = 160
      const barH = 8
      const barX = BUNDLE_WIDTH - BUNDLE_PAD_X - 20 - barW
      const barY = dotY - 2
      ctx.fillStyle = palette.progressBg
      roundRect(ctx, barX, barY, barW, barH, barH / 2)
      ctx.fill()
      const pct = Math.max(0, Math.min(100, info.percent || 0))
      if (pct > 0) {
        ctx.fillStyle = palette.progressFill
        const filledW = Math.max(barH, (barW * pct) / 100)
        roundRect(ctx, barX, barY, filledW, barH, barH / 2)
        ctx.fill()
      }
      ctx.fillStyle = palette.accentSoft
      ctx.font = `700 12px ${FONT_FAMILY}`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${info.percent ?? 0}%`, BUNDLE_WIDTH - BUNDLE_PAD_X - 20, barY - 4)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    rowY += BUNDLE_ROW_H + BUNDLE_ROW_GAP
  })

  // ── 页脚 ──
  drawFooter(ctx, H - BUNDLE_FOOTER_H, BUNDLE_WIDTH, palette)

  const dataUrl = canvas.toDataURL('image/png')
  return {
    dataUrl,
    filename: `炉石追踪清单-${user?.username || 'guest'}.png`
  }
}

/**
 * 尝试触发下载：优先 <a download>；失败回退到新窗口。
 */
export function downloadDataUrl(dataUrl, filename) {
  try {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename || 'share.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch {
    window.open(dataUrl, '_blank')
  }
}

/**
 * 尝试把 dataURL 复制到系统剪贴板（Chrome/Edge 支持；Safari/Firefox 可能失败）。
 * 成功 → 返回 true；否则抛错交由调用方兜底提示。
 */
export async function copyDataUrlToClipboard(dataUrl) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器不支持复制图片')
  }
  const blob = await (await fetch(dataUrl)).blob()
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  return true
}

// 为 wrapText 提供兼容导出（暂未使用，但供未来扩展）
export const __shareUtils = { wrapText }
