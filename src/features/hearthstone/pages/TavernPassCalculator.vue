<template>
  <section class="section page-section hs-xp" :data-hs-theme="hsTheme">
    <div class="container hs-xp-wrap">
      <header class="hs-xp-head">
        <div>
          <p class="eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Hearthstone Tracker</p>
          <h1>战令经验计算器</h1>
          <p class="hs-xp-sub">
            根据每日任务、对战时长与各模式经验收益，测算赛季结束可达到的通行证等级；
            也可反向推算：给定目标等级，直接算出在赛季结束前达成所需的每日游戏时长。
          </p>
        </div>
        <div class="hs-xp-head-actions">
          <button type="button" class="hs-btn hs-btn-ghost" @click="router.push('/hearthstone')">
            ← 返回成就查看器
          </button>
          <button
            type="button"
            class="hs-btn hs-btn-ghost hs-theme-toggle"
            :aria-label="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
            @click="toggleTheme"
          >
            <svg v-if="hsTheme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
            </svg>
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
            {{ hsTheme === 'dark' ? '明亮' : '暗色' }}
          </button>
        </div>
      </header>

      <!-- 模式切换 -->
      <div class="hs-xp-mode" role="tablist" aria-label="计算模式">
        <button type="button" role="tab" :class="{ active: mode === 'auto' }" :aria-selected="mode === 'auto'" @click="mode = 'auto'">自动模式</button>
        <button type="button" role="tab" :class="{ active: mode === 'manual' }" :aria-selected="mode === 'manual'" @click="mode = 'manual'">手动模式</button>
      </div>

      <div class="hs-xp-grid">
        <!-- 左：输入 -->
        <div class="hs-xp-card">
          <h2>输入参数</h2>

          <div class="hs-xp-field">
            <label>赛季时间</label>
            <div class="hs-xp-season">
              <span class="hs-xp-season-range">{{ SEASON_START }} – {{ SEASON_END }}</span>
              <span class="hs-xp-season-fixed">结束日期固定（所有人一致）</span>
            </div>
          </div>

          <!-- 自动模式 -->
          <template v-if="mode === 'auto'">
            <div class="hs-xp-note">
              <b>经验计算方式（按无加成基础值）：</b>每日任务 <b>1000</b> / 每周任务 <b>6000</b>（= 3000 + 2100×2）/ 每小时对战 <b>350</b>。
              日均经验 =（每日任务经验 + 每小时对战经验 × 每日游戏时长）×（1 + 战令加成）；每周任务经验 ×（1 + 加成）每 7 天结算一次；将每日/每周收益累计到赛季结束，对照奖励轨道得可达等级。
              <br />战令加成按<b>当前通行证等级</b>自动换算（1 级 +10% / 20 级 +15% / 70 级 +20%），切换「当前等级」时每小时经验会随之变化；也可在下方手动覆盖。
            </div>
            <div class="hs-xp-field">
              <label for="xp-auto-boost">战令加成<span class="hs-xp-auto-tag">（自动随等级）</span></label>
              <select id="xp-auto-boost" v-model.number="autoBoost">
                <option :value="0">无加成</option>
                <option :value="0.1">通行证 +10%</option>
                <option :value="0.15">通行证 +15%</option>
                <option :value="0.2">通行证 +20%</option>
              </select>
            </div>
            <div class="hs-xp-field">
              <label for="xp-auto-hours">每日游戏时长（小时）</label>
              <input id="xp-auto-hours" type="number" min="0" step="0.5" v-model.number="autoHours" />
            </div>
            <div class="hs-xp-field-row">
              <div class="hs-xp-field">
                <label for="xp-cur-level">当前等级</label>
                <input id="xp-cur-level" type="number" min="1" :max="MAX_LEVEL" v-model.number="currentLevel" />
              </div>
              <div class="hs-xp-field">
                <label for="xp-cur-xp">本级已累计经验</label>
                <input id="xp-cur-xp" type="number" min="0" v-model.number="currentPartialXp" />
              </div>
            </div>
            <div class="hs-xp-preset">
              <span>每日 {{ showDaily }}</span>
              <span>每周 {{ showWeekly }}</span>
              <span>每小时 {{ showHourly }}</span>
              <span class="boost">{{ Math.round(autoBoost * 100) }}% 加成</span>
            </div>
          </template>

          <!-- 手动模式 -->
          <template v-else>
            <div class="hs-xp-note">
              <b>计算方式（按无加成基础值）：</b>每日任务 <b>1000</b> / 每周任务 <b>6000</b>（= 3000 + 2100×2）；任务与对战经验统一 ×（1 + 战令加成），下方「每日任务 / 每周任务」数值已随加成实时变化。
              各模式每小时经验 = 60 ×（胜率 × 胜每分钟经验 +（1 − 胜率）× 负每分钟经验）；每日对战经验 = Σ（模式时长 × 该模式每小时经验）；累计到赛季结束对照奖励轨道得可达等级。
            </div>
            <div class="hs-xp-field">
              <label for="xp-mboost">战令加成</label>
              <select id="xp-mboost" v-model.number="manualBoost">
                <option :value="0">无加成</option>
                <option :value="0.1">通行证 +10%</option>
                <option :value="0.15">通行证 +15%</option>
                <option :value="0.2">通行证 +20%</option>
              </select>
            </div>
            <div class="hs-xp-fixed">
              <span>每日任务 {{ Math.round(FIXED_DAILY * (1 + manualBoost)) }}</span>
              <span>每周任务 {{ Math.round(FIXED_WEEKLY * (1 + manualBoost)) }}</span>
            </div>
            <div class="hs-xp-field-row">
              <div class="hs-xp-field">
                <label for="xp-cur-level">当前等级</label>
                <input id="xp-cur-level" type="number" min="1" :max="MAX_LEVEL" v-model.number="currentLevel" />
              </div>
              <div class="hs-xp-field">
                <label for="xp-cur-xp">本级已累计经验</label>
                <input id="xp-cur-xp" type="number" min="0" v-model.number="currentPartialXp" />
              </div>
            </div>

            <div class="hs-xp-modes">
              <div class="hs-xp-mode-block" v-for="(m, i) in modes" :key="m.key">
                <h3>{{ m.name }}</h3>
                <div class="hs-xp-field-row">
                  <div class="hs-xp-field">
                    <label :for="`xp-h-${i}`">时长（小时/天）</label>
                    <input :id="`xp-h-${i}`" type="number" min="0" step="0.5" v-model.number="m.hoursPerDay" />
                  </div>
                  <div class="hs-xp-field">
                    <label :for="`xp-wr-${i}`">胜率（%）</label>
                    <input :id="`xp-wr-${i}`" type="number" min="0" max="100" v-model.number="m.winRate" />
                  </div>
                </div>
                <div class="hs-xp-field-row">
                  <div class="hs-xp-field">
                    <label :for="`xp-win-${i}`">胜·每分钟经验</label>
                    <input :id="`xp-win-${i}`" type="number" min="0" :value="boostedWinPerMin(m)" disabled />
                  </div>
                  <div class="hs-xp-field">
                    <label :for="`xp-lose-${i}`">负·每分钟经验</label>
                    <input :id="`xp-lose-${i}`" type="number" min="0" :value="boostedLossPerMin(m)" disabled />
                  </div>
                </div>
                <div class="hs-xp-mode-xp">
                  每小时 ≈ <b>{{ Math.round(modeHourlyXp(m) * (1 + manualBoost)) }}</b> 经验
                </div>
              </div>
            </div>

            <div class="hs-xp-note">
              每日对战总经验 ≈ <b>{{ Math.round(totalDailyPlayXp(modes) * (1 + manualBoost)) }}</b> · 每日总时长 <b>{{ totalManualHours }}</b> 小时 · 加权每小时 ≈ <b>{{ Math.round(manualPlayXpPerHour * (1 + manualBoost)) }}</b>            </div>
          </template>
        </div>

        <!-- 右：结果 -->
        <div class="hs-xp-card">
          <h2>正向：赛季结束可达等级</h2>
          <div class="hs-xp-level">{{ forward.level }}<span> / {{ MAX_LEVEL }}</span></div>
          <div class="hs-xp-level-sub">
            还差 {{ MAX_LEVEL - forward.level }} 级 · 累计 {{ formatXp(forward.totalXp) }} XP · 距赛季结束 {{ forward.days }} 天
          </div>
          <div class="hs-xp-perday">
            日均 <b>{{ formatXp(forward.perDay) }}</b> XP/天
            <span class="hs-xp-perday-detail">（每日任务 {{ showDaily }} + 对战 {{ showHourly }} × {{ hoursShown }}h）</span>
          </div>
          <div class="hs-xp-breakdown">
            <div><span>每日任务累计（全赛季）</span><b>{{ formatXp(forward.dailyTotal) }}</b></div>
            <div><span>每周任务累计（全赛季）</span><b>{{ formatXp(forward.weeklyTotal) }}</b></div>
            <div><span>本赛季将获得</span><b>{{ formatXp(forward.gainedXp) }}</b></div>
          </div>

          <h2 class="hs-xp-h2">反向：规划肝度 / 核对进度</h2>
          <p class="hs-xp-rev-desc">
            给定一个目标等级，反推在赛季结束（<b>{{ SEASON_END }}</b>）前达成所需的<b>每日游戏时长</b>。
          </p>
          <div class="hs-xp-field">
            <label for="xp-target">目标等级</label>
            <input id="xp-target" type="number" min="1" :max="MAX_LEVEL" v-model.number="targetLevel" />
          </div>
          <div v-if="reverse.valid" class="hs-xp-reverse">
            <div class="hs-xp-reverse-main">
              达到 <b>{{ reverse.target }}</b> 级 → 需每日游戏约 <b>{{ formatHours(reverse.hoursNeeded) }}</b> 小时
            </div>
            <div v-if="!reverse.alreadyMet && !reverse.impossible" class="hs-xp-rev-detail">
              剩余 <b>{{ reverse.days }}</b> 天；任务/周常约贡献 <b>{{ formatXp(reverse.questDailyAvg) }}</b> / 天，
              对战需再贡献 <b>{{ formatXp(reverse.needPlayDaily) }}</b> / 天（≈ {{ formatHours(reverse.hoursNeeded) }} 小时）。
            </div>
            <div v-if="reverse.alreadyMet" class="hs-xp-ok">
              ✓ 当前每日任务 + 周常已能在赛季结束前达到该等级，无需额外对战时间。
            </div>
            <div v-else-if="reverse.impossible" class="hs-xp-warn">
              ✕ 无法计算对战时长（请在各模式里设置每日游戏时长，让每小时经验 > 0）。
            </div>
          </div>
          <div v-else class="hs-xp-warn">目标等级超出 1–{{ MAX_LEVEL }} 的范围，请调整。</div>

          <h2 class="hs-xp-h2">进度曲线</h2>
          <svg class="hs-xp-chart" :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="xMidYMid meet" role="img" aria-label="累计经验曲线">
            <!-- 横向网格 + Y 轴标签 -->
            <g class="hs-xp-grid">
              <template v-for="(g, i) in gridY" :key="'g' + i">
                <line :x1="pad.l" :y1="g.y" :x2="chartW - pad.r" :y2="g.y" />
                <text :x="pad.l - 8" :y="g.y + 4" text-anchor="end">{{ g.label }}</text>
              </template>
            </g>
            <!-- 曲线 -->
            <polyline class="hs-xp-curve" :points="curvePath" />
            <!-- 目标等级标记 -->
            <line class="hs-xp-target-line" :x1="tgtX" :y1="pad.t" :x2="tgtX" :y2="chartH - pad.b" />
            <circle class="hs-xp-target-dot" :cx="tgtX" :cy="tgtY" r="5" />
            <text class="hs-xp-target-text" :x="tgtX" :y="pad.t - 2" text-anchor="middle">目标 {{ reverse.target }}</text>
            <!-- 当前可达等级标记 -->
            <line class="hs-xp-proj-line" :x1="projX" :y1="pad.t" :x2="projX" :y2="chartH - pad.b" />
            <circle class="hs-xp-proj-dot" :cx="projX" :cy="projY" r="5" />
            <text class="hs-xp-proj-text" :x="projX" :y="chartH - pad.b + 18" text-anchor="middle">可达 {{ forward.level }}</text>
            <!-- X 轴标签 -->
            <text :x="pad.l" :y="chartH - 6" text-anchor="start">等级 1</text>
            <text :x="chartW - pad.r" :y="chartH - 6" text-anchor="end">等级 {{ MAX_LEVEL }}</text>
          </svg>
        </div>
      </div>

      <p class="hs-xp-foot">
        曲线依据暴雪官方奖励轨道：131–400 级每级 1500 XP，满级 400 级总经验 602,200。
        每周经验按每 7 天结算一次估算，结果用于规划参考，实际以游戏内为准。
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  cumulativeXpForLevel,
  MAX_LEVEL,
  TOTAL_XP_MAX_LEVEL,
  SEASON_START,
  SEASON_END,
  PLAY_MODES,
  BOOST_TIERS
} from '../data/rewardsTrack.js'
import {
  projectToSeasonEnd,
  modeHourlyXp,
  totalDailyPlayXp,
  blendedPlayXpPerHour,
  requiredHoursPerDay
} from '../utils/xpCalculator.js'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'

