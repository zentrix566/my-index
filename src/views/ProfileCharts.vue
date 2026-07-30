<template>
  <div class="pc-charts-wrap">
    <div class="pc-share-bar">
      <span class="pc-share-title">我的炉石传说成就数据</span>
      <button type="button" class="pc-share-btn" :disabled="!ready" @click="shareCharts">分享成就图</button>
    </div>
    <div class="pc-charts pc-chart-grid">
      <div v-if="!ready" class="pc-charts-loading">
        <span class="pc-spinner" aria-hidden="true"></span>
        正在加载你的成就数据…
      </div>
      <template v-else>
        <section class="pc-chart-card pc-chart-gauge">
          <div class="pc-chart-head">
            <h3>总完成度</h3>
            <p class="pc-chart-cap">
              已点亮 <strong>{{ stats.overall.completedAchievements }}</strong> /
              {{ stats.overall.totalAchievements }} 个成就 ·
              获得 <strong>{{ stats.overall.earnedPoints }}</strong> /
              {{ stats.overall.totalPoints }} 点
            </p>
            <p class="pc-chart-note">
              百分比 = 已点亮成就数 ÷ 总成就数；满 100% 表示全部成就已点亮（点数完成度见上方「点」）。
            </p>
          </div>
          <div ref="gaugeRef" class="pc-chart pc-chart-gauge-el"></div>
        </section>

      <section class="pc-chart-card">
        <div class="pc-chart-head"><h3>各版本完成率</h3></div>
        <div ref="versionBarRef" class="pc-chart pc-chart-tall"></div>
      </section>

      <section class="pc-chart-card">
        <div class="pc-chart-head"><h3>按职业完成分布</h3></div>
        <div ref="classPieRef" class="pc-chart"></div>
      </section>

      <section class="pc-chart-card">
        <div class="pc-chart-head"><h3>职业点数雷达</h3></div>
        <div ref="radarRef" class="pc-chart"></div>
      </section>

      <section class="pc-chart-card">
        <div class="pc-chart-head"><h3>成就类型分布</h3></div>
        <div ref="typeBarRef" class="pc-chart"></div>
      </section>

      <section class="pc-chart-card">
        <div class="pc-chart-head"><h3>难度分布</h3></div>
        <div ref="diffPieRef" class="pc-chart"></div>
      </section>
    </template>
    </div>
    <ShareChartsModal
      :visible="share.visible"
      :data-url="share.dataUrl"
      :title="share.title"
      @close="share.visible = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { expansions, originalExpansions } from '../features/hearthstone/data/expansions.js'
import { classColors } from '../features/hearthstone/utils/achievements.js'
import {
  prepareShareCanvas,
  SHARE_SOURCE_SCALE
} from '../features/hearthstone/utils/shareCanvas.js'
import { useAchievementProgress } from '../features/hearthstone/composables/useAchievementProgress.js'
import ShareChartsModal from '../features/hearthstone/components/ShareChartsModal.vue'

const ach = useAchievementProgress()
const { progress, loaded, init, reload, getStats } = ach
init()

// 硬核模式：开启则统计全部版本，否则仅核心版本（与「成就查看器」一致）
const props = defineProps({
  hardcore: { type: Boolean, default: false }
})

// 扁平化成就（带版本信息）；硬核下含全部版本，否则仅核心版本
const srcExpansions = computed(() => props.hardcore ? expansions : originalExpansions)
const allAch = computed(() => {
  const out = []
  for (const exp of srcExpansions.value) {
    for (const a of (exp.achievements || [])) {
      out.push({ ...a, _exp: exp.id, _expName: exp.name })
    }
  }
  return out
})

// 图表只依赖静态成就定义（随包同步加载，mount 即就绪），不依赖进度接口；
// 进度仅用于把数字从「全 0」填充为真实完成度，缺失也不影响出图。
const ready = computed(() => allAch.value.length > 0)

// 职业固定展示顺序（仅保留有数据的）
const CLASS_ORDER = [
  '恶魔猎手', '德鲁伊', '猎人', '法师', '圣骑士', '牧师',
  '潜行者', '萨满祭司', '术士', '战士', '死亡骑士', '中立', '双职业'
]

