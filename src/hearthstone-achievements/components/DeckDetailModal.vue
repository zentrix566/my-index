<template>
  <div v-if="visible && deck" class="ddm-overlay" @click.self="$emit('close')">
    <div class="ddm-modal" role="dialog" aria-modal="true" aria-labelledby="ddm-title">
      <button class="ddm-close" type="button" aria-label="关闭" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <!-- 顶部信息区：职业标签 + 卡组名 + 概览 + 操作栏 -->
      <div class="ddm-header">
        <div class="ddm-header-main">
          <span class="ddm-class-tag">{{ displayClass }}</span>
          <h3 id="ddm-title" class="ddm-title">{{ deck.name }}</h3>
          <p v-if="decoded.valid" class="ddm-meta">
            <span>共 {{ decoded.total }} 张</span>
            <span class="ddm-dot">·</span>
            <span>平均 {{ avgCost }} 费</span>
            <span class="ddm-dot">·</span>
            <span class="ddm-dust"><i class="ddm-dust-ico"></i>{{ dustTotal.toLocaleString() }} 尘 · 全金 {{ dustGolden.toLocaleString() }} 尘</span>
          </p>
        </div>
        <div class="ddm-actions">
          <button class="ddm-copy-btn" type="button" :class="{ 'ddm-copied': copied }" @click="copy">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            {{ copied ? '已复制' : '复制代码' }}
          </button>
          <button v-if="decoded.valid" class="ddm-export-btn" type="button" @click="exportImage">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
            导出图片
          </button>
          <p class="ddm-hint">复制后在游戏内「新游戏」→「导入卡组」粘贴即可使用。</p>
        </div>
      </div>

      <!-- 主体：卡牌列表（旅法师营地风格）+ 统计面板 -->
      <div v-if="decoded.valid && decoded.cards.length" class="ddm-body">
        <div class="ddm-cards">
          <div class="ddm-card-cols">
            <ul class="ddm-card-list">
              <li
                v-for="(c, idx) in leftCards"
                :key="c.dbfId + '-' + c.count + '-L' + idx"
                class="ddm-card-row"
                :style="rowStyle(c)"
                :title="c.name + ' · ' + (c.cost ?? '?') + '费 · ' + (c.rarity || '') + '（点击看大图）'"
                @click="openLightbox(c)"
              >
                <span class="ddm-crystal">
                  <svg class="ddm-crystal-svg" viewBox="0 0 24 26" aria-hidden="true">
                    <polygon points="12,1 22,7 22,19 12,25 2,19 2,7" />
                    <polygon class="ddm-crystal-face" points="12,1 22,7 12,12 2,7" />
                  </svg>
                  <span class="ddm-crystal-num">{{ c.cost ?? '?' }}</span>
                </span>
                <span class="ddm-card-name" :class="getRarityClass(c.rarity)">{{ c.name }}</span>
                <span class="ddm-count" :class="{ 'ddm-count-leg': c.rarityKey === 'legendary' }">
                  {{ c.rarityKey === 'legendary' && c.count === 1 ? '★' : c.count }}
                </span>
              </li>
            </ul>
            <ul class="ddm-card-list">
              <li
                v-for="(c, idx) in rightCards"
                :key="c.dbfId + '-' + c.count + '-R' + idx"
                class="ddm-card-row"
                :style="rowStyle(c)"
                :title="c.name + ' · ' + (c.cost ?? '?') + '费 · ' + (c.rarity || '') + '（点击看大图）'"
                @click="openLightbox(c)"
              >
                <span class="ddm-crystal">
                  <svg class="ddm-crystal-svg" viewBox="0 0 24 26" aria-hidden="true">
                    <polygon points="12,1 22,7 22,19 12,25 2,19 2,7" />
                    <polygon class="ddm-crystal-face" points="12,1 22,7 12,12 2,7" />
                  </svg>
                  <span class="ddm-crystal-num">{{ c.cost ?? '?' }}</span>
                </span>
                <span class="ddm-card-name" :class="getRarityClass(c.rarity)">{{ c.name }}</span>
                <span class="ddm-count" :class="{ 'ddm-count-leg': c.rarityKey === 'legendary' }">
                  {{ c.rarityKey === 'legendary' && c.count === 1 ? '★' : c.count }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 统计面板：法力曲线 + 类型饼图 + 造价 -->
        <div class="ddm-stats">
          <!-- 法力曲线 -->
          <section class="ddm-panel">
            <h4 class="ddm-panel-title">法力曲线</h4>
            <div class="ddm-curve">
              <div v-for="b in manaCurve" :key="b.label" class="ddm-curve-col">
                <span class="ddm-curve-val">{{ b.count || '' }}</span>
                <span class="ddm-curve-bar" :style="{ height: b.pct + '%' }"></span>
                <span class="ddm-curve-label">{{ b.label }}</span>
              </div>
            </div>
          </section>

          <!-- 卡牌构成饼图 -->
          <section class="ddm-panel">
            <h4 class="ddm-panel-title">卡牌构成</h4>
            <div class="ddm-pie-wrap">
              <svg class="ddm-pie" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  v-for="seg in typeSegments"
                  :key="seg.label"
                  class="ddm-pie-seg"
                  cx="60" cy="60" r="42"
                  fill="none"
                  :stroke="seg.color"
                  stroke-width="16"
                  :stroke-dasharray="seg.dash + ' ' + (pieCirc - seg.dash)"
                  :stroke-dashoffset="seg.offset"
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="56" class="ddm-pie-center-num">{{ decoded.total }}</text>
                <text x="60" y="72" class="ddm-pie-center-txt">张</text>
              </svg>
              <ul class="ddm-pie-legend">
                <li v-for="seg in typeSegments" :key="seg.label">
                  <span class="ddm-legend-dot" :style="{ background: seg.color }"></span>
                  <span class="ddm-legend-label">{{ seg.label }}</span>
                  <span class="ddm-legend-num">{{ seg.count }}</span>
                </li>
              </ul>
            </div>
          </section>

          <!-- 造价明细 -->
          <section class="ddm-panel">
            <h4 class="ddm-panel-title">合成造价</h4>
            <ul class="ddm-dust-list">
              <li v-for="r in rarityStats" :key="r.key" v-show="r.count">
                <span class="ddm-dust-dot" :class="'ddm-rarity-' + r.key"></span>
                <span class="ddm-dust-name" :class="'ddm-rarity-' + r.key">{{ r.label }}</span>
                <span class="ddm-dust-qty">×{{ r.count }}</span>
                <span class="ddm-dust-sum">{{ r.dust.toLocaleString() }} 尘</span>
              </li>
              <li class="ddm-dust-total">
                <span class="ddm-dust-name">普通合计</span>
                <span class="ddm-dust-sum">{{ dustTotal.toLocaleString() }} 尘</span>
              </li>
              <li class="ddm-dust-total ddm-dust-golden">
                <span class="ddm-dust-name">全金合计</span>
                <span class="ddm-dust-sum">{{ dustGolden.toLocaleString() }} 尘</span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div v-else-if="!decoded.valid" class="ddm-empty">
        <p>卡组码解析失败，请检查代码是否完整。</p>
      </div>

      <!-- 卡组介绍 -->
      <div v-if="deck.deckIntro" class="ddm-intro">
        <p class="ddm-intro-label">卡组介绍</p>
        <p class="ddm-intro-text">{{ deck.deckIntro }}</p>
      </div>

    </div>

    <!-- 卡牌大图灯箱（点击卡片弹出，替代右键下载） -->
    <div v-if="lightbox.card" class="ddm-lightbox" @click.self="closeLightbox">
      <button class="ddm-lb-close" type="button" aria-label="关闭大图" @click="closeLightbox">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <figure class="ddm-lb-figure">
        <img
          v-if="lightbox.img && !lightbox.broken"
          :src="lightbox.img"
          :alt="lightbox.card.name"
          class="ddm-lb-image"
          @error="lightbox.broken = true"
        />
        <div v-else class="ddm-lb-placeholder"><p>暂无「{{ lightbox.card.name }}」的大图</p></div>
        <figcaption class="ddm-lb-caption" :class="getRarityClass(lightbox.card.rarity)">
          {{ lightbox.card.name }}
          <span class="ddm-lb-sub">{{ lightbox.card.cost }} 费 · {{ lightbox.card.rarity }}</span>
        </figcaption>
      </figure>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { decodeDeck } from '../utils/deckstring.js'
import { getRarityClass, getCardFullImage, getRarityDust, RARITY_LABELS } from '../utils/cardImages.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  deck: { type: Object, default: null }
})
const emit = defineEmits(['close'])

