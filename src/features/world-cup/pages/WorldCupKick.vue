<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

// ===================== 常量配置 =====================
const FIELD_COLOR = '#3a7d3a'
const FIELD_STRIPE_COLOR = '#4a8d4a'
const LINE_COLOR = 'rgba(255,255,255,0.65)'
const BALL_RADIUS = 11
const GOAL_WIDTH = 320
const GOAL_HEIGHT = 52
const POST_WIDTH = 8
const KEEPER_W = 44
const KEEPER_H = 66
const MAX_SHOTS = 10
const FRICTION = 0.988
const BOUNCE_DAMPING = 0.65
const KEEPER_SPEED = 4.2
const KEEPER_REACTION = 5
const AIM_MAX_DIST = 130
const POWER_MULT = 0.19
const STOP_THRESHOLD = 0.25

// ===================== 响应式状态 =====================
const canvas = ref(null)
const gameArea = ref(null)
const score = ref(0)
const shotsTaken = ref(0)
const gameState = ref('idle')
const maxShots = MAX_SHOTS

// ===================== 游戏内部状态 =====================
let ctx = null
let animId = null
let W = 0
let H = 0

const ball = { x: 0, y: 0, vx: 0, vy: 0, r: BALL_RADIUS }
const keeper = { x: 0, y: 0, w: KEEPER_W, h: KEEPER_H, vx: 0 }
const goal = { x: 0, y: 0, w: GOAL_WIDTH, h: GOAL_HEIGHT }
const aim = { x: 0, y: 0 }
let isAiming = false
let reactionTimer = 0
let resetTimer = null
let particles = []

// ===================== 初始化 =====================
function resize() {
  if (!gameArea.value || !canvas.value) return
  W = gameArea.value.clientWidth
  H = gameArea.value.clientHeight
  canvas.value.width = W
  canvas.value.height = H
  resetPositions()
}

function resetPositions() {
  ball.x = W / 2
  ball.vx = 0
  ball.vy = 0

  goal.w = Math.min(GOAL_WIDTH, W * 0.82)
  goal.x = (W - goal.w) / 2
  goal.y = 14

  // 点球点距球门线约画布高度的 28%（近景俯视）
  ball.y = goal.y + goal.h + H * 0.28

  keeper.x = W / 2 - KEEPER_W / 2
  keeper.y = goal.y + goal.h + 18
  keeper.vx = 0

  reactionTimer = 0
}

// ===================== 物理 & 逻辑 =====================
function update() {
  if (gameState.value !== 'flying') return

  // 球运动
  ball.x += ball.vx
  ball.y += ball.vy
  ball.vx *= FRICTION
  ball.vy *= FRICTION

  // 边界反弹
  if (ball.x - ball.r < 0) {
    ball.x = ball.r
    ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING
  }
  if (ball.x + ball.r > W) {
    ball.x = W - ball.r
    ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING
  }
  if (ball.y + ball.r > H) {
    ball.y = H - ball.r
    ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING
  }
  // 顶部边界（球门上方）
  if (ball.y - ball.r < 0) {
    if (ball.x < goal.x || ball.x > goal.x + goal.w) {
      ball.y = ball.r
      ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
    } else {
      // 从上方进入球门区域，算作偏出（球从上面飞出去了）
      endShot('miss')
      return
    }
  }

  // 球门柱碰撞
  const leftPost = goal.x
  const rightPost = goal.x + goal.w
  const postTop = goal.y
  const postBottom = goal.y + goal.h

  // 左门柱
  if (ball.x + ball.r > leftPost && ball.x - ball.r < leftPost + POST_WIDTH &&
      ball.y > postTop && ball.y < postBottom) {
    ball.x = leftPost - ball.r
    ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING
  }
  // 右门柱
  if (ball.x + ball.r > rightPost - POST_WIDTH && ball.x - ball.r < rightPost &&
      ball.y > postTop && ball.y < postBottom) {
    ball.x = rightPost + ball.r
    ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING
  }

  // 守门员 AI
  reactionTimer++
  if (reactionTimer > KEEPER_REACTION) {
    const kc = keeper.x + keeper.w / 2
    const diff = ball.x - kc
    if (Math.abs(diff) > 2) {
      keeper.vx = Math.sign(diff) * KEEPER_SPEED
    } else {
      keeper.vx = 0
    }
  }
  keeper.x += keeper.vx
  // 守门员限制在球门宽度内
  const minX = goal.x + POST_WIDTH
  const maxX = goal.x + goal.w - POST_WIDTH - keeper.w
  if (keeper.x < minX) keeper.x = minX
  if (keeper.x > maxX) keeper.x = maxX

  // 球 vs 守门员碰撞
  if (rectCircleHit(keeper, ball)) {
    pushBallOutOfKeeper()
    endShot('saved')
    return
  }

  // 进球判定：球进入球门区域（在守门员上方且在两门柱之间）
  if (ball.y - ball.r <= goal.y + goal.h &&
      ball.y + ball.r >= goal.y &&
      ball.x > goal.x + POST_WIDTH &&
      ball.x < goal.x + goal.w - POST_WIDTH) {
    // 确保球不是从下面穿过守门员进来的
    if (ball.y < keeper.y) {
      endShot('goal')
      return
    }
  }

  // 速度过慢判定射偏
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
  if (speed < STOP_THRESHOLD) {
    endShot('miss')
  }
}