// 暗色主题统一配色
const C = {
  text: '#cbd5e1',
  sub: '#94a3b8',
  axis: '#475569',
  split: 'rgba(148,163,184,0.16)',
  green: '#22c55e',
  gold: '#d97706',
  blue: '#38bdf8',
  purple: '#a78bfa',
  pink: '#f472b6',
  line: 'rgba(34,197,94,0.45)'
}

const gaugeRef = ref(null)
const versionBarRef = ref(null)
const classPieRef = ref(null)
const radarRef = ref(null)
const typeBarRef = ref(null)
const diffPieRef = ref(null)

let echartsLib = null
let charts = []

// echarts 按需引入：仅注册用到的图表与组件，显著减小打包体积
async function ensureEcharts() {
  if (echartsLib) return echartsLib
  const [core, chartsMod, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers')
  ])
  core.use([
    chartsMod.GaugeChart,
    chartsMod.BarChart,
    chartsMod.PieChart,
    chartsMod.RadarChart,
    components.GridComponent,
    components.TooltipComponent,
    components.LegendComponent,
    components.RadarComponent,
    renderers.CanvasRenderer
  ])
  echartsLib = core
  return core
}

function buildStats() {
  const overall = getStats(allAch.value)

  // 各版本
  const byVersion = srcExpansions.value
    .map((exp) => {
      const list = (exp.achievements || []).map((a) => ({ ...a, _exp: exp.id, _expName: exp.name }))
      const s = getStats(list)
      return {
        name: exp.name,
        pct: s.totalAchievements ? Math.round((s.completedAchievements / s.totalAchievements) * 100) : 0,
        completed: s.completedAchievements,
        total: s.totalAchievements
      }
    })
    .filter((v) => v.total > 0)
    .sort((a, b) => b.pct - a.pct)

  // 单次遍历累计：职业 / 类型 / 难度 三个维度（避免对每个成就重复调用 getStats）
  const classMap = {}
  for (const c of CLASS_ORDER) classMap[c] = { total: 0, completed: 0, points: 0, totalPoints: 0 }
  const typeAgg = { 一次性: { total: 0, completed: 0 }, 累计: { total: 0, completed: 0 } }
  const diffMap = {}
  for (const a of allAch.value) {
    const s = getStats([a])
    const key = a.dualClasses ? '双职业' : (a.heroClass || '中立')
    if (!classMap[key]) classMap[key] = { total: 0, completed: 0, points: 0, totalPoints: 0 }
    classMap[key].total += s.totalAchievements
    classMap[key].completed += s.completedAchievements
    classMap[key].points += s.earnedPoints
    classMap[key].totalPoints += s.totalPoints

    const tk = a.type === '累计' ? '累计' : '一次性'
    typeAgg[tk].total += s.totalAchievements
    typeAgg[tk].completed += s.completedAchievements

    const d = a.difficulty || '未知'
    if (!diffMap[d]) diffMap[d] = { total: 0, completed: 0 }
    diffMap[d].total += s.totalAchievements
    diffMap[d].completed += s.completedAchievements
  }
  const classKeys = CLASS_ORDER.filter((c) => classMap[c] && classMap[c].total > 0)
  const classData = classKeys.map((c) => ({
    name: c,
    value: classMap[c].completed,
    itemStyle: { color: classColors[c] || C.blue }
  }))
  const radarData = classKeys.map((c) => classMap[c].points)
  const radarTotal = classKeys.map((c) => classMap[c].totalPoints)

  return { overall, byVersion, classKeys, classData, radarData, radarTotal, typeAgg, diffMap }
}

function gaugeOption(pct) {
  // pct 为「已点亮成就数 / 总成就数」的百分比（与上方文字口径一致），保留 1 位小数以便区分 99% 与 100%
  return {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      radius: '92%',
      center: ['50%', '58%'],
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: C.green } },
      axisLine: { lineStyle: { width: 16, color: [[1, 'rgba(148,163,184,0.2)']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      title: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 34,
        fontWeight: 800,
        color: '#e2e8f0',
        offsetCenter: [0, '0%'],
        formatter: (v) => {
          const d = Number.isInteger(v) ? v : Math.round(v * 10) / 10
          return d + '%'
        }
      },
      data: [{ value: pct }]
    }]
  }
}