const decoded = computed(() => (props.deck ? decodeDeck(props.deck.code) : { valid: false, heroClass: '未知', total: 0, cards: [] }))
const displayClass = computed(() => (props.deck && props.deck.heroClass) || decoded.value.heroClass)
const copied = ref(false)

// ── 卡牌行样式：左侧渐变（保证牌名可读）→ 右侧卡牌缩略图 ──
// 用 background-image 展示缩略图（而非 <img>），彻底规避加载失败时 @error 反复触发的死循环。
function rowStyle(c) {
  if (!c.cropImage) return {}
  return {
    backgroundImage: `linear-gradient(90deg, var(--hs-inset-bg) 0%, var(--hs-inset-bg) 46%, rgba(0,0,0,0) 100%), url("${c.cropImage}")`,
    backgroundSize: 'auto, cover',
    backgroundPosition: 'left center, right center',
    backgroundRepeat: 'no-repeat'
  }
}

// ── 概览：平均法力、总造价 ──
const avgCost = computed(() => {
  const cards = decoded.value.cards
  if (!cards.length) return '0.0'
  let sum = 0, n = 0
  for (const c of cards) { sum += (c.cost || 0) * c.count; n += c.count }
  return n ? (sum / n).toFixed(1) : '0.0'
})
const dustTotal = computed(() =>
  decoded.value.cards.reduce((acc, c) => acc + getRarityDust(c.rarity) * c.count, 0)
)

