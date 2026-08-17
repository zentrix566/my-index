<template>
  <div class="subway">
    <header class="head">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>北京地铁 · 站站距离</h1>
      <p class="desc">
        覆盖北京目前运营的全部 {{ lines.length }} 条线路、{{ stationCount }} 座车站。
        距离按经纬度实时计算（站间直线距离，可作为道路距离的良好近似），纯本地运行，无需联网。
      </p>
    </header>

    <div class="tabs">
      <button :class="{ active: mode === 'plan' }" @click="mode = 'plan'">站站规划</button>
      <button :class="{ active: mode === 'browse' }" @click="mode = 'browse'">线路浏览</button>
    </div>

    <!-- 站站规划 -->
    <section v-if="mode === 'plan'" class="panel">
    <div class="inputs">
      <div class="field">
        <label>出发站</label>
        <StationAutocomplete v-model="start" :stations="stationNames" placeholder="如 蓟门桥" />
      </div>
      <button class="swap" title="交换起终点" @click="swap">⇄</button>
      <div class="field">
        <label>到达站</label>
        <StationAutocomplete v-model="end" :stations="stationNames" placeholder="如 天安门东" />
      </div>
    </div>

    <div class="manual">
      <label class="manual-toggle">
        <input type="checkbox" v-model="manualMode" @change="buildPlan" />
        手动指定线路顺序（按你实际换乘的线路走）
      </label>
      <template v-if="manualMode">
        <input
          v-model="lineSeqText"
          class="line-seq"
          placeholder="如 17,3,2（依次乘坐的线路，逗号分隔）"
          @input="buildPlan"
        />
        <p class="hint">线路之间需有换乘站；起点须在首条线上、终点在末条线上。系统会在该顺序下自动挑选最优换乘站。</p>
      </template>
    </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div v-else-if="plan" class="result">
        <div class="summary">
          <div class="sum-item">
            <span class="num">{{ plan.totalKm }}</span><span class="unit">公里</span>
            <div class="cap">总距离（直线近似）</div>
          </div>
          <div class="sum-item">
            <span class="num">{{ plan.transfers }}</span><span class="unit">次</span>
            <div class="cap">换乘次数</div>
          </div>
          <div class="sum-item">
            <span class="num">{{ plan.segs.length }}</span><span class="unit">段</span>
            <div class="cap">乘车区段</div>
          </div>
        </div>

      <div class="route-mode" :class="plan.mode">
        <template v-if="plan.mode === 'manual'">手动路线 · 按指定 {{ plan.seqNames.join(' → ') }}</template>
        <template v-else>智能最短距离路线</template>
      </div>

      <div class="lines-used">
          <span class="lbl">途经线路：</span>
          <span
            v-for="(ln, i) in plan.linesUsed"
            :key="i"
            class="line-chip"
            :style="{ background: lineColor(ln) }"
            >{{ ln }}</span
          >
        </div>

        <ol class="steps">
          <template v-for="(seg, i) in plan.segs" :key="i">
            <li class="step">
              <span class="line-badge" :style="{ background: lineColor(lines[seg.line].name) }">
                {{ lines[seg.line].name }}
              </span>
              <div class="step-body">
                <div class="step-route">
                  <strong>{{ seg.from }}</strong>
                  <span class="arrow">→</span>
                  <strong>{{ seg.to }}</strong>
                </div>
                <div class="step-meta" @click="toggleHops(i)">
                  乘 {{ seg.stations.length - 1 }} 站 ·
                  {{ fmt(seg.dist) }}
                  <span class="toggle">{{ expandedSegs.has(i) ? '收起' : '展开每站' }}</span>
                </div>
                <ul v-if="expandedSegs.has(i) && seg.hops.length" class="hop-list">
                  <li v-for="(h, hi) in seg.hops" :key="hi" class="hop">
                    <span class="hop-dot" :style="{ background: lineColor(lines[seg.line].name) }"></span>
                    <span class="hop-name">{{ h.from }} → {{ h.to }}</span>
                    <span class="hop-dist">{{ fmt(h.dist) }}</span>
                  </li>
                </ul>
              </div>
            </li>
            <li v-if="i < plan.segs.length - 1" class="transfer">
              ↳ 在 <strong>{{ seg.to }}</strong> 站换乘
            </li>
          </template>
        </ol>
      </div>
    </section>

    <!-- 线路浏览 -->
    <section v-else class="panel">
      <div class="line-pick">
        <label>选择线路：</label>
        <select v-model.number="selectedLine">
          <option v-for="(l, i) in lines" :key="i" :value="i">
            {{ l.name }}<template v-if="l.loop">（环线）</template>
            · {{ l.stations.length }} 站
          </option>
        </select>
      </div>

      <div v-if="browse" class="browse-info">
        <span class="line-chip" :style="{ background: lineColor(browse.name) }">{{ browse.name }}</span>
        <span class="muted">共 {{ browse.rows.length }} 段 · 全线约 {{ fmt(browse.total) }}</span>
      </div>

      <table class="seg-table" v-if="browse">
        <thead>
          <tr><th>#</th><th>上行站</th><th>下行站</th><th>本段距离</th><th>累计距离</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in browse.rows" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ r.from }}</td>
            <td>{{ r.to }}<span v-if="r.loop" class="loop-tag"> ↺回到起点</span></td>
            <td>{{ fmt(r.dist) }}</td>
            <td>{{ fmt(r.cum) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import subwayData from '../data/subwayData.json'
import StationAutocomplete from './StationAutocomplete.vue'

const lines = subwayData.lines

// 工具：haversine 直线距离（米）
function hav(a, b) {
  const R = 6371008.8
  const r = (x) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat)
  const dLon = r(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

// 预建索引：站名+线路 -> 坐标；站名 -> 所在线路列表；邻接表
const SEP = ' '
const coordMap = {} // `${name}|${li}` -> {lng,lat}
const byName = {} // name -> [li,...]
const adj = {} // nodeId -> [{to, w}]
lines.forEach((l, li) => {
  l.stations.forEach((s) => {
    coordMap[`${s.n}|${li}`] = { lng: s.lng, lat: s.lat }
    ;(byName[s.n] || (byName[s.n] = [])).push(li)
  })
  const sts = l.stations
  const n = sts.length
  const segCount = l.loop ? n : n - 1
  for (let i = 0; i < segCount; i++) {
    const a = sts[i]
    const b = sts[(i + 1) % n]
    const na = `${a.n}${SEP}${li}`
    const nb = `${b.n}${SEP}${li}`
    const w = hav(a, b)
    ;(adj[na] || (adj[na] = [])).push({ to: nb, w })
    ;(adj[nb] || (adj[nb] = [])).push({ to: na, w })
  }
})
// 换乘边：同名异线车站之间距离记为 0
Object.entries(byName).forEach(([name, lis]) => {
  for (let i = 0; i < lis.length; i++) {
    for (let j = i + 1; j < lis.length; j++) {
      const a = `${name}${SEP}${lis[i]}`
      const b = `${name}${SEP}${lis[j]}`
      ;(adj[a] || (adj[a] = [])).push({ to: b, w: 0 })
      ;(adj[b] || (adj[b] = [])).push({ to: a, w: 0 })
    }
  }
})

// 线路名 -> 索引
const lineIndexByName = {}
lines.forEach((l, i) => {
  lineIndexByName[l.name] = i
})

// 按线路号或名称解析线路索引
function resolveLine(key) {
  const k = String(key).replace(/[^\d]/g, '')
  if (k) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].name.match(/\d+/)
      if (m && m[0] === k) return i
    }
    return -1
  }
  const idx = lineIndexByName[key]
  return idx === undefined ? -1 : idx
}

