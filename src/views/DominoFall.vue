<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 多米诺骨牌 · 沿路线连锁倒下
 * - 在画布区按住鼠标拖动画一条路线
 * - 松手后沿路线等间距摆放骨牌，每块横跨路线站立
 * - 点「推倒」从第一块开始向前扑倒，倒到一定角度触发下一块，
 *   连锁波顺着你画的曲线一节节传播
 */

const THICK = 10 // 骨牌厚度(px)，对应俯视下倒下后的宽度
const FALL_TIME = 0.16 // 单块倒下耗时(秒)
const TRIGGER_AT = 0.42 // 倒到该进度时触发后一块
const STAND_SCALE = 0.42 // 站立时长度缩放（短墩），倒下时伸长到 1
const PALETTE = ['#2f6fed', '#d4452f', '#f2a431', '#37a86b', '#8b5cf6', '#e0699a']

const spacing = ref(30) // 相邻骨牌间距(px)
const rawPoints = ref([]) // 鼠标笔迹原始点
const dominoes = ref([])
const isDrawing = ref(false)
const running = ref(false)
const finished = ref(false)
const soundOn = ref(true)

let rafId = 0
let lastTime = 0
let audioCtx = null

// 浏览器要求音频上下文在用户手势中创建/恢复，push 按钮即满足
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// 实时合成一声木质敲击：短促三角波 + 快速衰减，音高随序号轻微上行
function playKnock(i) {
  if (!soundOn.value) return
  const ctx = ensureAudio()
  const now = ctx.currentTime
  const base = 180 + (i % 12) * 14
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(base, now)
  osc.frequency.exponentialRampToValueAtTime(base * 0.6, now + 0.12)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.16)
}

const polyline = computed(() =>
  rawPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
)

const fallenCount = computed(
  () => dominoes.value.filter((d) => d.progress >= 1).length
)

const hasRoute = computed(() => dominoes.value.length > 0)

// 沿折线等间距重采样，返回均匀分布的点
function resample(points, step) {
  if (points.length < 2) return []
  const result = [{ x: points[0].x, y: points[0].y }]
  let prev = result[0]
  let acc = 0

  for (let i = 1; i < points.length; i++) {
    const curr = points[i]
    let dx = curr.x - prev.x
    let dy = curr.y - prev.y
    let segLen = Math.hypot(dx, dy)

    while (acc + segLen >= step && segLen > 0) {
      const t = (step - acc) / segLen
      const nx = prev.x + dx * t
      const ny = prev.y + dy * t
      result.push({ x: nx, y: ny })
      prev = { x: nx, y: ny }
      dx = curr.x - prev.x
      dy = curr.y - prev.y
      segLen = Math.hypot(dx, dy)
      acc = 0
    }
    acc += segLen
    prev = curr
  }
  return result
}

// 由笔迹生成骨牌：等间距取点 + 计算每点的前进方向
function buildDominoes() {
  const samples = resample(rawPoints.value, spacing.value)
  if (samples.length < 2) {
    dominoes.value = []
    return
  }
  dominoes.value = samples.map((p, i) => {
    const ahead = samples[i + 1] || p
    const behind = samples[i - 1] || p
    const angle =
      (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI
    return {
      x: p.x,
      y: p.y,
      angle,
      progress: 0,
      color: PALETTE[i % PALETTE.length]
    }
  })
}

function pointFromEvent(e) {
  return { x: e.offsetX, y: e.offsetY }
}

function onPointerDown(e) {
  if (running.value) return
  e.currentTarget.setPointerCapture?.(e.pointerId)
  isDrawing.value = true
  finished.value = false
  dominoes.value = []
  rawPoints.value = [pointFromEvent(e)]
}

function onPointerMove(e) {
  if (!isDrawing.value) return
  const p = pointFromEvent(e)
  const last = rawPoints.value[rawPoints.value.length - 1]
  if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 4) {
    rawPoints.value.push(p)
  }
}

function onPointerUp() {
  if (!isDrawing.value) return
  isDrawing.value = false
  buildDominoes()
}

function onSpacingChange() {
  if (running.value) return
  buildDominoes()
}

function push() {
  if (running.value || !hasRoute.value) return
  if (finished.value) {
    dominoes.value.forEach((d) => (d.progress = 0))
    finished.value = false
  }
  dominoes.value[0].progress = 0.001
  playKnock(0)
  running.value = true
  lastTime = performance.now()
  rafId = requestAnimationFrame(step)
}