// 按法力水晶费用升序排列，便于顺眼浏览
const sortedCards = computed(() =>
  [...decoded.value.cards].sort((a, b) => (a.cost - b.cost) || a.name.localeCompare(b.name, 'zh'))
)

// 两列展示：升序后前一半放左列、后一半放右列（每列各自仍按费用升序）
const leftCards = computed(() => {
  const s = sortedCards.value
  return s.slice(0, Math.ceil(s.length / 2))
})
const rightCards = computed(() => {
  const s = sortedCards.value
  return s.slice(Math.ceil(s.length / 2))
})

// 全金造价（每张卡按金卡尘值计算）
const dustGolden = computed(() =>
  decoded.value.cards.reduce((acc, c) => acc + getRarityDust(c.rarity, true) * c.count, 0)
)

// ── 法力曲线（0..7+）──
const manaCurve = computed(() => {
  const buckets = new Array(8).fill(0)
  for (const c of decoded.value.cards) {
    const idx = Math.min(c.cost || 0, 7)
    buckets[idx] += c.count
  }
  const max = Math.max(1, ...buckets)
  return buckets.map((count, i) => ({
    label: i === 7 ? '7+' : String(i),
    count,
    pct: Math.round((count / max) * 100)
  }))
})

// ── 卡牌类型饼图（数据来自本地卡库的 type 字段，非联网）──
const TYPE_META = [
  { key: 'MINION', label: '随从', color: '#f59e0b' },
  { key: 'SPELL', label: '法术', color: '#3b82f6' },
  { key: 'WEAPON', label: '武器', color: '#64748b' },
  { key: 'LOCATION', label: '地标', color: '#10b981' },
  { key: 'HERO', label: '英雄', color: '#a855f7' }
]
const pieCirc = 2 * Math.PI * 42
const typeSegments = computed(() => {
  const counts = {}
  for (const c of decoded.value.cards) {
    const t = (c.type || 'MINION').toUpperCase()
    counts[t] = (counts[t] || 0) + c.count
  }
  const total = decoded.value.total || 1
  let acc = 0
  const segs = []
  for (const m of TYPE_META) {
    const count = counts[m.key] || 0
    if (!count) continue
    const dash = (count / total) * pieCirc
    // 配合 transform rotate(-90) 从 12 点顺时针铺开：偏移取已累计长度的负值
    const offset = -acc
    segs.push({ ...m, count, dash, offset })
    acc += dash
  }
  return segs
})