// 两条线路之间的换乘站（站名列表）
function sharedStations(li, lj) {
  const a = lines[li].stations.map((s) => s.n)
  const b = lines[lj].stations.map((s) => s.n)
  return a.filter((n) => b.includes(n))
}

// 同一线路上两站间的顺序路径与直线距离（环线取较短方向）
function onLineDist(li, nameA, nameB) {
  if (nameA === nameB) return { dist: 0, path: [nameA] }
  const sts = lines[li].stations
  const n = sts.length
  const ia = sts.findIndex((s) => s.n === nameA)
  const ib = sts.findIndex((s) => s.n === nameB)
  if (!lines[li].loop) {
    const lo = Math.min(ia, ib)
    const hi = Math.max(ia, ib)
    let d = 0
    const p = []
    for (let x = lo; x <= hi; x++) {
      p.push(sts[x].n)
      if (x > lo) d += hav(sts[x - 1], sts[x])
    }
    return { dist: d, path: p }
  }
  const fwd = []
  let fd = 0
  let k = ia
  while (k !== ib) {
    fwd.push(sts[k].n)
    const nk = (k + 1) % n
    fd += hav(sts[k], sts[nk])
    k = nk
    if (fwd.length > n) break
  }
  fwd.push(sts[ib].n)
  const bwd = []
  let bd = 0
  k = ia
  while (k !== ib) {
    bwd.push(sts[k].n)
    const nk = (k - 1 + n) % n
    bd += hav(sts[k], sts[nk])
    k = nk
    if (bwd.length > n) break
  }
  bwd.push(sts[ib].n)
  return fd <= bd ? { dist: fd, path: fwd } : { dist: bd, path: bwd }
}