function rectCircleHit(rect, circle) {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const dx = Math.abs(circle.x - cx)
  const dy = Math.abs(circle.y - cy)
  if (dx > rect.w / 2 + circle.r) return false
  if (dy > rect.h / 2 + circle.r) return false
  if (dx <= rect.w / 2) return true
  if (dy <= rect.h / 2) return true
  const cornerDx = dx - rect.w / 2
  const cornerDy = dy - rect.h / 2
  return cornerDx * cornerDx + cornerDy * cornerDy <= circle.r * circle.r
}

function pushBallOutOfKeeper() {
  const cx = keeper.x + keeper.w / 2
  const cy = keeper.y + keeper.h / 2
  const dx = ball.x - cx
  const dy = ball.y - cy
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const push = ball.r + Math.max(keeper.w, keeper.h) / 2 + 2
  ball.x = cx + (dx / dist) * push
  ball.y = cy + (dy / dist) * push
  // 给球一个反弹速度
  ball.vx = (dx / dist) * 3
  ball.vy = (dy / dist) * 3
}

function endShot(result) {
  gameState.value = result
  if (result === 'goal') {
    score.value++
    spawnParticles(ball.x, ball.y, '#ffd700', 25)
    spawnParticles(ball.x, ball.y, '#ff4444', 15)
  } else if (result === 'saved') {
    spawnParticles(ball.x, ball.y, '#ffff00', 15)
  }
  shotsTaken.value++
  scheduleReset()
}

function scheduleReset() {
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    if (shotsTaken.value >= MAX_SHOTS) {
      gameState.value = 'finished'
    } else {
      resetShot()
    }
    resetTimer = null
  }, 1400)
}

function spawnParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7 - 2,
      life: 1,
      color,
      size: Math.random() * 4 + 2
    })
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0)
  particles.forEach(p => {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.12
    p.life -= 0.018
  })
}

// ===================== 渲染 =====================
function drawField() {
  // 草地条纹
  const stripeH = 28
  for (let y = 0; y < H; y += stripeH) {
    ctx.fillStyle = (Math.floor(y / stripeH) % 2 === 0) ? FIELD_COLOR : FIELD_STRIPE_COLOR
    ctx.fillRect(0, y, W, stripeH)
  }

  ctx.strokeStyle = LINE_COLOR
  ctx.lineWidth = 2

  // 底线
  ctx.beginPath()
  ctx.moveTo(0, goal.y + goal.h)
  ctx.lineTo(W, goal.y + goal.h)
  ctx.stroke()

  // 大禁区
  const penW = goal.w + 180
  const penH = H * 0.48
  const penX = (W - penW) / 2
  ctx.strokeRect(penX, goal.y + goal.h, penW, penH)

  // 小禁区
  const smallPenW = goal.w + 40
  const smallPenH = H * 0.20
  const smallPenX = (W - smallPenW) / 2
  ctx.strokeRect(smallPenX, goal.y + goal.h, smallPenW, smallPenH)

  // 点球点
  const spotY = goal.y + goal.h + H * 0.28
  ctx.beginPath()
  ctx.arc(W / 2, spotY, 5, 0, Math.PI * 2)
  ctx.fillStyle = LINE_COLOR
  ctx.fill()

  // 禁区弧线（半径约 10 米，按大禁区比例）
  const arcR = H * 0.14
  const arcX = W / 2
  const arcY = goal.y + goal.h + H * 0.48
  ctx.beginPath()
  ctx.arc(arcX, arcY, arcR, -Math.PI, 0, true)
  ctx.stroke()

  // 中圈（画面下方可见部分）
  const midY = H + Math.min(W, H) * 0.08
  ctx.beginPath()
  ctx.arc(W / 2, midY, Math.min(W, H) * 0.12, -Math.PI, 0, true)
  ctx.stroke()

  // 中线
  ctx.beginPath()
  ctx.moveTo(0, midY)
  ctx.lineTo(W, midY)
  ctx.stroke()
}