const router = useRouter()
const { hsTheme, toggleTheme } = useHearthstoneTheme()

// ===== 本地持久化（刷新不丢） =====
function persisted(key, initial) {
  let val
  try {
    const raw = localStorage.getItem('hs:xp:' + key)
    val = raw != null ? JSON.parse(raw) : initial
  } catch {
    val = initial
  }
  const r = ref(val)
  watch(r, (v) => {
    try { localStorage.setItem('hs:xp:' + key, JSON.stringify(v)) } catch { /* ignore */ }
  }, { deep: true })
  return r
}

// ===== 状态 =====
const mode = persisted('mode', 'auto')
const currentLevel = persisted('currentLevel', 1)
const currentPartialXp = persisted('currentPartialXp', 0)
const targetLevel = persisted('targetLevel', 200)

// 战令加成随当前通行证等级自动换算（官方机制）：1 级 +10% / 20 级 +15% / 70 级 +20%
function boostFromLevel(lvl) {
  let b = 0
  for (const t of BOOST_TIERS) if (lvl >= t.level) b = t.boost
  return b
}

// 自动模式：按无加成基础值（每日1000/每周6000/每小时350），再按档位乘 (1+加成)
const AUTO_BASE = { daily: 1000, weekly: 6000, hourly: 350 }
const autoBoost = persisted('autoBoost', boostFromLevel(Number(currentLevel.value) || 1))
const autoHours = persisted('autoHours', 2)