// 按指定线路顺序规划：在每条相邻线路间用 DP 选最优换乘站
function planByLines(s, e, text) {
  const parts = text
    .split(/[,，、\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (!parts.length) return { ok: false, msg: '请填写线路顺序，例如 17,3,2' }
  const seq = []
  const seqNames = []
  for (const p of parts) {
    const idx = resolveLine(p)
    if (idx < 0) return { ok: false, msg: `未找到线路「${p}」，请检查输入（可用线路号或名称）` }
    seq.push(idx)
    seqNames.push(lines[idx].name)
  }
  if (!lines[seq[0]].stations.some((st) => st.n === s))
    return { ok: false, msg: `出发站「${s}」不在首条线路 ${seqNames[0]} 上` }
  if (!lines[seq[seq.length - 1]].stations.some((st) => st.n === e))
    return { ok: false, msg: `到达站「${e}」不在末条线路 ${seqNames[seq.length - 1]} 上` }

  // 单条线路直达
  if (seq.length === 1) {
    const r = onLineDist(seq[0], s, e)
    const nodes = r.path.map((nm) => ({ name: nm, li: seq[0] }))
    return { ok: true, nodes, seqNames }
  }

  const k = seq.length - 1
  let dp = {}
  const shared0 = sharedStations(seq[0], seq[1])
  if (!shared0.length) return { ok: false, msg: `线路 ${seqNames[0]} 与 ${seqNames[1]} 之间无换乘站` }
  for (const t of shared0) {
    dp[t] = { cost: onLineDist(seq[0], s, t).dist, prev: null }
  }
  const back = [dp]
  for (let i = 1; i <= k - 1; i++) {
    const li = seq[i]
    const shared = sharedStations(seq[i], seq[i + 1])
    if (!shared.length) return { ok: false, msg: `线路 ${seqNames[i]} 与 ${seqNames[i + 1]} 之间无换乘站` }
    const ndp = {}
    for (const cur of shared) {
      let best = Infinity
      let bestPrev = null
      for (const prevT in dp) {
        const c = dp[prevT].cost + onLineDist(li, prevT, cur).dist
        if (c < best) {
          best = c
          bestPrev = prevT
        }
      }
      if (best < Infinity) ndp[cur] = { cost: best, prev: bestPrev }
    }
    if (!Object.keys(ndp).length) return { ok: false, msg: `线路 ${seqNames[i]} 无法在指定顺序下连通` }
    back.push(ndp)
    dp = ndp
  }
  let bestEnd = Infinity
  let bestT = null
  for (const t in dp) {
    const c = dp[t].cost + onLineDist(seq[k], t, e).dist
    if (c < bestEnd) {
      bestEnd = c
      bestT = t
    }
  }
  if (bestT === null) return { ok: false, msg: '无法按该线路顺序到达终点' }
  const transfers = []
  let cur = bestT
  for (let i = k - 1; i >= 0; i--) {
    transfers[i] = cur
    cur = back[i][cur].prev
  }
  const nodes = []
  const pushPath = (li, a, b) => {
    for (const nm of onLineDist(li, a, b).path) nodes.push({ name: nm, li })
  }
  pushPath(seq[0], s, transfers[0])
  for (let i = 1; i <= k - 1; i++) pushPath(seq[i], transfers[i - 1], transfers[i])
  pushPath(seq[k], transfers[k - 1], e)
  return { ok: true, nodes, seqNames }
}

function decode(node) {
  const i = node.lastIndexOf(SEP)
  return { name: node.slice(0, i), li: +node.slice(i + 1) }
}

// Dijkstra：返回最短道路距离（直线近似）路径
function dijkstra(startName, endName) {
  if (!(startName in byName) || !(endName in byName)) return null
  const startNodes = byName[startName].map((li) => `${startName}${SEP}${li}`)
  const endSet = new Set(byName[endName].map((li) => `${endName}${SEP}${li}`))
  const dist = {}
  const prev = {}
  const visited = new Set()
  startNodes.forEach((n) => (dist[n] = 0))
  while (true) {
    let u = null
    let best = Infinity
    for (const node in dist) {
      if (!visited.has(node) && dist[node] < best) {
        best = dist[node]
        u = node
      }
    }
    if (u === null) break
    if (endSet.has(u)) {
      const path = []
      let cur = u
      while (cur !== undefined) {
        path.unshift(cur)
        cur = prev[cur]
      }
      return { path, total: dist[u] }
    }
    visited.add(u)
    for (const e of adj[u] || []) {
      const nd = dist[u] + e.w
      if (nd < (dist[e.to] ?? Infinity)) {
        dist[e.to] = nd
        prev[e.to] = u
      }
    }
  }
  return null
}

const stationNames = Object.keys(byName).sort((a, b) => a.localeCompare(b, 'zh'))
const stationCount = stationNames.length

const start = ref('蓟门桥')
const end = ref('天安门东')
const mode = ref('plan')
const selectedLine = ref(0)
const plan = ref(null)
const error = ref('')
const expandedSegs = ref(new Set())
const manualMode = ref(false)
const lineSeqText = ref('')

function buildSegs(D) {
  const segs = []
  let i = 0
  while (i < D.length) {
    const li = D[i].li
    const seg = { line: li, from: D[i].name, to: D[i].name, dist: 0, stations: [D[i].name], hops: [] }
    while (i + 1 < D.length && D[i + 1].li === li) {
      i++
      const a = coordMap[`${D[i - 1].name}|${li}`]
      const b = coordMap[`${D[i].name}|${li}`]
      const d = hav(a, b)
      seg.dist += d
      seg.to = D[i].name
      seg.stations.push(D[i].name)
      seg.hops.push({ from: D[i - 1].name, to: D[i].name, dist: d })
    }
    i++
    segs.push(seg)
  }
  return segs
}

function buildPlan() {
  error.value = ''
  const s = start.value.trim()
  const e = end.value.trim()
  if (!s || !e) {
    plan.value = null
    return
  }
  if (!(s in byName)) {
    error.value = `未找到出发站「${s}」，请从下拉列表中选择。`
    plan.value = null
    return
  }
  if (!(e in byName)) {
    error.value = `未找到到达站「${e}」，请从下拉列表中选择。`
    plan.value = null
    return
  }
  if (s === e) {
    plan.value = { mode: 'auto', totalKm: '0.00', transfers: 0, segs: [], linesUsed: [], single: true, name: s }
    return
  }

  let nodes
  let routeMode = 'auto'
  let seqNames = null
  if (manualMode.value && lineSeqText.value.trim()) {
    const r = planByLines(s, e, lineSeqText.value.trim())
    if (!r.ok) {
      error.value = r.msg
      plan.value = null
      return
    }
    nodes = r.nodes
    routeMode = 'manual'
    seqNames = r.seqNames
  } else {
    const res = dijkstra(s, e)
    if (!res) {
      error.value = '两站之间暂时无法连通（数据可能缺失）。'
      plan.value = null
      return
    }
    nodes = res.path.map(decode)
  }

  const segs = buildSegs(nodes)
  const total = segs.reduce((s2, g) => s2 + g.dist, 0)
  const linesUsed = [...new Set(segs.map((g) => lines[g.line].name))]
  plan.value = {
    mode: routeMode,
    seqNames,
    totalKm: (total / 1000).toFixed(2),
    transfers: Math.max(0, segs.length - 1),
    segs,
    linesUsed,
  }
  // 默认展开每一段，让每站距离直接可见
  expandedSegs.value = new Set(plan.value.segs.map((_, idx) => idx))
}

function swap() {
  const t = start.value
  start.value = end.value
  end.value = t
  if (manualMode.value && lineSeqText.value.trim()) {
    const m = lineSeqText.value.match(/[,，、\s]+/)
    const sep = m ? m[0] : ','
    const parts = lineSeqText.value
      .split(/[,，、\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
    lineSeqText.value = parts.reverse().join(sep)
  }
  buildPlan()
}
function recompute() {
  buildPlan()
}
function toggleHops(idx) {
  const next = new Set(expandedSegs.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedSegs.value = next
}
// 线路切换时自动重算（规划模式用）
watch([start, end], buildPlan)
buildPlan()

const browse = computed(() => {
  const line = lines[selectedLine.value]
  if (!line) return null
  const sts = line.stations
  const n = sts.length
  const segCount = line.loop ? n : n - 1
  const rows = []
  let cum = 0
  for (let i = 0; i < segCount; i++) {
    const a = sts[i]
    const b = sts[(i + 1) % n]
    const d = hav(a, b)
    cum += d
    rows.push({ from: a.n, to: b.n, dist: d, cum, loop: line.loop && i === segCount - 1 })
  }
  return { name: line.name, loop: line.loop, total: cum, rows }
})

// 线路配色
const PALETTE = [
  '#a52a2a', '#c23a30', '#e6731c', '#f0a020', '#caa61b', '#7cae3f', '#2f9e44',
  '#1b9e8f', '#0e8fab', '#2f6fed', '#3b5bdb', '#5f3dc4', '#8e44ad', '#c0398b',
  '#d6336c', '#b08968', '#5c6b73', '#37474f', '#00796b', '#6a1b9a', '#ad1457',
  '#00695c', '#4527a0', '#283593', '#0277bd', '#00838f', '#558b2f',
]
function lineColor(name) {
  const idx = lines.findIndex((l) => l.name === name)
  return PALETTE[idx % PALETTE.length]
}

function fmt(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + ' 公里'
  return Math.round(m) + ' 米'
}
</script>

<style scoped>
.subway {
  /* 复用 my-vue-project 的蓝白清新主题，避免被 my-index 全局主题覆盖 */
  --color-bg: #f5f7fa;
  --color-text: #1f2430;
  --color-muted: #6b7280;
  --color-primary: #2f6fed;
  --color-card: #ffffff;
  --color-border: #e5e7eb;
  --color-danger: #d4452f;
  --radius: 12px;
  --shadow-card: 0 6px 20px rgba(0, 0, 0, 0.08);
  background: var(--color-bg);
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}
.head h1 {
  margin: 8px 0 4px;
  font-size: 26px;
}
.back {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 14px;
}
.desc {
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 20px;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.tabs button {
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-muted);
  padding: 8px 18px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
}
.tabs button.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}
.panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 22px;
}
.inputs {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.field {
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 13px;
  color: var(--color-muted);
}
.field input {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 15px;
  background: var(--color-bg);
  color: var(--color-text);
}
.swap {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: var(--radius);
  width: 42px;
  height: 42px;
  cursor: pointer;
  font-size: 18px;
  color: var(--color-primary);
}
.error {
  color: var(--color-danger);
  font-size: 14px;
  margin-top: 16px;
}
.summary {
  display: flex;
  gap: 28px;
  margin: 22px 0 14px;
  flex-wrap: wrap;
}
.sum-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.sum-item .num {
  font-size: 30px;
  font-weight: 700;
  color: var(--color-primary);
}
.sum-item .unit {
  font-size: 14px;
  color: var(--color-muted);
}
.sum-item .cap {
  width: 100%;
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}
.sum-item {
  flex-direction: row;
  flex-wrap: wrap;
  min-width: 120px;
}
.lines-used {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.lines-used .lbl {
  font-size: 13px;
  color: var(--color-muted);
}
.line-chip {
  color: #fff;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
}
.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px dashed var(--color-border);
}
.line-badge {
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.step-body {
  flex: 1;
}
.step-route {
  font-size: 15px;
}
.step-route .arrow {
  color: var(--color-muted);
  margin: 0 8px;
}
.step-meta {
  font-size: 13px;
  color: var(--color-muted);
  margin-top: 2px;
  cursor: pointer;
  user-select: none;
}
.step-meta .toggle {
  margin-left: 8px;
  color: var(--color-primary);
  font-size: 12px;
}
.hop-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}
.hop {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dotted var(--color-border);
  font-size: 13px;
}
.hop:last-child {
  border-bottom: none;
}
.hop-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.hop-name {
  flex: 1;
  color: var(--color-text);
}
.hop-dist {
  color: var(--color-muted);
  white-space: nowrap;
}
.transfer {
  list-style: none;
  font-size: 13px;
  color: var(--color-danger);
  padding: 4px 0 4px 54px;
}
.line-pick {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.line-pick label {
  font-size: 14px;
  color: var(--color-muted);
}
.line-pick select {
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  background: var(--color-bg);
  color: var(--color-text);
  min-width: 260px;
}
.browse-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.muted {
  font-size: 13px;
  color: var(--color-muted);
}
.seg-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.seg-table th,
.seg-table td {
  text-align: left;
  padding: 9px 10px;
  border-bottom: 1px solid var(--color-border);
}
.seg-table th {
  color: var(--color-muted);
  font-weight: 600;
  font-size: 13px;
}
.loop-tag {
  color: var(--color-danger);
  font-size: 12px;
}
.manual {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
}
.manual-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
}
.manual-toggle input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}
.line-seq {
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 14px;
  background: var(--color-card);
  color: var(--color-text);
}
.line-seq:focus {
  outline: none;
  border-color: var(--color-primary);
}
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.6;
}
.route-mode {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 14px;
}
.route-mode.auto {
  background: var(--color-bg);
  color: var(--color-muted);
  border: 1px solid var(--color-border);
}
.route-mode.manual {
  background: var(--color-primary);
  color: #fff;
}
</style>