// ── 造价明细（按稀有度）──
const rarityStats = computed(() => {
  const order = ['common', 'rare', 'epic', 'legendary']
  const acc = {}
  for (const k of order) acc[k] = { key: k, label: RARITY_LABELS[k], count: 0, dust: 0 }
  for (const c of decoded.value.cards) {
    const k = order.includes(c.rarityKey) ? c.rarityKey : null
    if (!k) continue
    acc[k].count += c.count
    acc[k].dust += getRarityDust(c.rarity) * c.count
  }
  return order.map((k) => acc[k])
})

// ── 卡牌大图灯箱 ──
const lightbox = reactive({ card: null, img: '', broken: false })
function openLightbox(card) {
  lightbox.card = card
  lightbox.img = getCardFullImage(card.name, card.id)
  lightbox.broken = false
}
function closeLightbox() {
  lightbox.card = null
  lightbox.img = ''
  lightbox.broken = false
}
function onKeydown(e) {
  if (e.key === 'Escape') {
    if (lightbox.card) closeLightbox()
    else if (props.visible) emit('close')
  }
}
watch(() => props.visible, (show) => {
  if (show) window.addEventListener('keydown', onKeydown)
  else { window.removeEventListener('keydown', onKeydown); closeLightbox() }
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// ── 复制卡组码 ──
async function copy() {
  if (!props.deck) return
  try {
    await navigator.clipboard.writeText(props.deck.code)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.deck.code
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// ── 导出卡组图片（原生 Canvas，无第三方依赖；缩略图走同源 OSS 代理，无跨域污染）──
const CRYSTAL_BLUE = '#2f7fd1'
const RARITY_HEX = { common: '#e5e7eb', rare: '#60a5fa', epic: '#c084fc', legendary: '#fb923c', unknown: '#cbd5e1' }

// 预加载一张缩略图（失败返回 null，不阻塞导出）
function loadThumb(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => resolve(im)
    im.onerror = () => resolve(null)
    im.src = src
  })
}

// 圆角矩形路径（兼容无 ctx.roundRect 的环境）
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function exportImage() {
  const cards = [...sortedCards.value]
  const curve = manaCurve.value
  const maxCurve = Math.max(1, ...curve.map((b) => b.count))
  const thumbs = await Promise.all(cards.map((c) => loadThumb(c.cropImage)))

  const dpr = 2
  const W = 780
  const padX = 28
  const headerH = 120
  const rowH = 42
  const gap = 16
  const cols = 2
  const rows = Math.ceil(cards.length / cols)
  const footerH = 50
  const H = headerH + rows * rowH + footerH
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1c2740')
  bg.addColorStop(1, '#0e1526')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(217,168,84,0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, W - 2, H - 2)

  // ── 头部：左侧卡组信息，右侧法力曲线 ──
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  // 左：卡组名 / 职业 / 概览 / 造价
  ctx.fillStyle = '#f6c667'
  ctx.font = '700 26px "Microsoft YaHei","PingFang SC",sans-serif'
  ctx.fillText(props.deck.name || '炉石卡组', padX, 44)
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '400 15px "Microsoft YaHei","PingFang SC",sans-serif'
  ctx.fillText(
    `${displayClass.value} · 共 ${decoded.value.total} 张 · 平均 ${avgCost.value} 费`,
    padX, 72
  )
  ctx.font = '700 15px "Microsoft YaHei","PingFang SC",sans-serif'
  let dx = padX
  ctx.fillStyle = '#e2e8f0'
  ctx.fillText('造价 ', dx, 96); dx += ctx.measureText('造价 ').width
  ctx.fillStyle = '#d9a854'
  ctx.fillText(`${dustTotal.value.toLocaleString()} 尘`, dx, 96); dx += ctx.measureText(`${dustTotal.value.toLocaleString()} 尘`).width
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(' · 全金 ', dx, 96); dx += ctx.measureText(' · 全金 ').width
  ctx.fillStyle = '#fbbf24'
  ctx.fillText(`${dustGolden.value.toLocaleString()} 尘`, dx, 96)

  // 右：法力曲线
  const chartX = Math.floor(W * 0.56)
  const chartW = W - padX - chartX
  const chartTop = 16
  const chartBottom = headerH - 24
  const chartH = chartBottom - chartTop - 20
  const barW = chartW / curve.length
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '600 13px "Microsoft YaHei","PingFang SC",sans-serif'
  ctx.fillText('法力曲线', chartX, chartTop + 2)
  ctx.textAlign = 'center'
  curve.forEach((b, i) => {
    const h = (b.count / maxCurve) * chartH
    const x = chartX + i * barW + barW * 0.18
    const w = barW * 0.64
    ctx.fillStyle = 'rgba(226,232,240,0.82)'
    ctx.fillRect(x, chartBottom - h, w, h)
    if (b.count) {
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '700 11px "Microsoft YaHei",sans-serif'
      ctx.fillText(String(b.count), x + w / 2, chartBottom - h - 5)
    }
    ctx.fillStyle = '#94a3b8'
    ctx.font = '400 11px "Microsoft YaHei",sans-serif'
    ctx.fillText(b.label, x + w / 2, chartBottom + 13)
  })
  ctx.textAlign = 'left'

  // ── 卡牌网格：法力值 | 名称 | 统一长度缩略图 | 数量 ──
  const gridTop = headerH
  const colW = (W - padX * 2 - gap) / cols
  const stripH = rowH - 8
  const nameMax = 124
  const countW = 30
  ctx.textBaseline = 'middle'
  cards.forEach((c, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = padX + col * (colW + gap)
    const y = gridTop + row * rowH + rowH / 2

    // 行底纹
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fillRect(x, y - rowH / 2 + 3, colW, rowH - 6)

    // 统一缩略图区域（固定宽度，拉伸填充）
    const stripX = x + 38 + nameMax + 12
    const stripW = (x + colW - countW - 8) - stripX
    const stripY = y - stripH / 2
    if (thumbs[i]) {
      ctx.drawImage(thumbs[i], stripX, stripY, stripW, stripH)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(stripX, stripY, stripW, stripH)
    }

    // 左侧压暗渐变：保证水晶、牌名清晰可读（仿旅法师营地）
    const shade = ctx.createLinearGradient(x, 0, x + colW, 0)
    shade.addColorStop(0, 'rgba(14,21,38,0.92)')
    shade.addColorStop(0.45, 'rgba(14,21,38,0.72)')
    shade.addColorStop(0.75, 'rgba(14,21,38,0.25)')
    shade.addColorStop(1, 'rgba(14,21,38,0)')
    ctx.fillStyle = shade
    ctx.fillRect(x, y - rowH / 2 + 3, colW, rowH - 6)

    // 法力水晶
    const gx = x + 16, gy = y, r = 12
    ctx.beginPath()
    ctx.moveTo(gx, gy - r); ctx.lineTo(gx + r, gy - r / 2); ctx.lineTo(gx + r, gy + r / 2)
    ctx.lineTo(gx, gy + r); ctx.lineTo(gx - r, gy + r / 2); ctx.lineTo(gx - r, gy - r / 2)
    ctx.closePath()
    ctx.fillStyle = CRYSTAL_BLUE; ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '700 13px "Microsoft YaHei",sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(c.cost ?? '?'), gx, gy + 1)

    // 牌名（固定宽度，超长截断）
    const nameX = gx + r + 10
    ctx.textAlign = 'left'
    ctx.fillStyle = RARITY_HEX[c.rarityKey] || '#e5e7eb'
    ctx.font = '600 14px "Microsoft YaHei","PingFang SC",sans-serif'
    let name = c.name
    while (ctx.measureText(name).width > nameMax && name.length > 1) name = name.slice(0, -1)
    if (name !== c.name) name = name.slice(0, -1) + '…'
    ctx.fillText(name, nameX, gy + 1)

    // 数量（灰底白字）
    const txt = c.rarityKey === 'legendary' && c.count === 1 ? '★' : String(c.count)
    ctx.font = '800 13px "Microsoft YaHei",sans-serif'
    ctx.textAlign = 'right'
    const tw = ctx.measureText(txt).width + 12
    ctx.fillStyle = '#475569'
    roundRect(ctx, x + colW - tw, y - 11, tw, 22, 6)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(txt, x + colW - 6, gy + 1)
  })
  ctx.textAlign = 'left'

  // 页脚
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '400 12px "Microsoft YaHei",sans-serif'
  ctx.fillText('由 zentrix566.top/hearthstone 生成', padX, H - 22)

  const link = document.createElement('a')
  link.download = `${(props.deck.name || 'deck').replace(/[\\/:*?"<>|]/g, '_')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
</script>

<style scoped>
.ddm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}
.ddm-modal {
  position: relative;
  width: 100%;
  max-width: 980px;
  padding: 28px 30px 24px;
  border: 1px solid var(--hs-border);
  border-radius: 20px;
  color: var(--hs-text);
  background: var(--hs-surface-raised);
  box-shadow: var(--hs-shadow-strong);
  max-height: 88vh;
  overflow-y: auto;
}
.ddm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--hs-border);
  border-radius: 10px;
  color: var(--hs-muted);
  background: var(--hs-surface-soft);
  cursor: pointer;
  transition: all .18s;
}
.ddm-close:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }

/* ── 顶部信息区 ── */
.ddm-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.ddm-header-main { flex: 1 1 auto; min-width: 0; }
.ddm-class-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #e65100, #f57c00);
  color: #fff;
}
.ddm-title { margin: 8px 0 2px; color: var(--hs-text); font-size: 22px; font-weight: 700; }
.ddm-meta { margin: 0; color: var(--hs-muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }
.ddm-dot { opacity: .5; }
.ddm-dust { display: inline-flex; align-items: center; gap: 5px; color: var(--hs-gold); font-weight: 700; }
.ddm-dust-ico {
  width: 11px; height: 11px; display: inline-block;
  background: var(--hs-gold);
  clip-path: polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%);
}

/* ── 主体：列表 + 统计 ── */
.ddm-body {
  display: grid;
  grid-template-columns: 1fr 264px;
  gap: 20px;
  margin-bottom: 18px;
}

/* ── 卡牌列表（旅法师营地风格）── */
.ddm-cards {
  padding: 10px;
  border-radius: 14px;
  background: var(--hs-inset-bg);
  border: 1px solid var(--hs-border);
}
.ddm-card-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ddm-card-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
}
.ddm-card-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 6px 0 4px;
  border-radius: 7px;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  overflow: hidden;
  background-color: var(--hs-inset-bg);
  transition: transform .1s, box-shadow .12s;
}
.ddm-card-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 10px rgba(0,0,0,.18);
}

/* 法力水晶 */
.ddm-crystal {
  position: relative;
  flex: 0 0 auto;
  width: 24px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ddm-crystal-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ddm-crystal-svg polygon { fill: #2f7fd1; stroke: #1b558f; stroke-width: 0.8; }
.ddm-crystal-svg .ddm-crystal-face { fill: rgba(255,255,255,.28); stroke: none; }
.ddm-crystal-num {
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.7);
}

/* 牌名 */
.ddm-card-name {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  letter-spacing: .02em;
  text-shadow: 0 1px 3px var(--hs-inset-bg), 0 0 2px var(--hs-inset-bg);
}
.ddm-rarity-common   { color: var(--hs-text); }
.ddm-rarity-rare     { color: #2563eb; }
.ddm-rarity-epic     { color: #9333ea; }
.ddm-rarity-legendary{ color: #f97316; }

/* 数量 */
.ddm-count {
  flex: 0 0 auto;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fff;
  background: #475569;
  border: 1px solid #64748b;
}
.ddm-count-leg { color: #fbbf24; background: rgba(251,191,36,.14); border-color: rgba(251,191,36,.4); }

/* ── 统计面板 ── */
.ddm-stats { display: flex; flex-direction: column; gap: 14px; }
.ddm-panel {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--hs-inset-bg);
  border: 1px solid var(--hs-border);
}
.ddm-panel-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--hs-text-soft);
  letter-spacing: .04em;
}

/* 法力曲线 */
.ddm-curve {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  align-items: end;
  gap: 4px;
  height: 96px;
}
.ddm-curve-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.ddm-curve-val { font-size: 10px; font-weight: 700; color: var(--hs-muted); height: 12px; }
.ddm-curve-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, #4c9be8, #2f7fd1);
}
.ddm-curve-label { margin-top: 4px; font-size: 10px; font-weight: 600; color: var(--hs-muted); }

/* 饼图 */
.ddm-pie-wrap { display: flex; align-items: center; gap: 12px; }
.ddm-pie { flex: 0 0 auto; width: 108px; height: 108px; transform: none; }
.ddm-pie-center-num { fill: var(--hs-text); font-size: 22px; font-weight: 800; text-anchor: middle; }
.ddm-pie-center-txt { fill: var(--hs-muted); font-size: 11px; text-anchor: middle; }
.ddm-pie-legend { flex: 1 1 auto; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.ddm-pie-legend li { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--hs-text-soft); }
.ddm-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.ddm-legend-label { flex: 1 1 auto; }
.ddm-legend-num { font-weight: 700; color: var(--hs-text); font-variant-numeric: tabular-nums; }

/* 造价明细 */
.ddm-dust-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.ddm-dust-list li { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
.ddm-dust-dot { width: 9px; height: 9px; border-radius: 2px; flex: 0 0 auto; }
.ddm-dust-dot.ddm-rarity-common { background: #9ca3af; }
.ddm-dust-dot.ddm-rarity-rare { background: #2563eb; }
.ddm-dust-dot.ddm-rarity-epic { background: #9333ea; }
.ddm-dust-dot.ddm-rarity-legendary { background: #f97316; }
.ddm-dust-name { flex: 1 1 auto; font-weight: 600; }
.ddm-dust-qty { color: var(--hs-muted); font-variant-numeric: tabular-nums; }
.ddm-dust-sum { font-weight: 700; color: var(--hs-text); font-variant-numeric: tabular-nums; min-width: 68px; text-align: right; }
.ddm-dust-total { margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--hs-border); }
.ddm-dust-total .ddm-dust-sum { color: var(--hs-gold); }
.ddm-dust-golden .ddm-dust-sum { color: #fbbf24; }

/* ── 卡组介绍 ── */
.ddm-intro {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
}
.ddm-intro-label { margin: 0 0 6px; color: var(--hs-text-soft); font-size: 12px; font-weight: 700; }
.ddm-intro-text { margin: 0; color: var(--hs-muted); font-size: 13px; line-height: 1.7; white-space: pre-line; }

/* ── 空状态 ── */
.ddm-empty {
  margin-bottom: 18px;
  padding: 24px;
  border-radius: 12px;
  color: var(--hs-muted);
  text-align: center;
  background: var(--hs-surface-soft);
}

/* ── 操作栏（位于卡组名右侧）── */
.ddm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; margin: 0; padding: 0; border: none; }
.ddm-actions .ddm-hint { flex: 0 0 100%; margin: 4px 0 0; text-align: right; font-size: 12px; }
.ddm-copy-btn, .ddm-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.ddm-copy-btn {
  border: 1px solid rgba(74, 222, 128, 0.4);
  color: #16a34a;
  background: rgba(74, 222, 128, 0.08);
}
.ddm-copy-btn:hover { background: rgba(74, 222, 128, 0.16); border-color: rgba(74, 222, 128, 0.6); }
.ddm-copied { color: #fff; background: #16a34a; border-color: #16a34a; }
.ddm-export-btn {
  border: 1px solid rgba(59,130,246,.4);
  color: #2563eb;
  background: rgba(59,130,246,.08);
}
.ddm-export-btn:hover { background: rgba(59,130,246,.16); border-color: rgba(59,130,246,.6); }
.ddm-hint { margin: 0; color: var(--hs-muted); font-size: 12px; flex: 1 1 200px; }

/* ── 卡牌大图灯箱 ── */
.ddm-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(3, 7, 18, 0.82);
  backdrop-filter: blur(6px);
}
.ddm-lb-close {
  position: absolute;
  top: 18px;
  right: 20px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 12px;
  color: #fff;
  background: rgba(255,255,255,.08);
  cursor: pointer;
}
.ddm-lb-close:hover { background: rgba(255,255,255,.18); }
.ddm-lb-figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.ddm-lb-image {
  max-width: min(420px, 86vw);
  max-height: 74vh;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}
.ddm-lb-placeholder {
  width: 320px; height: 440px;
  display: grid; place-items: center;
  border-radius: 16px;
  color: rgba(255,255,255,.7);
  background: rgba(255,255,255,.06);
  border: 1px dashed rgba(255,255,255,.2);
}
.ddm-lb-caption { color: #fff; font-size: 18px; font-weight: 800; text-align: center; }
.ddm-lb-caption.ddm-rarity-rare { color: #60a5fa; }
.ddm-lb-caption.ddm-rarity-epic { color: #c084fc; }
.ddm-lb-caption.ddm-rarity-legendary { color: #fb923c; }
.ddm-lb-sub { display: block; margin-top: 4px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,.7); }

/* focus */
.ddm-close:focus-visible,
.ddm-copy-btn:focus-visible,
.ddm-export-btn:focus-visible,
.ddm-card-row:focus-visible {
  outline: 3px solid var(--hs-focus);
  outline-offset: 2px;
}

/* 暗色主题：稀有度文字在深色表面提亮 */
.hs-page[data-hs-theme="dark"] .ddm-rarity-rare { color: #60a5fa; }
.hs-page[data-hs-theme="dark"] .ddm-rarity-epic { color: #c084fc; }
.hs-page[data-hs-theme="dark"] .ddm-rarity-legendary { color: #fb923c; }

@media (max-width: 760px) {
  .ddm-modal { padding: 22px 16px 18px; max-width: calc(100vw - 32px); }
  .ddm-header { flex-direction: column; }
  .ddm-actions { justify-content: flex-start; width: 100%; margin-top: 12px; }
  .ddm-actions .ddm-hint { text-align: left; }
  .ddm-body { grid-template-columns: 1fr; }
}
</style>