// 切换「当前等级」时自动同步战令加成（下拉仍可手动覆盖）
watch(currentLevel, (v) => { autoBoost.value = boostFromLevel(Number(v) || 1) })

// 手动模式：每日/每周任务基础值固定（1000/6000），仅战令加成 + 各模式时长/胜率可调；任务与对战经验统一乘 (1+加成)
const FIXED_DAILY = 1000
const FIXED_WEEKLY = 6000
const manualBoost = persisted('manualBoost', 0.2)
const modes = persisted('modes', PLAY_MODES.map((m) => ({
  key: m.key,
  name: m.name,
  hoursPerDay: m.key === 'ladder' ? 1.5 : 0.5,
  winRate: 50,
  winPerMin: m.winPerMin,
  lossPerMin: m.lossPerMin
})))

const manualPlayXpPerHour = computed(() => blendedPlayXpPerHour(modes.value))
const totalManualHours = computed(() =>
  modes.value.reduce((s, m) => s + (Number(m.hoursPerDay) || 0), 0)
)

// 手动模式：胜/负「每分经验」随战令加成实时变化（数值已乘 1+加成，切档位即变）
function boostedWinPerMin(m) {
  return Math.round((Number(m.winPerMin) || 0) * (1 + Number(manualBoost.value)) * 100) / 100
}
function boostedLossPerMin(m) {
  return Math.round((Number(m.lossPerMin) || 0) * (1 + Number(manualBoost.value)) * 100) / 100
}

