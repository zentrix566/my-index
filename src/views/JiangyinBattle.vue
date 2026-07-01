<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 江阴保卫战 · 形势图
 * - SVG 在地图底图上绘制虚线箭头：蓝色 = 江阴义军民（阎应元/陈明遇），红色 = 清军（博洛/刘良佐）
 * - 每条箭头任意位置可点击，弹出对应历史事件
 *
 * 坐标系采用 1000 × 900 的 viewBox，与示意图比例一致；
 * 真实底图请放到 public/jiangyin-map.png（缺图时使用纯色衬底，箭头依然可用）。
 */

// 路径与事件数据：path 用 SVG path 语法
// start 为起点坐标，用于绘制起点的爆炸波涟漪
const routes = [
  {
    id: 'yi-north',
    side: 'yi',
    color: '#2f6fed',
    // 江阴城 → 北门（自城内出击/驻守）
    path: 'M 470,520 Q 478,440 500,360',
    start: { x: 470, y: 520 },
    label: '江阴义军民出击北门',
    commander: '阎应元 / 陈明遇',
    summary: '义军民固守北门，多次出城反击清军围攻部队。',
    detail:
      '清顺治二年（1645），江阴军民推阎应元、陈明遇为帅，依城死守八十一日。北门为城防要点，义军自江阴城内多次出击，凭借城防与短兵反击瓦解清军攻势。'
  },
  {
    id: 'qing-west',
    side: 'qing',
    color: '#d4452f',
    // 围城清营 → 江阴城（自西侧围攻）
    path: 'M 100,560 L 440,540',
    start: { x: 100, y: 560 },
    label: '清军围城主力',
    commander: '清军 · 博洛部',
    summary: '清军主力围困江阴城西，构筑营垒压迫城防。',
    detail:
      '清贝勒博洛率主力进抵江阴城下，于城西扎营围困，使用红衣大炮昼夜轰击北门、西门一线，城中军民以血肉之躯死守。'
  },
  {
    id: 'qing-southeast',
    side: 'qing',
    color: '#d4452f',
    // 松江 → 江阴城（自东南方向增援合围）
    path: 'M 940,560 L 540,560',
    start: { x: 940, y: 560 },
    label: '清军自松江北上',
    commander: '清军 · 刘良佐部',
    summary: '刘良佐部自松江北上增援，合围江阴。',
    detail:
      '降将刘良佐率部自松江北上，与博洛部合兵围攻江阴；前后清军号称二十四万，城中守军不过数万，犹力战不退。'
  }
]

// 地名标注（viewBox 坐标）
const places = [
  { x: 500, y: 345, label: '北门', kind: 'gate' },
  { x: 470, y: 545, label: '江阴城', kind: 'city' },
  { x: 70, y: 575, label: '围城清营', kind: 'qing-camp' },
  { x: 955, y: 575, label: '松江', kind: 'qing-camp' }
]

// 选中事件 + 弹出位置（屏幕像素坐标）
const selected = ref(null)
const popupPos = ref({ x: 0, y: 0 })
const wrapRef = ref(null)

function onPathClick(route, evt) {
  selected.value = route
  const wrap = wrapRef.value
  if (!wrap) return
  const rect = wrap.getBoundingClientRect()
  popupPos.value = {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  }
}

function close() {
  selected.value = null
}

const popupStyle = computed(() => ({
  left: `${popupPos.value.x}px`,
  top: `${popupPos.value.y}px`
}))
</script>