function drawGoal() {
  // 门柱
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(goal.x, goal.y, POST_WIDTH, goal.h)
  ctx.fillRect(goal.x + goal.w - POST_WIDTH, goal.y, POST_WIDTH, goal.h)
  ctx.fillRect(goal.x, goal.y, goal.w, 4)

  // 球门网
  ctx.save()
  ctx.beginPath()
  ctx.rect(goal.x + POST_WIDTH, goal.y + 4, goal.w - POST_WIDTH * 2, goal.h - 4)
  ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  for (let x = goal.x; x <= goal.x + goal.w; x += 10) {
    ctx.beginPath()
    ctx.moveTo(x, goal.y)
    ctx.lineTo(x, goal.y + goal.h)
    ctx.stroke()
  }
  for (let y = goal.y; y <= goal.y + goal.h; y += 10) {
    ctx.beginPath()
    ctx.moveTo(goal.x, y)
    ctx.lineTo(goal.x + goal.w, y)
    ctx.stroke()
  }
  ctx.restore()
}

function drawKeeper() {
  // 身体
  ctx.fillStyle = '#e63946'
  roundRect(ctx, keeper.x, keeper.y, keeper.w, keeper.h, 3)
  ctx.fill()

  // 头
  ctx.fillStyle = '#f4a261'
  ctx.beginPath()
  ctx.arc(keeper.x + keeper.w / 2, keeper.y - 6, 8, 0, Math.PI * 2)
  ctx.fill()

  // 手套
  ctx.fillStyle = '#ffe066'
  ctx.beginPath()
  ctx.arc(keeper.x - 2, keeper.y + 12, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(keeper.x + keeper.w + 2, keeper.y + 12, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawBall() {
  // 阴影
  ctx.beginPath()
  ctx.ellipse(ball.x, ball.y + ball.r + 3, ball.r * 0.7, ball.r * 0.25, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fill()

  // 球体
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#ccc'
  ctx.lineWidth = 1
  ctx.stroke()

  // 球面图案（简化的足球纹理）
  ctx.save()
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#1a1a1a'
  // 中心五边形
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const px = ball.x + Math.cos(a) * ball.r * 0.4
    const py = ball.y + Math.sin(a) * ball.r * 0.4
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  // 边缘六边形点
  for (let i = 0; i < 6; i++) {
    const a = (i * 2 * Math.PI) / 6
    ctx.beginPath()
    ctx.arc(
      ball.x + Math.cos(a) * ball.r * 0.72,
      ball.y + Math.sin(a) * ball.r * 0.72,
      ball.r * 0.22, 0, Math.PI * 2
    )
    ctx.fill()
  }
  ctx.restore()
}

function drawAimLine() {
  if (!isAiming || gameState.value !== 'aiming') return

  const dx = aim.x - ball.x
  const dy = aim.y - ball.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const power = Math.min(dist, AIM_MAX_DIST) / AIM_MAX_DIST
  const angle = Math.atan2(dy, dx)
  const lineLen = 35 + power * 90

  // 瞄准虚线
  ctx.beginPath()
  ctx.moveTo(ball.x, ball.y)
  ctx.lineTo(
    ball.x + Math.cos(angle) * lineLen,
    ball.y + Math.sin(angle) * lineLen
  )
  ctx.strokeStyle = `rgba(255, 220, 50, ${0.5 + power * 0.5})`
  ctx.lineWidth = 3
  ctx.setLineDash([7, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // 箭头端点
  ctx.beginPath()
  ctx.arc(
    ball.x + Math.cos(angle) * lineLen,
    ball.y + Math.sin(angle) * lineLen,
    5, 0, Math.PI * 2
  )
  ctx.fillStyle = `rgba(255, 100, 0, ${0.6 + power * 0.4})`
  ctx.fill()

  // 拖拽点
  ctx.beginPath()
  ctx.arc(aim.x, aim.y, 8, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function draw() {
  ctx.clearRect(0, 0, W, H)
  drawField()
  drawGoal()
  drawKeeper()
  drawAimLine()
  drawBall()
  drawParticles()
}

function loop() {
  update()
  updateParticles()
  draw()
  animId = requestAnimationFrame(loop)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ===================== 输入处理 =====================
function getPos(e) {
  const rect = canvas.value.getBoundingClientRect()
  const src = e.touches ? e.touches[0] : e
  return {
    x: src.clientX - rect.left,
    y: src.clientY - rect.top
  }
}

function onPointerDown(e) {
  if (gameState.value !== 'idle' && gameState.value !== 'aiming') return
  const pos = getPos(e)
  const dx = pos.x - ball.x
  const dy = pos.y - ball.y
  // 点击球附近即可开始瞄准
  if (Math.sqrt(dx * dx + dy * dy) <= ball.r * 3.5) {
    isAiming = true
    gameState.value = 'aiming'
    aim.x = pos.x
    aim.y = pos.y
  }
}

function onPointerMove(e) {
  if (!isAiming) return
  const pos = getPos(e)
  aim.x = pos.x
  aim.y = pos.y
}

function onPointerUp() {
  if (!isAiming) return
  isAiming = false
  const dx = aim.x - ball.x
  const dy = aim.y - ball.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > 8) {
    const power = Math.min(dist, AIM_MAX_DIST) / AIM_MAX_DIST
    const angle = Math.atan2(dy, dx)
    ball.vx = Math.cos(angle) * power * AIM_MAX_DIST * POWER_MULT
    ball.vy = Math.sin(angle) * power * AIM_MAX_DIST * POWER_MULT
    gameState.value = 'flying'
    reactionTimer = 0
  } else {
    gameState.value = 'idle'
  }
}

function resetShot() {
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
  gameState.value = 'idle'
  resetPositions()
}

function resetGame() {
  if (resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = null
  }
  score.value = 0
  shotsTaken.value = 0
  gameState.value = 'idle'
  particles = []
  resetPositions()
}

// ===================== 生命周期 =====================
onMounted(() => {
  ctx = canvas.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  loop()
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  if (animId) cancelAnimationFrame(animId)
  if (resetTimer) clearTimeout(resetTimer)
})
</script>

<template>
  <div class="page">
    <header class="header">
      <RouterLink to="/vue-apps" class="back">← 返回 Vue 项目</RouterLink>
      <h1>⚽ 世界杯 · 点球大战</h1>
      <div class="board">
        <span class="score">进球 {{ score }} / {{ maxShots }}</span>
        <span class="remain">剩余 {{ maxShots - shotsTaken }}</span>
      </div>
    </header>

    <div class="game" ref="gameArea">
      <canvas
        ref="canvas"
        @mousedown="onPointerDown"
        @mousemove="onPointerMove"
        @mouseup="onPointerUp"
        @mouseleave="onPointerUp"
        @touchstart.prevent="onPointerDown"
        @touchmove.prevent="onPointerMove"
        @touchend.prevent="onPointerUp"
      />

      <div v-if="gameState === 'aiming'" class="hint">
        拖拽调整方向与力度，松开射门！
      </div>

      <div v-if="gameState === 'goal'" class="pop goal">🎉 进球！</div>
      <div v-if="gameState === 'saved'" class="pop saved">🧤 被扑出！</div>
      <div v-if="gameState === 'miss'" class="pop miss">😅 射偏了！</div>

      <div v-if="gameState === 'finished'" class="overlay">
        <div class="panel">
          <h2>🏆 比赛结束</h2>
          <p class="big">{{ score }} / {{ maxShots }} 球</p>
          <p class="rate">命中率 {{ ((score / maxShots) * 100).toFixed(0) }}%</p>
          <button @click="resetGame">再来一局</button>
        </div>
      </div>
    </div>

    <div class="controls">
      <button
        @click="resetShot"
        :disabled="gameState === 'flying' || gameState === 'finished'"
      >
        重置球位
      </button>
      <button @click="resetGame">重新开始</button>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 880px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.back {
  font-size: 14px;
  color: var(--color-primary);
  white-space: nowrap;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  flex: 1;
}

.board {
  display: flex;
  gap: 14px;
  font-size: 14px;
}

.score {
  font-weight: 600;
  color: var(--color-primary);
}

.remain {
  color: var(--color-muted);
}

.game {
  position: relative;
  flex: 1;
  min-height: 520px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 13px;
  pointer-events: none;
}

.pop {
  position: absolute;
  top: 46%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 34px;
  font-weight: 700;
  pointer-events: none;
  animation: popIn 0.45s ease both;
}

@keyframes popIn {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
  65% {
    transform: translate(-50%, -50%) scale(1.15);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.goal {
  color: #ffd700;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.saved {
  color: #ff6b6b;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.miss {
  color: #bbb;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel {
  background: var(--color-card);
  padding: 30px 40px;
  border-radius: var(--radius);
  text-align: center;
  box-shadow: var(--shadow-card);
}

.panel h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.big {
  margin: 0 0 4px;
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
}

.rate {
  margin: 0 0 18px;
  color: var(--color-muted);
}

.panel button {
  padding: 10px 26px;
  font-size: 15px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
  transition: opacity 0.2s;
}

.panel button:hover {
  opacity: 0.9;
}

.controls {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  justify-content: center;
}

.controls button {
  padding: 7px 18px;
  font-size: 14px;
  border: 1px solid var(--color-primary);
  border-radius: 8px;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.controls button:hover:not(:disabled) {
  background: var(--color-primary);
  color: #fff;
}

.controls button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
