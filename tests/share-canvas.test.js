import assert from 'node:assert/strict'
import test from 'node:test'
import {
  drawImageCover,
  prepareShareCanvas,
  SHARE_EXPORT_SCALE
} from '../src/features/hearthstone/utils/shareCanvas.js'

test('分享画布始终按高清倍率导出并启用高质量缩放', () => {
  const transforms = []
  const ctx = {
    setTransform: (...args) => transforms.push(args),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low'
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx
  }

  assert.equal(prepareShareCanvas(canvas, 780, 420), ctx)
  assert.equal(canvas.width, 780 * SHARE_EXPORT_SCALE)
  assert.equal(canvas.height, 420 * SHARE_EXPORT_SCALE)
  assert.deepEqual(transforms, [[2, 0, 0, 2, 0, 0]])
  assert.equal(ctx.imageSmoothingEnabled, true)
  assert.equal(ctx.imageSmoothingQuality, 'high')
})

test('分享图中的横图使用居中裁切而不是拉伸', () => {
  const calls = []
  const ctx = { drawImage: (...args) => calls.push(args) }
  const image = { width: 800, height: 400 }

  drawImageCover(ctx, image, 10, 20, 100, 100)

  assert.deepEqual(calls[0], [
    image,
    200,
    0,
    400,
    400,
    10,
    20,
    100,
    100
  ])
})