// 当前生效的加成（自动/手动共用同一个下拉口径）
const effectiveBoost = computed(() =>
  mode.value === 'auto' ? (Number(autoBoost.value) || 0) : (Number(manualBoost.value) || 0)
)

// 展示用：当前档位下的「每日任务 / 每小时对战」实得值
const showDaily = computed(() => {
  const base = mode.value === 'auto' ? AUTO_BASE.daily : FIXED_DAILY
  return Math.round(base * (1 + effectiveBoost.value))
})
const showHourly = computed(() => {
  const base = mode.value === 'auto' ? AUTO_BASE.hourly : manualPlayXpPerHour.value
  return Math.round(base * (1 + effectiveBoost.value))
})
const showWeekly = computed(() => {
  const base = mode.value === 'auto' ? AUTO_BASE.weekly : FIXED_WEEKLY
  return Math.round(base * (1 + effectiveBoost.value))
})
const hoursShown = computed(() =>
  mode.value === 'auto' ? (Number(autoHours.value) || 0) : totalManualHours.value
)

// ===== 统一参数 =====
const params = computed(() => {
  if (mode.value === 'auto') {
    return {
      currentLevel: Number(currentLevel.value) || 1,
      currentPartialXp: Number(currentPartialXp.value) || 0,
      dailyQuestXp: AUTO_BASE.daily,
      weeklyQuestXp: AUTO_BASE.weekly,
      playXpPerHour: AUTO_BASE.hourly,
      boost: Number(autoBoost.value) || 0,
      hoursPerDay: Number(autoHours.value) || 0
    }
  }
  return {
    currentLevel: Number(currentLevel.value) || 1,
    currentPartialXp: Number(currentPartialXp.value) || 0,
    dailyQuestXp: FIXED_DAILY,
    weeklyQuestXp: FIXED_WEEKLY,
    playXpPerHour: manualPlayXpPerHour.value,
    boost: Number(manualBoost.value) || 0,
    hoursPerDay: totalManualHours.value
  }
})