<template>
  <div class="page">
    <header class="topbar">
      <RouterLink to="/vue-apps" class="back">← 返回 Vue 项目</RouterLink>
      <h1>江阴保卫战 · 形势图</h1>
      <span class="hint">点击任意一条箭头，查看该路线对应的历史事件</span>
    </header>

    <div class="map-wrap" ref="wrapRef" @click.self="close">
      <!-- 底图：放置 public/jiangyin-map.png；缺图时使用衬底色 -->
      <div class="map-bg" />

      <svg
        class="overlay"
        viewBox="0 0 1000 900"
        preserveAspectRatio="xMidYMid meet"
        @click.self="close"
      >
        <!-- 箭头标记定义：蓝色与红色各一份 -->
        <defs>
          <marker
            id="arrow-yi"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2f6fed" />
          </marker>
          <marker
            id="arrow-qing"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#d4452f" />
          </marker>
        </defs>

        <!-- 路线：每条由「宽透明热区 + 流动底色虚线 + 行进高光水头」组成 -->
        <g
          v-for="r in routes"
          :key="r.id"
          class="route"
          :class="['side-' + r.side, { active: selected && selected.id === r.id }]"
          @click="onPathClick(r, $event)"
        >
          <!-- 起点爆炸波：三圈同心圆错时扩散 -->
          <g class="ripple" :style="{ '--ripple-color': r.color }">
            <circle :cx="r.start.x" :cy="r.start.y" r="8" class="ripple-ring r1" />
            <circle :cx="r.start.x" :cy="r.start.y" r="8" class="ripple-ring r2" />
            <circle :cx="r.start.x" :cy="r.start.y" r="8" class="ripple-ring r3" />
            <circle :cx="r.start.x" :cy="r.start.y" r="6" class="ripple-core" />
          </g>

          <!-- 透明热区，便于点击 -->
          <path :d="r.path" class="hit" />

          <!-- 主虚线：dashoffset 做"水流 / 行军蚂蚁"动画 -->
          <path
            :d="r.path"
            class="line"
            :stroke="r.color"
            :marker-end="r.side === 'yi' ? 'url(#arrow-yi)' : 'url(#arrow-qing)'"
          />

          <!-- 高光水头：极短的实线段沿路径滚动，制造水流头部高光 -->
          <path
            :d="r.path"
            class="flow-head"
            :stroke="r.color"
          />
        </g>

        <!-- 地名标签（用 foreignObject 渲染 HTML，方便排版） -->
        <foreignObject
          v-for="p in places"
          :key="p.label"
          :x="p.x - 60"
          :y="p.y - 20"
          width="120"
          height="40"
        >
          <div class="place" :class="p.kind">
            <span class="dot" />
            <span class="name">{{ p.label }}</span>
          </div>
        </foreignObject>
      </svg>

      <!-- 图例 -->
      <div class="legend">
        <div class="item">
          <span class="bar yi" />
          江阴义军民（阎应元 / 陈明遇）
        </div>
        <div class="item">
          <span class="bar qing" />
          清军（博洛 / 刘良佐）
        </div>
      </div>

      <!-- 事件弹窗 -->
      <transition name="fade">
        <div v-if="selected" class="popup" :style="popupStyle" @click.stop>
          <button class="close" @click="close" aria-label="关闭">×</button>
          <span class="badge" :class="selected.side">
            {{ selected.side === 'yi' ? '义军民' : '清军' }}
          </span>
          <h3>{{ selected.label }}</h3>
          <p class="who">{{ selected.commander }}</p>
          <p class="sum">{{ selected.summary }}</p>
          <p class="detail">{{ selected.detail }}</p>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100%;
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.back {
  font-size: 13px;
  color: var(--color-muted);
}

.topbar h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.5px;
}

.hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-muted);
}

.map-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1000 / 900;
  background: #efe6cf;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