function versionBarOption(byVersion) {
  const names = byVersion.map((v) => v.name)
  const vals = byVersion.map((v) => v.pct)
  return {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 44, top: 10, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: C.text },
      formatter: (p) => {
        const v = byVersion[p[0].dataIndex]
        return `${v.name}<br/>完成率 ${v.pct}% （${v.completed}/${v.total}）`
      }
    },
    xAxis: {
      type: 'value', max: 100,
      axisLine: { lineStyle: { color: C.axis } },
      axisLabel: { color: C.sub, formatter: '{value}%' },
      splitLine: { lineStyle: { color: C.split } }
    },
    yAxis: {
      type: 'category', data: names, inverse: true,
      axisLine: { lineStyle: { color: C.axis } },
      axisTick: { show: false },
      axisLabel: { color: C.text, fontSize: 12 }
    },
    series: [{
      type: 'bar',
      data: vals,
      barWidth: '62%',
      label: { show: true, position: 'right', color: C.text, formatter: '{c}%', fontSize: 11 },
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: 'rgba(34,197,94,0.45)' },
            { offset: 1, color: C.green }
          ]
        }
      }
    }]
  }
}

function classPieOption(classData) {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: C.text },
      formatter: '{b}<br/>已完成 {c} 个'
    },
    legend: {
      type: 'scroll', orient: 'horizontal', bottom: 0,
      textStyle: { color: C.sub, fontSize: 11 },
      pageTextStyle: { color: C.sub }
    },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '46%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'rgba(15,23,42,0.6)', borderWidth: 2 },
      label: { color: C.text, fontSize: 11, formatter: '{b}\n{c}' },
      labelLine: { lineStyle: { color: C.axis } },
      data: classData
    }]
  }
}

function radarOption(classKeys, earned, totals) {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: C.text },
      formatter: (p) => {
        const i = p.dataIndex
        const tot = totals[i] || 0
        const earnedPts = earned[i] || 0
        const pct = tot ? Math.round((earnedPts / tot) * 100) : 0
        return `${classKeys[i]}<br/>已获得 ${earnedPts} / ${tot} 点（${pct}%）`
      }
    },
    legend: { bottom: 0, textStyle: { color: C.sub, fontSize: 11 } },
    radar: {
      center: ['50%', '48%'],
      radius: '64%',
      indicator: classKeys.map((c, i) => ({ name: c, max: Math.max(1, totals[i]) })),
      axisName: { color: C.text, fontSize: 11 },
      splitLine: { lineStyle: { color: C.split } },
      splitArea: { areaStyle: { color: ['rgba(34,197,94,0.04)', 'rgba(56,189,248,0.05)'] } },
      axisLine: { lineStyle: { color: C.split } }
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: totals,
          name: '总点数',
          symbolSize: 3,
          lineStyle: { color: 'rgba(148,163,184,0.5)', width: 1, type: 'dashed' },
          areaStyle: { color: 'rgba(148,163,184,0.08)' },
          itemStyle: { color: C.sub }
        },
        {
          value: earned,
          name: '已获得',
          symbolSize: 4,
          lineStyle: { color: C.green, width: 2 },
          areaStyle: { color: 'rgba(34,197,94,0.28)' },
          itemStyle: { color: C.green }
        }
      ]
    }]
  }
}

function typeBarOption(typeAgg) {
  const cats = ['一次性', '累计']
  const completed = [typeAgg['一次性'].completed, typeAgg['累计'].completed]
  const total = [typeAgg['一次性'].total, typeAgg['累计'].total]
  return {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: C.text }
    },
    legend: { top: 0, textStyle: { color: C.sub, fontSize: 11 } },
    xAxis: {
      type: 'category', data: cats,
      axisLine: { lineStyle: { color: C.axis } },
      axisTick: { show: false },
      axisLabel: { color: C.text }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: C.axis } },
      axisLabel: { color: C.sub },
      splitLine: { lineStyle: { color: C.split } }
    },
    series: [
      {
        name: '已完成', type: 'bar', data: completed, barWidth: '32%',
        itemStyle: { borderRadius: [6, 6, 0, 0], color: C.green },
        label: { show: true, position: 'top', color: C.text, fontSize: 11 }
      },
      {
        name: '总数', type: 'bar', data: total, barWidth: '32%',
        itemStyle: { borderRadius: [6, 6, 0, 0], color: 'rgba(56,189,248,0.55)' }
      }
    ]
  }
}