const forward = computed(() => projectToSeasonEnd(params.value, SEASON_END, new Date()))
const reverse = computed(() => {
  const t = Number(targetLevel.value)
  const valid = t >= 1 && t <= MAX_LEVEL
  if (!valid) return { valid: false }
  const req = requiredHoursPerDay(params.value, t, SEASON_END, new Date())
  return { valid: true, ...req }
})

// ===== 格式化 =====
function formatXp(n) {
  return Math.round(n || 0).toLocaleString('en-US')
}
function formatHours(h) {
  const v = Math.round((Number(h) || 0) * 10) / 10
  return v + ' 小时'
}
function formatXpShort(n) {
  n = Math.round(n || 0)
  if (n >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

// ===== SVG 曲线 =====
const chartW = 680
const chartH = 300
const pad = { l: 54, r: 14, t: 16, b: 34 }
const plotW = chartW - pad.l - pad.r
const plotH = chartH - pad.t - pad.b

function xFor(level) {
  return pad.l + ((level - 1) / (MAX_LEVEL - 1)) * plotW
}
function yFor(xp) {
  return pad.t + plotH - (xp / TOTAL_XP_MAX_LEVEL) * plotH
}

const curvePath = computed(() => {
  const pts = []
  for (let l = 1; l <= MAX_LEVEL; l++) {
    pts.push(`${xFor(l).toFixed(1)},${yFor(cumulativeXpForLevel(l)).toFixed(1)}`)
  }
  return pts.join(' ')
})
const projX = computed(() => xFor(forward.value.level))
const projY = computed(() => yFor(forward.value.totalXp))
const safeTarget = computed(() =>
  Math.min(Math.max(Number(targetLevel.value) || 1, 1), MAX_LEVEL)
)
const tgtX = computed(() => xFor(cumulativeXpForLevel(safeTarget.value)))
const tgtY = computed(() => yFor(cumulativeXpForLevel(safeTarget.value)))
const gridY = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
  y: pad.t + plotH - p * plotH,
  label: formatXpShort(p * TOTAL_XP_MAX_LEVEL)
}))
</script>