/* 古风地图底图：把图片放到 public/jiangyin-map.png 即可生效 */
.map-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 20%, #d8e3d2 0%, transparent 55%),
    radial-gradient(circle at 75% 25%, #d6e2cd 0%, transparent 50%),
    radial-gradient(circle at 50% 70%, #f1e6cb 0%, transparent 60%),
    linear-gradient(180deg, #e6efde 0%, #efe6cf 60%, #e6dfc6 100%);
  background-image: url('/jiangyin-map.png'), none;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: default;
}

/* 路线 */
.route {
  cursor: pointer;
}

.route .hit {
  fill: none;
  stroke: transparent;
  stroke-width: 28; /* 更宽的透明热区，便于点击 */
}

.route .line {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 10 8;
  /* 让虚线像水流一样持续向终点方向流动 */
  animation: dash-flow 1.6s linear infinite;
  transition: stroke-width 0.15s ease, filter 0.15s ease;
}

/* 行进高光水头：极短的实线段沿路径快速滑过，叠加在虚线之上 */
.route .flow-head {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  /* 一段 18 像素的实色水头 + 一段超长空白，整体随 dashoffset 滚动 */
  stroke-dasharray: 18 600;
  filter: drop-shadow(0 0 4px currentColor);
  opacity: 0.85;
  animation: flow-head-run 2.4s linear infinite;
}

.route.side-yi .flow-head {
  color: #2f6fed;
}

.route.side-qing .flow-head {
  color: #d4452f;
}

.route:hover .line,
.route.active .line {
  stroke-width: 5.5;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}

.route:hover .flow-head,
.route.active .flow-head {
  stroke-width: 6.5;
  opacity: 1;
}

/* 起点爆炸波：三圈同心圆错时扩散 */
.ripple {
  pointer-events: none;
}

.ripple-ring {
  fill: none;
  stroke: var(--ripple-color, #2f6fed);
  stroke-width: 2.5;
  transform-box: fill-box;
  transform-origin: center;
  animation: ripple-burst 1.8s ease-out infinite;
  opacity: 0;
}

.ripple-ring.r2 {
  animation-delay: 0.6s;
}

.ripple-ring.r3 {
  animation-delay: 1.2s;
}

.ripple-core {
  fill: var(--ripple-color, #2f6fed);
  filter: drop-shadow(0 0 6px var(--ripple-color, #2f6fed));
  transform-box: fill-box;
  transform-origin: center;
  animation: ripple-core-pulse 1.8s ease-in-out infinite;
}

@keyframes dash-flow {
  to {
    stroke-dashoffset: -36;
  }
}

@keyframes flow-head-run {
  from {
    stroke-dashoffset: 0;
  }
  to {
    /* 水头从起点滑到终点，再回头继续。值需大于路径长度，这里 -700 已覆盖 */
    stroke-dashoffset: -700;
  }
}

@keyframes ripple-burst {
  0% {
    transform: scale(0.4);
    opacity: 0.85;
    stroke-width: 3;
  }
  80% {
    opacity: 0.1;
    stroke-width: 1;
  }
  100% {
    transform: scale(3.6);
    opacity: 0;
    stroke-width: 0.6;
  }
}

@keyframes ripple-core-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.35);
    opacity: 0.7;
  }
}

/* 地名标签 */
.place {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transform: translateX(calc(50% - 60px + 60px - 50%));
}

.place .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2f6fed;
}

.place.gate .dot,
.place.city .dot {
  background: #2f6fed;
}

.place.qing-camp .dot {
  background: #d4452f;
}

/* 图例 */
.legend {
  position: absolute;
  left: 14px;
  bottom: 14px;
  background: rgba(255, 255, 255, 0.92);
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  line-height: 1.9;
}

.legend .item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.legend .bar {
  width: 28px;
  height: 0;
  border-top: 2.5px dashed #2f6fed;
  display: inline-block;
}

.legend .bar.qing {
  border-top-color: #d4452f;
}

/* 事件弹窗 */
.popup {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  width: 280px;
  padding: 14px 16px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  z-index: 20;
  pointer-events: auto;
}

.popup::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 14px;
  height: 14px;
  background: #fff;
  transform: translateX(-50%) rotate(45deg);
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.06);
}

.popup .close {
  position: absolute;
  top: 6px;
  right: 8px;
  border: 0;
  background: transparent;
  font-size: 18px;
  color: #888;
  cursor: pointer;
  line-height: 1;
}

.popup .close:hover {
  color: #333;
}

.popup .badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 6px;
  color: #fff;
}

.popup .badge.yi {
  background: #2f6fed;
}

.popup .badge.qing {
  background: #d4452f;
}

.popup h3 {
  margin: 4px 0 4px;
  font-size: 16px;
}

.popup .who {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-muted);
}

.popup .sum {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.popup .detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: #333;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 6px));
}
</style>