function diffPieOption(diffMap) {
  const palette = { 易: '#4caf50', 中等: '#ff9800', 难: '#e53935', 未知: '#64748b' }
  const data = Object.keys(diffMap).map((d) => ({
    name: d,
    value: diffMap[d].completed,
    itemStyle: { color: palette[d] || C.blue }
  }))
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: C.text },
      formatter: (p) => {
        const d = diffMap[p.name]
        return `${p.name}<br/>已完成 ${p.value} / ${d.total}`
      }
    },
    legend: { bottom: 0, textStyle: { color: C.sub, fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '46%'],
      itemStyle: { borderColor: 'rgba(15,23,42,0.6)', borderWidth: 2 },
      label: { color: C.text, fontSize: 11, formatter: '{b}\n{c}' },
      labelLine: { lineStyle: { color: C.axis } },
      data
    }]
  }
}

function disposeAll() {
  for (const c of charts) {
    try { c && c.dispose() } catch { /* ignore */ }
  }
  charts = []
}

const resizeHandler = () => {
  for (const c of charts) {
    try { c && c.resize() } catch { /* ignore */ }
  }
}

// 硬核模式切换时重算并重绘（数据源在 core/all 间切换）
watch(() => props.hardcore, () => { if (ready.value) render() })
// 进度接口返回后重绘（数字从「全 0」刷新为真实完成度）
watch(loaded, () => { if (ready.value) render() })

async function render() {
  if (!allAch.value.length) return
  const lib = await ensureEcharts()
  await nextTick()
  disposeAll()
  const s = stats.value
  const mk = (el, opt) => {
    if (!el) return null
    const c = lib.init(el, null, { renderer: 'canvas' })
    c.setOption(opt)
    charts.push(c)
    return c
  }
  // 总完成度仪表盘：按「已点亮成就数 / 总成就数」计算（与卡片文字口径一致，避免点数完成度 100% 与成就数 99% 的混淆）
  const overallPct = s.overall.totalAchievements
    ? (s.overall.completedAchievements / s.overall.totalAchievements) * 100
    : 0
  mk(gaugeRef.value, gaugeOption(overallPct))
  mk(versionBarRef.value, versionBarOption(s.byVersion))
  mk(classPieRef.value, classPieOption(s.classData))
  mk(radarRef.value, radarOption(s.classKeys, s.radarData, s.radarTotal))
  mk(typeBarRef.value, typeBarOption(s.typeAgg))
  mk(diffPieRef.value, diffPieOption(s.diffMap))
}

const stats = computed(() => (ready.value ? buildStats() : null))