<style scoped>
.hs-xp {
  --xp-green: #15803d;
  --xp-green-soft: rgba(21, 128, 61, 0.1);
  --xp-green-mid: rgba(21, 128, 61, 0.18);
  --xp-amber: #b45309;
  --xp-red: #dc2626;
  --xp-bg: #f7faf8;
  --xp-card: #ffffff;
  --xp-text: #1f2937;
  --xp-muted: #6b7280;
  --xp-border: rgba(21, 128, 61, 0.22);
  --xp-input-bg: #ffffff;
  padding: 32px 0 56px;
  min-height: 100vh;
  background: var(--xp-bg);
  color: var(--xp-text);
}
.hs-xp[data-hs-theme='dark'] {
  --xp-green: #4ade80;
  --xp-green-soft: rgba(74, 222, 128, 0.12);
  --xp-green-mid: rgba(74, 222, 128, 0.22);
  --xp-amber: #fbbf24;
  --xp-red: #f87171;
  --xp-bg: #11161a;
  --xp-card: #1a2128;
  --xp-text: #e5e7eb;
  --xp-muted: #9aa3ad;
  --xp-border: rgba(74, 222, 128, 0.3);
  --xp-input-bg: #232c34;
}
.hs-xp-wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }

.hs-xp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.hs-xp-head .eyebrow { display: inline-flex; align-items: center; gap: 6px; color: var(--xp-green); font-weight: 700; font-size: 13px; margin: 0 0 6px; }
.hs-live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--xp-green); box-shadow: 0 0 0 3px var(--xp-green-soft); }
.hs-xp-head h1 { font-size: 28px; margin: 0 0 6px; }
.hs-xp-sub { margin: 0; max-width: 560px; color: var(--xp-muted); line-height: 1.6; font-size: 14px; }
.hs-xp-head-actions { display: flex; gap: 8px; align-items: center; }

