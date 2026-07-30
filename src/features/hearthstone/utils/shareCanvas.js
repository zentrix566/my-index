export const SHARE_EXPORT_SCALE = 2
export const SHARE_SOURCE_SCALE = 3

/**
 * 创建按逻辑尺寸绘制、按高清像素尺寸导出的 Canvas 上下文。
 */
export function prepareShareCanvas(canvas, width, height, scale = SHARE_EXPORT_SCALE) {
  const exportScale = Math.max(1, Number(scale) || SHARE_EXPORT_SCALE)
  canvas.width = Math.round(width * exportScale)
  canvas.height = Math.round(height * exportScale)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法创建分享图片')

  ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return ctx
}

/**
 * 保持图片比例并居中裁切到目标区域，避免强行拉伸造成卡图变形。
 */
export function drawImageCover(ctx, image, x, y, width, height) {
  if (!image?.width || !image?.height || width <= 0 || height <= 0) return

  const sourceRatio = image.width / image.height
  const targetRatio = width / height
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.width
  let sourceHeight = image.height

  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio
    sourceX = (image.width - sourceWidth) / 2
  } else {
    sourceHeight = image.width / targetRatio
    sourceY = (image.height - sourceHeight) / 2
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  )
}