// ============ 分享成就图（个人中心）============
// 将当前已渲染的各 ECharts 图表合成为一张长图，支持下载 / 复制。
const share = reactive({ visible: false, dataUrl: '', title: '我的炉石传说成就数据' })
// 与模板中各图表的渲染顺序一致（仪表盘 + 其余 5 张）
const chartTitles = ['总完成度', '各版本完成率', '按职业完成分布', '职业点数雷达', '成就类型分布', '难度分布']

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// 各图原始宽高比不同（如「各版本完成率」是竖向长条），合成时按原始比例等比缩放，
// 否则强行塞进固定尺寸会被压扁 / 拉伸变形。
async function buildShareImage() {
  if (!charts.length) throw new Error('图表尚未渲染')
  // 逐个导出画布（含深色背景），再按原始比例贴到一张合成图上
  const urls = charts.map((c) => c.getDataURL({
    type: 'png',
    pixelRatio: SHARE_SOURCE_SCALE,
    backgroundColor: '#0f172a'
  }))
  const imgs = await Promise.all(urls.map(loadImage))

  const pad = 24
  const gap = 16
  const labelH = 26
  const colW = 470
  const cols = 2
  const titleH = 70

  const width = pad * 2 + colW * cols + gap * (cols - 1)
  const contentW = width - pad * 2

  // 第 0 张（仪表盘）跨整行，按比例算高度
  const gauge = imgs[0]
  const gaugeH = contentW * (gauge.height / gauge.width)
  const rest = imgs.slice(1)

  // 其余按 2 列排布，每行高度取该行两张图的最大高度（各自仍按自身比例缩放）
  let restHeight = 0
  for (let i = 0; i < rest.length; i += cols) {
    let rowH = 0
    for (let j = 0; j < cols; j++) {
      const img = rest[i + j]
      if (!img) break
      const h = colW * (img.height / img.width)
      if (h > rowH) rowH = h
    }
    restHeight += rowH + labelH + gap
  }

  const height = pad + titleH + gaugeH + gap + restHeight + pad

  const canvas = document.createElement('canvas')
  const ctx = prepareShareCanvas(canvas, width, height)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, width, height)

  // 标题
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '700 24px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('我的炉石传说成就数据', pad, pad + titleH / 2)

  // 仪表盘（跨整行，按比例）
  let y = pad + titleH
  ctx.drawImage(gauge, pad, y, contentW, gaugeH)
  y += gaugeH + gap

  // 其余 2 列网格（每张按自身原始比例缩放，标题贴在各图下方）
  for (let i = 0; i < rest.length; i += cols) {
    const cells = []
    let rowH = 0
    for (let j = 0; j < cols; j++) {
      const img = rest[i + j]
      if (!img) break
      const h = colW * (img.height / img.width)
      cells.push({ img, h })
      if (h > rowH) rowH = h
    }
    cells.forEach((cell, j) => {
      const x = pad + j * (colW + gap)
      ctx.drawImage(cell.img, x, y, colW, cell.h)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '600 14px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillText(chartTitles[i + 1 + j], x, y + cell.h + labelH / 2)
    })
    y += rowH + labelH + gap
  }

  return canvas.toDataURL('image/png')
}

async function shareCharts() {
  try {
    const url = await buildShareImage()
    share.dataUrl = url
    share.visible = true
  } catch (e) {
    console.error('[charts] 分享图生成失败:', e)
  }
}

onMounted(async () => {
  window.addEventListener('resize', resizeHandler)
  await nextTick()
  // 静态数据已就绪，先出图（进度为空时数字计 0）
  try { await render() } catch (e) { console.error('[charts] 渲染失败:', e) }
  // 进度拉取完成后重绘，把「全 0」刷新为真实完成度
  try { await reload() } catch { /* ignore */ }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  disposeAll()
})
</script>

<style scoped>
.pc-charts-wrap { display: block; }
.pc-share-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.pc-share-title {
  font-size: 16px;
  font-weight: 700;
  color: #e2e8f0;
}
.pc-share-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #052e16;
  background: #22c55e;
  border: 1px solid #22c55e;
  border-radius: 10px;
  cursor: pointer;
  transition: background .15s ease;
}
.pc-share-btn:hover:not(:disabled) { background: #16a34a; }
.pc-share-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pc-chart-note {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #94a3b8;
}
.pc-charts { display: block; }
.pc-charts-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 200px;
  color: var(--pc-sub, #94a3b8);
  font-size: 14px;
}
.pc-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(34, 197, 94, 0.25);
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: pc-spin 0.7s linear infinite;
}
@keyframes pc-spin { to { transform: rotate(360deg); } }

.pc-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.pc-chart-card {
  padding: 18px 18px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(10px);
}
.pc-chart-gauge { grid-column: 1 / -1; }
.pc-chart-head { margin-bottom: 6px; }
.pc-chart-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
}
.pc-chart-cap { margin: 4px 0 0; font-size: 12px; color: #94a3b8; }
.pc-chart-cap strong { color: #22c55e; font-weight: 700; }
.pc-chart { width: 100%; height: 300px; }
.pc-chart-gauge-el { height: 240px; }
.pc-chart-tall { height: 520px; }

@media (max-width: 760px) {
  .pc-chart-grid { grid-template-columns: 1fr; }
  .pc-chart-tall { height: 460px; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-spinner { animation: none; }
}
</style>