.hs-btn { font: inherit; border-radius: 8px; padding: 8px 14px; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
.hs-btn-ghost { background: var(--xp-green-soft); border-color: var(--xp-border); color: var(--xp-green); font-weight: 600; }
.hs-btn-ghost:hover { background: var(--xp-green-mid); }

.hs-xp-mode { display: inline-flex; gap: 4px; margin: 22px 0 18px; padding: 4px; background: var(--xp-green-soft); border-radius: 10px; }
.hs-xp-mode button { font: inherit; border: 0; background: transparent; color: var(--xp-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.hs-xp-mode button.active { background: var(--xp-card); color: var(--xp-green); box-shadow: 0 1px 3px rgba(0,0,0,.12); }

.hs-xp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 880px) { .hs-xp-grid { grid-template-columns: 1fr; } }

.hs-xp-card { background: var(--xp-card); border: 1px solid var(--xp-border); border-radius: 14px; padding: 20px; }
.hs-xp-card h2 { font-size: 16px; margin: 0 0 14px; }
.hs-xp-h2 { margin-top: 26px !important; }

.hs-xp-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.hs-xp-field-row { display: flex; gap: 14px; }
.hs-xp-field-row .hs-xp-field { flex: 1; }
.hs-xp-field label { font-size: 13px; color: var(--xp-muted); font-weight: 600; }
.hs-xp-field input, .hs-xp-field select {
  font: inherit; padding: 9px 11px; border: 1px solid var(--xp-border); border-radius: 8px;
  background: var(--xp-input-bg); color: var(--xp-text); width: 100%; box-sizing: border-box;
}
.hs-xp-field input:focus, .hs-xp-field select:focus { outline: 2px solid var(--xp-green-mid); border-color: var(--xp-green); }

.hs-xp-note { font-size: 13px; line-height: 1.6; color: var(--xp-muted); background: var(--xp-green-soft); border-radius: 8px; padding: 10px 12px; margin: 4px 0 14px; }
.hs-xp-note b { color: var(--xp-green); }

.hs-xp-preset { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.hs-xp-preset span { font-size: 12px; background: var(--xp-green-soft); color: var(--xp-green); border-radius: 999px; padding: 4px 10px; font-weight: 600; }
.hs-xp-preset span.boost { background: rgba(180,83,9,.12); color: var(--xp-amber); }
.hs-xp-auto-tag { font-size: 11px; font-weight: 500; color: var(--xp-muted); margin-left: 4px; }

.hs-xp-modes { display: flex; flex-direction: column; gap: 12px; margin: 6px 0 4px; }
.hs-xp-mode-block { border: 1px solid var(--xp-border); border-radius: 10px; padding: 12px; }
.hs-xp-mode-block h3 { margin: 0 0 10px; font-size: 14px; color: var(--xp-green); }
.hs-xp-mode-xp { margin-top: 8px; font-size: 12.5px; color: var(--xp-muted); }
.hs-xp-mode-xp b { color: var(--xp-green); font-size: 14px; }
.hs-xp-boosted { color: var(--xp-amber); font-weight: 600; font-size: 11px; margin-left: 4px; }

.hs-xp-fixed { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.hs-xp-fixed span { font-size: 12px; background: rgba(180,83,9,.1); color: var(--xp-amber); border-radius: 999px; padding: 4px 10px; font-weight: 600; }

.hs-xp-reverse-sub { margin-top: 10px; font-size: 14px; }
.hs-xp-ok-inline { color: var(--xp-green); font-size: 12.5px; margin-left: 4px; }
.hs-xp-warn-inline { color: var(--xp-red); font-size: 12.5px; margin-left: 4px; }

.hs-xp-level { font-size: 52px; font-weight: 800; color: var(--xp-green); line-height: 1; }
.hs-xp-level span { font-size: 20px; color: var(--xp-muted); font-weight: 600; }
.hs-xp-level-sub { color: var(--xp-muted); font-size: 13px; margin: 6px 0 16px; }
.hs-xp-perday { font-size: 14px; color: var(--xp-text); margin: -8px 0 14px; }
.hs-xp-perday b { color: var(--xp-green); font-size: 18px; }
.hs-xp-perday-detail { color: var(--xp-muted); font-size: 12px; }

.hs-xp-season { display: flex; flex-direction: column; gap: 2px; }
.hs-xp-season-range { font-weight: 700; color: var(--xp-green); font-size: 15px; }
.hs-xp-season-fixed { font-size: 12px; color: var(--xp-muted); }
.hs-xp-breakdown { display: flex; gap: 10px; flex-wrap: wrap; }
.hs-xp-breakdown div { flex: 1; min-width: 90px; background: var(--xp-green-soft); border-radius: 10px; padding: 10px 12px; }
.hs-xp-breakdown span { display: block; font-size: 12px; color: var(--xp-muted); margin-bottom: 4px; }
.hs-xp-breakdown b { font-size: 16px; color: var(--xp-text); }

.hs-xp-target { max-width: 200px; }

.hs-xp-reverse { margin-top: 12px; }
.hs-xp-reverse-main { font-size: 15px; }
.hs-xp-reverse-main b { color: var(--xp-green); font-size: 18px; }
.hs-xp-reverse-main b.late { color: var(--xp-red); }
.hs-xp-rev-desc { margin: 2px 0 12px; font-size: 13px; color: var(--xp-muted); line-height: 1.5; }
.hs-xp-rev-desc b { color: var(--xp-text); }
.hs-xp-rev-detail { margin-top: 8px; font-size: 13px; color: var(--xp-muted); line-height: 1.6; }
.hs-xp-rev-detail b { color: var(--xp-text); }
.hs-xp-ok { margin-top: 8px; font-size: 13px; color: var(--xp-green); line-height: 1.5; }
.hs-xp-warn { margin-top: 8px; font-size: 13px; color: var(--xp-red); line-height: 1.5; }

.hs-xp-chart { width: 100%; height: auto; margin-top: 8px; }
.hs-xp-grid line { stroke: var(--xp-border); stroke-width: 1; }
.hs-xp-grid text { fill: var(--xp-muted); font-size: 11px; }
.hs-xp-curve { fill: none; stroke: var(--xp-green); stroke-width: 2.5; }
.hs-xp-proj-line { stroke: var(--xp-green); stroke-width: 1.5; stroke-dasharray: 4 3; }
.hs-xp-proj-dot { fill: var(--xp-green); }
.hs-xp-proj-text { fill: var(--xp-green); font-size: 12px; font-weight: 700; }
.hs-xp-target-line { stroke: var(--xp-amber); stroke-width: 1.5; stroke-dasharray: 4 3; }
.hs-xp-target-dot { fill: var(--xp-amber); }
.hs-xp-target-text { fill: var(--xp-amber); font-size: 12px; font-weight: 700; }

.hs-xp-foot { margin-top: 22px; font-size: 12px; color: var(--xp-muted); line-height: 1.6; text-align: center; }
</style>