function step(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  const list = dominoes.value

  for (const d of list) {
    if (d.progress > 0 && d.progress < 1) {
      d.progress = Math.min(1, d.progress + dt / FALL_TIME)
    }
  }
  // 触发后一块
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].progress >= TRIGGER_AT && list[i + 1].progress === 0) {
      list[i + 1].progress = 0.001
      playKnock(i + 1)
    }
  }

  const stillMoving = list.some((d) => d.progress > 0 && d.progress < 1)
  if (stillMoving) {
    rafId = requestAnimationFrame(step)
  } else {
    running.value = false
    finished.value = true
  }
}

function redraw() {
  cancelAnimationFrame(rafId)
  running.value = false
  finished.value = false
  isDrawing.value = false
  rawPoints.value = []
  dominoes.value = []
}

function dominoStyle(d) {
  const rot = d.angle + 90 * (1 - d.progress)
  const scaleX = STAND_SCALE + (1 - STAND_SCALE) * d.progress
  return {
    width: spacing.value + 'px',
    height: THICK + 'px',
    marginTop: -THICK / 2 + 'px',
    background: d.color,
    transform: `translate(${d.x}px, ${d.y}px) rotate(${rot}deg) scaleX(${scaleX})`,
    filter: `brightness(${1 - 0.18 * d.progress})`
  }
}

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  audioCtx?.close()
})
</script>

<template>
  <main class="domino">
    <header class="top">
      <RouterLink to="/vue-apps" class="back">← 返回 Vue 项目</RouterLink>
      <h1>多米诺骨牌 · 沿路线连锁倒下</h1>
      <p class="subtitle">在下面区域按住鼠标画一条路线，松手生成骨牌，再点「推倒」。</p>
    </header>

    <section class="panel">
      <label class="field">
        <span>间距 {{ spacing }}px</span>
        <input
          v-model.number="spacing"
          type="range"
          min="18"
          max="60"
          :disabled="running"
          @change="onSpacingChange"
        />
      </label>

      <div class="buttons">
        <button class="primary" :disabled="running || !hasRoute" @click="push">
          推倒 ▶
        </button>
        <button :disabled="running" @click="redraw">重画</button>
        <button class="toggle" @click="soundOn = !soundOn">
          {{ soundOn ? '🔊 声音' : '🔇 静音' }}
        </button>
      </div>

      <span class="status">已生成 {{ dominoes.length }} 块 · 已倒下 {{ fallenCount }}</span>
    </section>

    <section
      class="stage"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <svg class="guide" v-if="rawPoints.length > 1">
        <polyline :points="polyline" />
      </svg>

      <div
        v-for="(d, i) in dominoes"
        :key="i"
        class="piece"
        :style="dominoStyle(d)"
      ></div>

      <p class="placeholder" v-if="!hasRoute && rawPoints.length === 0">
        ✍️ 按住鼠标在这里画一条路线
      </p>
    </section>

    <p class="hint" v-if="finished">连锁完成 🎉 点「推倒」再来一次，或「重画」换条路线。</p>
  </main>
</template>

<style scoped>
.domino {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.back {
  font-size: 14px;
}

.top h1 {
  margin: 14px 0 6px;
  font-size: 30px;
}

.subtitle {
  margin: 0 0 28px;
  color: var(--color-muted);
}

.panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 22px;
  padding: 16px 22px;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

.field input[type='range'] {
  width: 180px;
}

.buttons {
  display: flex;
  gap: 10px;
}

.buttons button {
  padding: 9px 18px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.buttons button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}

.buttons .primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.buttons .toggle {
  border-color: #ddd;
}

.status {
  margin-left: auto;
  font-size: 14px;
  color: var(--color-muted);
}

.stage {
  position: relative;
  margin-top: 26px;
  height: 460px;
  overflow: hidden;
  border-radius: var(--radius);
  background: linear-gradient(180deg, #fbf8f1 0%, #efe7d6 100%);
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.06);
  touch-action: none;
  cursor: crosshair;
}

.guide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.guide polyline {
  fill: none;
  stroke: rgba(0, 0, 0, 0.16);
  stroke-width: 2;
  stroke-dasharray: 4 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.piece {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 5px;
  transform-origin: left center;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.22);
  will-change: transform;
  pointer-events: none;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 16px;
  color: var(--color-muted);
  pointer-events: none;
}

.hint {
  margin-top: 18px;
  text-align: center;
  font-size: 15px;
  color: var(--color-primary);
}
</style>
