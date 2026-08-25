<template>
  <section class="section page-section hs-ev" :data-hs-theme="hsTheme">
    <div class="container hs-ev-wrap">
      <header class="hs-ev-head">
        <div>
          <p class="eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Hearthstone Tracker</p>
            <h1>活动计算器</h1>
            <label class="hs-ev-period-select">
              <span>活动期数</span>
              <select v-model="selectedEventId">
                <option v-for="item in eventOptions" :key="item.id" :value="item.id">
                  {{ item.name }}（{{ item.startDate }}）
                </option>
              </select>
            </label>
          <p class="hs-ev-sub">
            按每周任务、每日任务与游玩收益，测算活动路线满级所需的<b>总时长 / 局数</b>，
            并在日历上标出<b>预计满级日期</b>。计算方式固定，活动轮换时只需改名称与周任务即可复用。
          </p>
        </div>
        <div class="hs-ev-head-actions">
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

      <div class="hs-ev-grid">
        <!-- 进度日历（置顶，重点突出） -->
        <section class="hs-ev-cal-section" ref="calSectionRef" v-if="result.hasWindow">
          <div class="hs-ev-cal-head">
            <div class="hs-ev-cal-head-text">
              <h2>📅 进度日历</h2>
              <p>
                按当前「每天游玩 {{ result.dailyPlayMinutes }} 分钟」逐日模拟累计点数：
                <b>周任务在发布日计入</b>（当日额外 <b>+{{ formatXp(weeklyReleaseMax) }}</b> 点）。
                命中满级目标的日期高亮为「达成」。
              </p>
            </div>
            <div class="hs-ev-cal-head-actions">
              <div class="hs-ev-cal-summary">
                <span class="sum-today">
                  当前进度 <b>{{ formatXp(result.currentPoints) }}</b>
                </span>
                <span v-if="result.withPlay.reachDate" class="sum-reach">
                  🎯 预计达成 <b>{{ formatFullDate(result.withPlay.reachDate) }}</b>
                </span>
                <span v-else class="sum-late">✕ 结束前无法达成</span>
              </div>
              <button type="button" class="hs-btn hs-btn-mini hs-ev-export-btn" :disabled="exporting" @click="exportCalendar">
                {{ exporting ? '导出中…' : '📷 导出为图片' }}
              </button>
            </div>
          </div>

          <!-- 输入条：当前已有点数 + 今日任务已完成开关（移入日历，置顶） -->
          <div class="hs-ev-cal-controls">
            <div class="hs-ev-current-top">
              <label for="ev-current">当前已有点数</label>
              <label class="hs-ev-switch" :class="{ 'is-on': event.todayTaskDone }">
                <input id="ev-today-done" type="checkbox" v-model="event.todayTaskDone" />
                <span class="hs-ev-switch-track" aria-hidden="true"><span class="hs-ev-switch-knob"></span></span>
                <span class="hs-ev-switch-text">今日任务已完成</span>
              </label>
            </div>
            <div class="hs-ev-current-input">
              <input id="ev-current" type="number" min="0" v-model.number="event.currentPoints" />
              <span class="hs-ev-current-unit">点</span>
            </div>
          </div>

          <!-- 预计满级时间（紧随输入之后） -->
          <div class="hs-ev-reach-block">
            <div class="hs-ev-reach-main">
              <span class="hs-ev-reach-kicker">预计满级时间</span>
              <div v-if="result.alreadyMaxed" class="hs-ev-reach-date">🎉 已满级</div>
              <div v-else-if="result.withPlay.reachDate" class="hs-ev-reach-date">{{ formatFullDate(result.withPlay.reachDate) }}</div>
              <div v-else class="hs-ev-reach-date hs-ev-reach-late">结束前无法满级</div>
              <div v-if="result.alreadyMaxed" class="hs-ev-reach-sub">
                当前 <b>{{ formatXp(result.currentPoints) }}</b> 点 ≥ 满级目标 <b>{{ formatXp(result.target) }}</b> 点，无需继续游玩。
              </div>
              <div v-else-if="result.withPlay.reachDate" class="hs-ev-reach-sub">
                预计 <b>{{ formatFullDate(result.withPlay.reachDate) }}</b> 达成，距今 <b>{{ result.withPlay.daysToReach }}</b> 天，累计达 <b>{{ formatXp(result.target) }}</b> 点。
                <span v-if="result.withPlay.reachOnTime" class="hs-ev-tag hs-ev-tag-ok">✓ 活动结束前可达成</span>
                <span v-else class="hs-ev-tag hs-ev-tag-late">✕ 超期 {{ daysBetween(result.endDate, result.withPlay.reachDate) }} 天</span>
              </div>
              <div v-else class="hs-ev-reach-sub">
                活动结束前无法满级，还差 <b>{{ formatXp(result.shortBy) }}</b> 点。
                <span v-if="result.dailyMinutesNeeded > 0">若想在结束前满级，需每天游玩约 <b>{{ result.dailyMinutesNeeded }}</b> 分钟。</span>
              </div>
            </div>
            <div class="hs-ev-reach-side">
              <div class="hs-ev-breakdown">
                <div><span>当前已有</span><b>{{ formatXp(result.currentPoints) }}</b></div>
                <div><span>未来每日任务</span><b>{{ formatXp(result.futureDailyTotal) }}</b></div>
                <div><span>未来周任务</span><b>{{ formatXp(result.futureWeeklyTotal) }}</b></div>
                <div><span>满级目标</span><b>{{ formatXp(result.target) }}</b></div>
              </div>
              <div class="hs-ev-play-need" v-if="result.alreadyMaxed">✓ 已达满级</div>
              <div class="hs-ev-play-need" v-else-if="result.tasksAloneEnough">✓ 仅靠每日 / 周常任务即可满级，无需额外游玩</div>
              <div class="hs-ev-play-need" v-else-if="result.withPlay.reachDate">还需游玩 <b>{{ formatHours(result.playHoursTotal) }}</b>（约 <b>{{ result.gamesTotal }}</b> 局）</div>
              <div class="hs-ev-play-need" v-else>需增加游玩时间方能满级</div>
            </div>
          </div>

          <!-- 奖励领取计划 -->
          <div class="hs-ev-reward-plan" v-if="rewardPlan.length">
            <h3>🎁 奖励领取计划（按累计点数升序）</h3>
            <ul>
              <li v-for="t in rewardPlan" :key="t.no" :class="{ 'is-got': t.already || t.reached }">
                <template v-if="t.reached">
                  <b>{{ formatFullDate(t.reachDate) }}</b> 获得 <b>{{ t.label }}</b>
                  <span v-if="t.already" class="rp-tag">（当前已满足）</span>
                  <span v-else class="rp-tag">（累计满 {{ formatXp(t.xp) }} 点）</span>
                </template>
                <template v-else>
                  <b>{{ t.label }}</b> 活动结束前无法达到（需累计满 {{ formatXp(t.xp) }} 点）
                </template>
              </li>
            </ul>
          </div>

          <!-- 日历网格 -->
          <div class="hs-ev-cal">
            <div class="hs-ev-cal-months">
              <div v-for="month in calendar.months" :key="month.key" class="hs-ev-cal-month">
                <div class="hs-ev-cal-month-title">{{ month.label }}</div>
                <div class="hs-ev-cal-week">
                  <span v-for="w in WEEK_LABELS" :key="w">{{ w }}</span>
                </div>
                <div class="hs-ev-cal-grid">
                  <span v-for="n in month.leadingBlanks" :key="'b' + n" class="hs-ev-cal-blank"></span>
                  <div
                    v-for="day in month.days"
                    :key="day.dateKey"
                    class="hs-ev-cal-cell"
                    :class="{
                      'is-window': day.inWindow,
                      'is-reach': day.isReach,
                      'is-reward': day.reward.length,
                      'is-today': day.isToday,
                      'is-end': day.isEnd,
                      'is-weekend': day.isWeekend,
                      'is-past': day.isPast
                    }"
                    :title="day.title"
                  >
                    <span class="hs-ev-cal-daynum">{{ day.dayNum }}</span>
                    <span v-if="day.inWindow && day.cumulative != null" class="hs-ev-cal-pts">{{ formatXp(day.cumulative) }}</span>
                    <span v-if="day.inWindow && day.weekly > 0" class="hs-ev-cal-weekly">周+{{ formatXp(day.weekly) }}</span>
                    <span v-if="day.reward.length" class="hs-ev-cal-reward">
                      <i v-for="t in day.reward" :key="t.no" class="rp-badge">🎁{{ t.no }}</i>
                    </span>
                    <span v-if="day.isReach" class="hs-ev-cal-reach-tag">达成</span>
                    <span v-if="day.isEnd" class="hs-ev-cal-end-tag">结束</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="hs-ev-cal-legend">
              <span><i class="dot reach"></i>满级达成日</span>
              <span><i class="dot today"></i>今天</span>
              <span><i class="dot end"></i>活动结束</span>
              <span><i class="dot weekend"></i>周末</span>
              <span><i class="dot weekly"></i>含周任务</span>
              <span><i class="dot reward"></i>奖励节点</span>
            </div>
          </div>
        </section>

        <!-- 活动信息 & 游玩参数（下方） -->
        <div class="hs-ev-info-row">
          <div class="hs-ev-card hs-ev-card--info">
            <h2>固定活动信息</h2>
            <div class="hs-ev-fixed">
              <div class="hs-ev-fixed-row"><span>活动名称</span><b>{{ event.name }}</b></div>
              <div class="hs-ev-fixed-row">
                <span>活动时间</span>
                <b>{{ event.startDate }} – {{ event.endDate }}</b>
                <i v-if="result.hasWindow">共 {{ result.totalDays }} 天</i>
              </div>
              <div class="hs-ev-fixed-row"><span>每日任务点数</span><b>{{ event.dailyPoints }} 点 / 天</b></div>
              <div class="hs-ev-fixed-row"><span>满级所需总点数</span><b>{{ formatXp(event.targetTotal) }} 点</b></div>
              <div class="hs-ev-fixed-weekly">
                <span class="hs-ev-fixed-label">周任务（发布日一次性发放）</span>
                <ul>
                  <li v-for="(t, i) in event.weeklyTasks" :key="i"><b>{{ t.date }}</b> · +{{ formatXp(t.points) }} 点</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="hs-ev-card hs-ev-card--info">
            <h2>游玩参数</h2>
            <p class="hs-ev-section-label">影响预计满级时间，可调整</p>
            <div class="hs-ev-field-row">
              <div class="hs-ev-field">
                <label for="ev-xpm">每分钟经验</label>
                <input id="ev-xpm" type="number" min="0" step="0.1" v-model.number="event.xpPerMinute" />
              </div>
              <div class="hs-ev-field">
                <label for="ev-play">每天游玩（分钟）</label>
                <input id="ev-play" type="number" min="0" v-model.number="event.dailyPlayMinutes" />
              </div>
              <div class="hs-ev-field">
                <label for="ev-game">每局（分钟）</label>
                <input id="ev-game" type="number" min="1" v-model.number="event.gameMinutes" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 进度曲线 -->
      <section class="hs-ev-chart-section" ref="chartSectionRef" v-if="result.hasWindow && result.count > 1">
        <div class="hs-ev-chart-head">
          <h2>📈 累计点数曲线</h2>
          <button type="button" class="hs-btn hs-btn-mini hs-ev-export-btn" :disabled="exporting" @click="exportChart">
            {{ exporting ? '导出中…' : '📷 导出为图片' }}
          </button>
        </div>
        <svg class="hs-ev-chart" :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="xMidYMid meet" role="img" aria-label="累计点数曲线">
          <g class="hs-ev-grid-y">
            <template v-for="(g, i) in gridY" :key="'gy' + i">
              <line :x1="pad.l" :y1="g.y" :x2="chartW - pad.r" :y2="g.y" />
              <text :x="pad.l - 8" :y="g.y + 4" text-anchor="end">{{ g.label }}</text>
            </template>
          </g>
          <g class="hs-ev-grid-x">
            <template v-for="(g, i) in gridX" :key="'gx' + i">
              <line :x1="g.x" :y1="pad.t" :x2="g.x" :y2="pad.t + plotH" />
              <text :x="g.x" :y="chartH - 8" text-anchor="middle">{{ g.label }}</text>
            </template>
          </g>
          <polyline class="hs-ev-curve" :points="curvePath" />
          <g class="hs-ev-pts">
            <template v-for="(p, i) in pointMarkers" :key="'p' + i">
              <circle class="hs-ev-pt-hit" :cx="p.x" :cy="p.y" r="9" @mouseenter="hoverIdx = i" @mouseleave="hoverIdx = null" @click="hoverIdx = i" />
              <circle class="hs-ev-pt-dot" :class="{ 'is-reach-dot': i === result.withPlay.reachIndex }" :cx="p.x" :cy="p.y" :r="i === result.withPlay.reachIndex ? 4.5 : 3" />
            </template>
          </g>
          <g class="hs-ev-reward-lines">
            <template v-for="t in rewardLines" :key="'rl' + t.no">
              <line :x1="pad.l" :y1="t.y" :x2="chartW - pad.r" :y2="t.y" />
              <rect class="hs-ev-reward-bg" :x="t.x" :y="t.y - 13" :width="t.w" height="15" rx="7.5" />
              <text :x="t.rightX" :y="t.y - 2" text-anchor="end">{{ t.text }}</text>
            </template>
          </g>
          <line class="hs-ev-target-line" :x1="pad.l" :y1="targetY" :x2="chartW - pad.r" :y2="targetY" />
          <rect class="hs-ev-target-bg" :x="targetLabelBox.x" :y="targetY - 13" :width="targetLabelBox.w" height="15" rx="7.5" />
          <text class="hs-ev-target-text" :x="targetLabelBox.rightX" :y="targetY - 2" text-anchor="end">{{ targetLabel }}</text>
          <circle v-if="reachPoint" class="hs-ev-reach-dot" :cx="reachPoint.x" :cy="reachPoint.y" r="5" />
          <g v-if="tip" class="hs-ev-tip">
            <line class="hs-ev-tip-line" :x1="tip.px" :y1="tip.py" :x2="tip.side === 'left' ? tip.x + tip.w : tip.x" :y2="tip.y + tip.h / 2" />
            <rect class="hs-ev-tip-bg" :x="tip.x" :y="tip.y" :width="tip.w" :height="tip.h" rx="6" />
            <text v-for="(l, i) in tip.lines" :key="i" class="hs-ev-tip-text" :class="{ 'is-reach': tip.isReach && i === tip.lines.length - 1 }" :x="tip.x + 9" :y="tip.y + 19 + i * 16">{{ l }}</text>
          </g>
        </svg>
      </section>

      <transition name="hs-ev-fade">
        <div v-if="exportMsg" class="hs-ev-export-toast">{{ exportMsg }}</div>
      </transition>

      <p class="hs-ev-foot">{{ EVENT_CALC_NOTE }}</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import { EVENTS, DEFAULT_EVENT, EVENT_CALC_NOTE } from '../data/events.js'
import { computeEvent, fmtDate, parseDate, daysBetween } from '../utils/eventCalculator.js'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'

const router = useRouter()
const { hsTheme, toggleTheme } = useHearthstoneTheme()

// ===== 本地持久化（按活动期数隔离，刷新不丢） =====
const eventOptions = EVENTS
const EVENT_STORAGE_PREFIX = 'hs:evt:'
const LEGACY_EVENT_KEY = EVENT_STORAGE_PREFIX + 'event'

function cloneEvent(value) {
  return JSON.parse(JSON.stringify(value))
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function normalizeEvent(raw, fallback) {
  const value = { ...cloneEvent(fallback), ...(raw || {}) }
  value.weeklyTasks = Array.isArray(raw?.weeklyTasks) ? raw.weeklyTasks : cloneEvent(fallback.weeklyTasks)
  value.rewardTiers = Array.isArray(raw?.rewardTiers) && raw.rewardTiers.length
    ? raw.rewardTiers
    : cloneEvent(fallback.rewardTiers)
  if (typeof value.todayTaskDone !== 'boolean') value.todayTaskDone = true

  const oldLabels = ['奖励1', '奖励2', '奖励3', '奖励4']
  value.rewardTiers = value.rewardTiers.map((tier, index) =>
    oldLabels[index] && tier.label === oldLabels[index] && fallback.rewardTiers[index]
      ? { ...tier, label: fallback.rewardTiers[index].label }
      : tier
  )
  return value
}

function loadEvent(id) {
  const fallback = eventOptions.find((item) => item.id === id) || DEFAULT_EVENT
  // 首次升级时把旧版单活动缓存迁移到第一期，保留用户已经填写的进度。
  const stored = readJson(EVENT_STORAGE_PREFIX + id) || (id === eventOptions[0].id ? readJson(LEGACY_EVENT_KEY) : null)
  const value = normalizeEvent(stored, fallback)
  try { localStorage.setItem(EVENT_STORAGE_PREFIX + id, JSON.stringify(value)) } catch { /* ignore */ }
  return value
}

const selectedEventId = ref(readJson(EVENT_STORAGE_PREFIX + 'active') || eventOptions[0].id)
const event = ref(loadEvent(selectedEventId.value))

watch(event, (value) => {
  try { localStorage.setItem(EVENT_STORAGE_PREFIX + selectedEventId.value, JSON.stringify(value)) } catch { /* ignore */ }
}, { deep: true })

watch(selectedEventId, (id) => {
  try { localStorage.setItem(EVENT_STORAGE_PREFIX + 'active', JSON.stringify(id)) } catch { /* ignore */ }
  event.value = loadEvent(id)
})

// ===== 计算结果 =====
const result = computed(() => computeEvent(event.value, new Date()))

// ===== 日历（按活动窗口逐日分组，周一起始） =====
const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const calendar = computed(() => {
  const ev = event.value
  const start = parseDate(ev.startDate)
  const end = parseDate(ev.endDate)
  const days = result.value.withPlay.days
  const byKey = new Map(days.map((d) => [d.dateKey, d]))
  const reachKey = result.value.withPlay.reachDate ? fmtDate(result.value.withPlay.reachDate) : null
  const endKey = fmtDate(end)
  // 奖励里程碑命中（按达成日归集）
  const tierMap = new Map()
  for (const t of result.value.rewardTiers) {
    if (t.reached && t.reachDate) {
      const k = fmtDate(t.reachDate)
      if (!tierMap.has(k)) tierMap.set(k, [])
      tierMap.get(k).push({ no: t.no, label: t.label, xp: t.xp })
    }
  }
  const today = startOfDay(new Date())
  const todayKey = fmtDate(today)

  const months = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const firstWeekday = new Date(y, m, 1).getDay()
    const leadingBlanks = (firstWeekday + 6) % 7
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const monthDays = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d)
      const key = fmtDate(date)
      const sim = byKey.get(key)
      const inWindow = date >= start && date <= end
      monthDays.push({
        dateKey: key,
        dayNum: d,
        inWindow,
        isPast: inWindow && date < today,
        cumulative: sim ? Math.min(sim.cumulative, result.value.target) : null,
        weekly: sim ? sim.weekly : 0,
        isReach: key === reachKey,
        isEnd: key === endKey,
        isToday: key === todayKey,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        reward: tierMap.get(key) || [],
        title: sim
          ? buildDayTitle(sim, date)
          : inWindow && date < today
            ? '已过去 · 进度已计入「当前已有点数」'
            : ''
      })
    }
    months.push({ key: `${y}-${m}`, label: `${m + 1} 月`, leadingBlanks, days: monthDays })
    cursor = new Date(y, m + 1, 1)
  }

  return { months }
})

// 奖励领取计划（按累计点数升序）
const rewardPlan = computed(() =>
  [...result.value.rewardTiers].sort((a, b) => a.xp - b.xp)
)

function buildDayTitle(sim, date) {
  const cum = Math.min(sim.cumulative, result.value.target)
  const parts = [`${date.getMonth() + 1}月${date.getDate()}日：累计 ${formatXp(cum)} 点`]
  parts.push(`当日 +${formatXp(sim.dayGain)}`)
  if (sim.weekly > 0) parts.push(`含周任务 +${formatXp(sim.weekly)}`)
  return parts.join('\n')
}

// 周任务中单次最大发放量（用于日历说明）
const weeklyReleaseMax = computed(() =>
  (event.value.weeklyTasks || []).reduce((mx, t) => Math.max(mx, Number(t.points) || 0), 0)
)

// ===== SVG 曲线 =====
const chartW = 680
const chartH = 260
const pad = { l: 54, r: 14, t: 16, b: 34 }
const plotW = chartW - pad.l - pad.r
const plotH = chartH - pad.t - pad.b

const chartMax = computed(() =>
  Math.max(result.value.target, 1)
)

function xFor(i) {
  const c = result.value.count
  if (c <= 1) return pad.l + plotW / 2
  return pad.l + (i / (c - 1)) * plotW
}
function yFor(v) {
  return pad.t + plotH - (v / chartMax.value) * plotH
}

const curvePath = computed(() => {
  const cap = result.value.target
  return result.value.withPlay.days
    .map((d, i) => `${xFor(i).toFixed(1)},${yFor(Math.min(d.cumulative, cap)).toFixed(1)}`)
    .join(' ')
})
const targetY = computed(() => yFor(result.value.target))
const targetLabel = computed(() => `满级 ${formatXp(result.value.target)}`)
const targetLabelBox = computed(() => {
  const rightX = chartW - pad.r - 4
  const leftMin = pad.l + 4
  const maxW = rightX - leftMin - 8
  const w = labelWidth(targetLabel.value, maxW)
  const x = Math.max(leftMin, rightX - w - 6)
  return { x, rightX, w: rightX - x + 4 }
})
const reachPoint = computed(() => {
  const w = result.value.withPlay
  if (!w.reachDate || w.reachIndex < 0) return null
  const day = w.days[w.reachIndex]
  return { x: xFor(w.reachIndex), y: yFor(Math.min(day.cumulative, result.value.target)) }
})
const gridY = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: pad.t + plotH - p * plotH,
    label: formatXpShort(p * chartMax.value)
  }))
)

// 竖向网格线 + X 轴日期刻度（去掉年份，显示为 M/D）；天数过多时自动抽稀
const gridX = computed(() => {
  const days = result.value.withPlay.days
  if (!days.length) return []
  const step = days.length > 31 ? Math.ceil(days.length / 31) : 1
  const out = []
  days.forEach((d, i) => {
    if (i % step === 0 || i === days.length - 1) {
      out.push({ x: xFor(i), label: fmtMD(d.date) })
    }
  })
  return out
})

// 文本宽度估算（CJK 按 2 个英文字宽计）
function cjkLen(s) {
  let n = 0
  for (const ch of String(s)) n += ch.charCodeAt(0) > 255 ? 2 : 1
  return n
}
function labelWidth(text, maxW) {
  const w = cjkLen(text) * 6.8 + 10
  return Math.min(maxW, Math.max(48, w))
}

// 奖励横向参考线（仅在未与满级线重合时绘制）
const rewardLines = computed(() => {
  const cap = result.value.target
  const rightX = chartW - pad.r - 4
  const leftMin = pad.l + 4
  const maxW = rightX - leftMin - 8
  return result.value.rewardTiers
    .filter((t) => t.reached && t.xp < cap)
    .map((t) => {
      const text = `${t.label} · ${formatXp(t.xp)}`
      const w = labelWidth(text, maxW)
      const x = Math.max(leftMin, rightX - w - 6)
      return { no: t.no, label: t.label, xp: t.xp, y: yFor(t.xp), text, x, rightX, w: rightX - x + 4 }
    })
})

// 曲线上的每个数据点：位置 + 日期 + 经验值（封顶），仅作圆点；悬浮时才显示详情
const pointMarkers = computed(() => {
  const cap = result.value.target
  const days = result.value.withPlay.days
  const tiers = result.value.rewardTiers
  return days.map((d, i) => {
    const y = yFor(Math.min(d.cumulative, cap))
    const rewards = tiers
      .filter((t) => t.reached && t.reachDate && fmtDate(t.reachDate) === fmtDate(d.date))
      .map((t) => t.label)
    return {
      x: xFor(i),
      y,
      xp: formatXp(Math.min(d.cumulative, cap)),
      date: fmtMD(d.date),
      rewards
    }
  })
})

// 悬浮提示：把「日期 + 经验值（+达成）」只在移到点上时显示
const hoverIdx = ref(null)
const tip = computed(() => {
  if (hoverIdx.value == null) return null
  const p = pointMarkers.value[hoverIdx.value]
  if (!p) return null
  const isReach = result.value.withPlay.reachIndex === hoverIdx.value
  const lines = [p.date, '经验值 ' + p.xp]
  if (p.rewards.length) lines.push('获得 ' + p.rewards.join('、'))
  if (isReach) lines.push('✓ 达成')
  const w = cjkLen(lines.reduce((a, b) => (cjkLen(a) >= cjkLen(b) ? a : b))) * 7 + 18
  const h = lines.length * 16 + 12
  let side = 'right'
  let x = p.x + 12
  if (x + w > chartW - 4) { x = p.x - 12 - w; side = 'left' }
  if (x < 4) { x = 4; side = 'right' }
  let y = p.y - h - 10
  if (y < pad.t) y = p.y + 12
  if (y + h > chartH - 2) y = chartH - 2 - h
  return { x, y, w, h, lines, isReach, px: p.x, py: p.y, side }
})

// ===== 格式化 =====
function formatXp(n) {
  return Math.round(n || 0).toLocaleString('en-US')
}
function formatXpShort(n) {
  n = Math.round(n || 0)
  if (n >= 10000) return (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}
function formatHours(h) {
  const v = Math.round((Number(h) || 0) * 10) / 10
  return v + ' 小时'
}
function formatFullDate(d) {
  if (!d) return '-'
  const dd = startOfDay(d)
  const y = dd.getFullYear()
  const m = String(dd.getMonth() + 1).padStart(2, '0')
  const day = String(dd.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function fmtMD(d) {
  if (!d || !(d instanceof Date)) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ===== 导出为图片 =====
const calSectionRef = ref(null)
const chartSectionRef = ref(null)
const exporting = ref(false)
const exportMsg = ref('')
let exportMsgTimer = null
function flashExport(msg) {
  exportMsg.value = msg
  if (exportMsgTimer) clearTimeout(exportMsgTimer)
  exportMsgTimer = setTimeout(() => { exportMsg.value = '' }, 2600)
}
async function exportSection(el, filenameBase) {
  if (!el || exporting.value) return
  exporting.value = true
  try {
    const bg = hsTheme.value === 'dark' ? '#1a1410' : '#fdf8f4'
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: bg,
      cacheBust: true,
      filter: (node) =>
        !(node.classList && node.classList.contains('hs-ev-export-btn')),
      style: { margin: '0', boxShadow: 'none', borderRadius: '0', border: '0' }
    })
    const link = document.createElement('a')
    const now = new Date()
    const p2 = (v) => String(v).padStart(2, '0')
    const ts = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`
    link.download = `${filenameBase}-${ts}.png`
    link.href = dataUrl
    link.click()
    flashExport('已导出图片')
  } catch (e) {
    flashExport('导出失败：' + (e?.message || '未知错误'))
  } finally {
    exporting.value = false
  }
}
function exportCalendar() {
  exportSection(calSectionRef.value, '活动日历')
}
function exportChart() {
  exportSection(chartSectionRef.value, '累计点数曲线')
}
</script>

<style scoped>
.hs-ev {
  --ev-orange: #c2410c;
  --ev-orange-soft: rgba(194, 65, 12, 0.1);
  --ev-orange-mid: rgba(194, 65, 12, 0.18);
  --ev-amber: #b45309;
  --ev-red: #dc2626;
  --ev-bg: #fdf8f4;
  --ev-card: #ffffff;
  --ev-text: #1f2937;
  --ev-muted: #6b7280;
  --ev-border: rgba(194, 65, 12, 0.22);
  --ev-input-bg: #ffffff;
  padding: 32px 0 56px;
  min-height: 100vh;
  background: var(--ev-bg);
  color: var(--ev-text);
}
.hs-ev[data-hs-theme='dark'] {
  --ev-orange: #fb923c;
  --ev-orange-soft: rgba(251, 146, 60, 0.12);
  --ev-orange-mid: rgba(251, 146, 60, 0.22);
  --ev-amber: #fbbf24;
  --ev-red: #f87171;
  --ev-bg: #1a1410;
  --ev-card: #241c16;
  --ev-text: #e5e7eb;
  --ev-muted: #9aa3ad;
  --ev-border: rgba(251, 146, 60, 0.3);
  --ev-input-bg: #2c231b;
}
.hs-ev-wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }

.hs-ev-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.hs-ev-head .eyebrow { display: inline-flex; align-items: center; gap: 6px; color: var(--ev-orange); font-weight: 700; font-size: 13px; margin: 0 0 6px; }
.hs-live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ev-orange); box-shadow: 0 0 0 3px var(--ev-orange-soft); }
.hs-ev-head h1 { font-size: 28px; margin: 0 0 6px; }
.hs-ev-period-select { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--ev-muted); font-size: 13px; font-weight: 700; }
.hs-ev-period-select select { min-height: 34px; padding: 5px 10px; border: 1px solid var(--ev-border); border-radius: 8px; color: var(--ev-text); background: var(--ev-input-bg); font: inherit; }
.hs-ev-sub { margin: 0; max-width: 560px; color: var(--ev-muted); line-height: 1.6; font-size: 14px; }
.hs-ev-sub b { color: var(--ev-orange); }
.hs-ev-head-actions { display: flex; gap: 8px; align-items: center; }

.hs-btn { font: inherit; border-radius: 8px; padding: 8px 14px; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
.hs-btn-ghost { background: var(--ev-orange-soft); border-color: var(--ev-border); color: var(--ev-orange); font-weight: 600; }
.hs-btn-ghost:hover { background: var(--ev-orange-mid); }
.hs-btn-mini { font-size: 12px; padding: 4px 10px; background: var(--ev-orange-soft); border-color: var(--ev-border); color: var(--ev-orange); font-weight: 700; border-radius: 6px; }

.hs-ev-grid { display: flex; flex-direction: column; gap: 18px; margin-top: 22px; }
.hs-ev-info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 880px) { .hs-ev-info-row { grid-template-columns: 1fr; } }

.hs-ev-card { background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 14px; padding: 20px; }
.hs-ev-card h2 { font-size: 16px; margin: 0 0 14px; }
.hs-ev-h2 { margin-top: 26px !important; }

/* 当前已有点数输入条（移入日历） */
.hs-ev-cal-controls {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin-bottom: 16px; padding: 14px 16px;
  border: 1.5px solid var(--ev-orange); border-radius: 14px;
  background: linear-gradient(180deg, var(--ev-orange-soft), var(--ev-card) 80%);
}
.hs-ev-current-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; width: 100%; }
.hs-ev-current-top > label { font-size: 14px; font-weight: 800; color: var(--ev-orange); }
.hs-ev-current-input { display: flex; align-items: baseline; gap: 8px; margin: 0; flex: 1; min-width: 200px; }
.hs-ev-current-input input {
  font: inherit; font-size: 34px; font-weight: 800; font-variant-numeric: tabular-nums;
  padding: 6px 12px; border: 1px solid var(--ev-border); border-radius: 10px;
  background: var(--ev-input-bg); color: var(--ev-text); width: 100%; box-sizing: border-box;
}
.hs-ev-current-input input:focus { outline: 2px solid var(--ev-orange-mid); border-color: var(--ev-orange); }
.hs-ev-current-unit { font-size: 16px; font-weight: 700; color: var(--ev-muted); }

/* 今日任务开关 */
.hs-ev-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.hs-ev-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.hs-ev-switch-track {
  position: relative; width: 38px; height: 21px; border-radius: 999px; flex: none;
  background: rgba(107, 114, 128, .35); transition: background .18s;
}
.hs-ev-switch-knob {
  position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .18s;
}
.hs-ev-switch.is-on .hs-ev-switch-track { background: var(--ev-orange); }
.hs-ev-switch.is-on .hs-ev-switch-knob { transform: translateX(17px); }
.hs-ev-switch-text { font-size: 12px; font-weight: 600; color: var(--ev-muted); line-height: 1.3; }
.hs-ev-switch-text small { display: block; font-weight: 500; opacity: .8; }
.hs-ev-switch.is-on .hs-ev-switch-text { color: var(--ev-orange); }

/* 固定活动信息（只读展示） */
.hs-ev-fixed { border: 1px solid var(--ev-border); border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; background: linear-gradient(180deg, var(--ev-orange-soft), transparent 60%); }
.hs-ev-fixed-row { display: flex; align-items: baseline; gap: 10px; padding: 5px 0; border-bottom: 1px dashed var(--ev-border); }
.hs-ev-fixed-row:last-of-type { border-bottom: none; }
.hs-ev-fixed-row > span { font-size: 13px; color: var(--ev-muted); font-weight: 600; flex: none; min-width: 88px; }
.hs-ev-fixed-row > b { font-size: 14px; color: var(--ev-text); font-weight: 700; }
.hs-ev-fixed-row > i { font-size: 12px; color: var(--ev-orange); font-style: normal; font-weight: 700; margin-left: auto; }
.hs-ev-fixed-weekly { margin-top: 8px; }
.hs-ev-fixed-label { display: block; font-size: 13px; font-weight: 700; color: var(--ev-orange); margin-bottom: 6px; }
.hs-ev-fixed-weekly ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.hs-ev-fixed-weekly li { font-size: 13px; color: var(--ev-text); background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 8px; padding: 6px 10px; }
.hs-ev-fixed-weekly li b { color: var(--ev-orange); font-variant-numeric: tabular-nums; }
.hs-ev-section-label { font-size: 13px; font-weight: 700; color: var(--ev-muted); margin: 0 0 10px; }

/* 右侧/顶部结果块：重点突出 */
.hs-ev-card--info { border-color: var(--ev-border); }

.hs-ev-reach-block {
  display: flex; gap: 18px; flex-wrap: wrap; align-items: stretch;
  margin-bottom: 16px; padding: 16px 18px;
  border: 1.5px solid var(--ev-orange); border-radius: 14px;
  background: linear-gradient(180deg, var(--ev-orange-soft), var(--ev-card) 60%);
}
.hs-ev-reach-main { flex: 1; min-width: 240px; }
.hs-ev-reach-kicker { display: block; font-size: 13px; font-weight: 800; color: var(--ev-orange); letter-spacing: .5px; margin-bottom: 4px; }
.hs-ev-reach-side { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 10px; justify-content: center; }
.hs-ev-play-need { font-size: 14px; color: var(--ev-text); line-height: 1.5; background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 10px; padding: 10px 12px; }
.hs-ev-play-need b { color: var(--ev-orange); font-size: 16px; }

.hs-ev-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.hs-ev-field-row { display: flex; gap: 14px; }
.hs-ev-field-row .hs-ev-field { flex: 1; }
.hs-ev-field label { font-size: 13px; color: var(--ev-muted); font-weight: 600; }
.hs-ev-field input {
  font: inherit; padding: 9px 11px; border: 1px solid var(--ev-border); border-radius: 8px;
  background: var(--ev-input-bg); color: var(--ev-text); width: 100%; box-sizing: border-box;
}
.hs-ev-field input:focus { outline: 2px solid var(--ev-orange-mid); border-color: var(--ev-orange); }
.hs-ev-range { font-size: 12px; color: var(--ev-muted); margin: -6px 0 14px; }

.hs-ev-weekly { margin-top: 6px; border: 1px solid var(--ev-border); border-radius: 10px; padding: 12px; }
.hs-ev-weekly-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 700; color: var(--ev-orange); margin-bottom: 10px; }
.hs-ev-weekly-list { display: flex; flex-direction: column; gap: 8px; }
.hs-ev-weekly-row { display: flex; align-items: center; gap: 8px; }
.hs-ev-weekly-row input[type='date'] { flex: 1.4; font: inherit; padding: 7px 9px; border: 1px solid var(--ev-border); border-radius: 8px; background: var(--ev-input-bg); color: var(--ev-text); }
.hs-ev-weekly-row input[type='number'] { flex: 1; font: inherit; padding: 7px 9px; border: 1px solid var(--ev-border); border-radius: 8px; background: var(--ev-input-bg); color: var(--ev-text); }
.hs-ev-weekly-unit { font-size: 12px; color: var(--ev-muted); }
.hs-ev-weekly-del { font: inherit; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--ev-border); background: var(--ev-orange-soft); color: var(--ev-red); cursor: pointer; font-weight: 800; line-height: 1; }
.hs-ev-weekly-del:disabled { opacity: .4; cursor: not-allowed; }

.hs-ev-reach-date { font-size: 34px; font-weight: 800; color: var(--ev-orange); line-height: 1.2; font-variant-numeric: tabular-nums; }
.hs-ev-reach-sub { font-size: 13px; color: var(--ev-muted); margin-top: 4px; }
.hs-ev-reach-sub b { color: var(--ev-text); }
.hs-ev-tag { display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 4px 12px; }
.hs-ev-tag-ok { background: var(--ev-orange-mid); color: var(--ev-orange); }
.hs-ev-tag-late { background: rgba(220, 38, 38, .12); color: var(--ev-red); }

.hs-ev-breakdown { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.hs-ev-breakdown div { flex: 1; min-width: 90px; background: var(--ev-orange-soft); border-radius: 10px; padding: 10px 12px; }
.hs-ev-breakdown span { display: block; font-size: 12px; color: var(--ev-muted); margin-bottom: 4px; }
.hs-ev-breakdown b { font-size: 16px; color: var(--ev-text); }

.hs-ev-chart-section { margin-top: 22px; background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 14px; padding: 18px 20px; }
.hs-ev-chart-section h2 { font-size: 16px; margin: 0 0 12px; color: var(--ev-orange); }
.hs-ev-chart { width: 100%; height: auto; }
.hs-ev-grid-y line, .hs-ev-grid-x line { stroke: var(--ev-border); stroke-width: 1; }
.hs-ev-grid-y line { stroke-dasharray: 3 3; }
.hs-ev-grid-x line { stroke-dasharray: 2 3; opacity: .7; }
.hs-ev-grid-y text { fill: var(--ev-muted); font-size: 11px; }
.hs-ev-grid-x text { fill: var(--ev-muted); font-size: 10px; }
.hs-ev-curve { fill: none; stroke: var(--ev-orange); stroke-width: 2.5; }
.hs-ev-pt-hit { fill: transparent; cursor: pointer; }
.hs-ev-pt-dot { fill: var(--ev-orange); stroke: var(--ev-card); stroke-width: 1; transition: r .1s; }
.hs-ev-pt-dot.is-reach-dot { fill: var(--ev-amber); }
.hs-ev-target-line { stroke: var(--ev-amber); stroke-width: 1.5; stroke-dasharray: 4 3; }
.hs-ev-target-text { fill: var(--ev-amber); font-size: 12px; font-weight: 700; }
.hs-ev-reach-dot { fill: var(--ev-amber); }
.hs-ev-tip-line { stroke: var(--ev-border); stroke-width: 1; stroke-dasharray: 2 2; }
.hs-ev-tip-bg { fill: var(--ev-card); stroke: var(--ev-border); stroke-width: 1; }
.hs-ev-tip-text { fill: var(--ev-text); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
.hs-ev-tip-text.is-reach { fill: var(--ev-amber); font-weight: 800; }

.hs-ev-cal-section {
  margin-top: 0;
  background: linear-gradient(180deg, var(--ev-orange-soft), var(--ev-card) 40%);
  border: 1.5px solid var(--ev-orange);
  border-radius: 16px;
  padding: 20px 22px 22px;
}
.hs-ev-cal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.hs-ev-cal-head-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.hs-ev-chart-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.hs-ev-chart-head h2 { font-size: 16px; margin: 0; color: var(--ev-orange); }
.hs-ev-export-btn { flex: none; background: var(--ev-card); border: 1px solid var(--ev-orange); color: var(--ev-orange); font-weight: 700; font-size: 12px; padding: 7px 12px; border-radius: 8px; cursor: pointer; transition: all .15s; }
.hs-ev-export-btn:hover:not(:disabled) { background: var(--ev-orange-soft); }
.hs-ev-export-btn:disabled { opacity: .6; cursor: not-allowed; }

.hs-ev-export-toast { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 50; background: var(--ev-text); color: var(--ev-card); font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 999px; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
.hs-ev-fade-enter-active, .hs-ev-fade-leave-active { transition: opacity .25s, transform .25s; }
.hs-ev-fade-enter-from, .hs-ev-fade-leave-to { opacity: 0; transform: translate(-50%, 8px); }
.hs-ev-cal-head-text { flex: 1; min-width: 260px; }
.hs-ev-cal-head h2 { font-size: 22px; margin: 0 0 6px; color: var(--ev-orange); letter-spacing: .5px; }
.hs-ev-cal-head p { margin: 0; font-size: 13px; color: var(--ev-muted); line-height: 1.6; max-width: 640px; }
.hs-ev-cal-head p b { color: var(--ev-orange); }
.hs-ev-cal-summary { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.hs-ev-cal-summary span { font-size: 13px; font-weight: 600; background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 999px; padding: 7px 14px; color: var(--ev-text); box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.hs-ev-cal-summary b { color: var(--ev-orange); font-size: 15px; }
.hs-ev-cal-summary .sum-reach { border-color: var(--ev-amber); background: rgba(180, 83, 9, .1); color: var(--ev-amber); }
.hs-ev-cal-summary .sum-reach b { color: var(--ev-amber); font-size: 16px; }
.hs-ev-cal-summary .sum-late { border-color: rgba(220, 38, 38, .4); background: rgba(220, 38, 38, .08); color: var(--ev-red); }

.hs-ev-cal-months { display: flex; gap: 16px; flex-wrap: wrap; }
.hs-ev-cal-month { flex: 1 1 300px; min-width: 280px; max-width: 100%; background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 12px; padding: 12px 12px 10px; }
.hs-ev-cal-month-title { font-size: 15px; font-weight: 800; color: var(--ev-text); margin-bottom: 8px; }
.hs-ev-cal-week, .hs-ev-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.hs-ev-cal-week { margin-bottom: 4px; }
.hs-ev-cal-week span { text-align: center; font-size: 11px; font-weight: 700; color: var(--ev-muted); padding: 2px 0; }
.hs-ev-cal-blank { min-height: 52px; }
.hs-ev-cal-cell { position: relative; min-height: 52px; border: 1px solid var(--ev-border); border-radius: 8px; padding: 4px 5px; box-sizing: border-box; background: transparent; display: flex; flex-direction: column; gap: 2px; }
.hs-ev-cal-cell.is-window { background: var(--ev-card); }
.hs-ev-cal-cell.is-weekend { background: var(--ev-orange-soft); }
.hs-ev-cal-cell.is-today { outline: 2px solid var(--ev-orange); outline-offset: 1px; }
.hs-ev-cal-cell.is-end { border-color: var(--ev-red); }
.hs-ev-cal-cell.is-past { background: rgba(107, 114, 128, .08); border-style: dashed; }
.hs-ev-cal-cell.is-past .hs-ev-cal-daynum { color: var(--ev-muted); }
.hs-ev-cal-cell.is-reach { border-color: var(--ev-amber); background: rgba(180, 83, 9, .16); }
.hs-ev-cal-daynum { font-size: 12px; font-weight: 700; color: var(--ev-muted); line-height: 1; }
.hs-ev-cal-pts { font-size: 13px; font-weight: 800; color: var(--ev-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
.hs-ev-cal-weekly { font-size: 10px; font-weight: 700; color: var(--ev-amber); line-height: 1; }
.hs-ev-cal-reach-tag, .hs-ev-cal-end-tag { position: absolute; top: 4px; right: 5px; font-size: 10px; font-weight: 800; line-height: 1; }
.hs-ev-cal-reach-tag { color: #fff; background: var(--ev-amber); border-radius: 999px; padding: 2px 6px; }
.hs-ev-cal-end-tag { color: var(--ev-red); }
.hs-ev-cal-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 14px; }
.hs-ev-cal-legend span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ev-muted); }
.hs-ev-cal-legend i.dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.hs-ev-cal-legend i.reach { background: var(--ev-amber); }
.hs-ev-cal-legend i.today { background: var(--ev-orange); }
.hs-ev-cal-legend i.end { background: transparent; border: 1px solid var(--ev-red); }
.hs-ev-cal-legend i.weekend { background: var(--ev-orange-soft); border: 1px solid var(--ev-border); }
.hs-ev-cal-legend i.weekly { background: rgba(180, 83, 9, .35); border: 1px solid var(--ev-amber); }
.hs-ev-cal-legend i.reward { background: var(--ev-orange); border-radius: 999px; }

.hs-ev-cal-cell.is-reward { border-color: var(--ev-orange); background: rgba(194, 65, 12, .12); }
.hs-ev-cal-reward { display: flex; flex-wrap: wrap; gap: 2px; margin-top: auto; }
.rp-badge { font-size: 9px; font-weight: 800; font-style: normal; color: #fff; background: var(--ev-orange); border-radius: 4px; padding: 1px 4px; line-height: 1.4; }

.hs-ev-reward-plan { margin-top: 14px; background: var(--ev-card); border: 1px solid var(--ev-border); border-radius: 12px; padding: 14px 16px; }
.hs-ev-reward-plan h3 { font-size: 15px; margin: 0 0 10px; color: var(--ev-orange); }
.hs-ev-reward-plan ul { margin: 0; padding-left: 20px; }
.hs-ev-reward-plan li { font-size: 14px; line-height: 1.9; color: var(--ev-text); }
.hs-ev-reward-plan li b { font-variant-numeric: tabular-nums; }
.hs-ev-reward-plan li.is-got b { color: var(--ev-orange); }
.hs-ev-reward-plan .rp-tag { font-size: 12px; color: var(--ev-muted); margin-left: 4px; }

.hs-ev-tier-row { display: flex; align-items: center; gap: 8px; }
.hs-ev-tier-row input { flex: 1; font: inherit; padding: 7px 9px; border: 1px solid var(--ev-border); border-radius: 8px; background: var(--ev-input-bg); color: var(--ev-text); }
.hs-ev-tier-row input:focus { outline: 2px solid var(--ev-orange-mid); border-color: var(--ev-orange); }

.hs-ev-reward-lines line { stroke: var(--ev-orange); stroke-width: 1; stroke-dasharray: 2 3; opacity: .55; }
.hs-ev-reward-lines text { fill: var(--ev-orange); font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
.hs-ev-reward-lines rect { fill: var(--ev-card); stroke: var(--ev-orange); stroke-width: 1; }
.hs-ev-target-line { stroke: var(--ev-amber); stroke-width: 1.5; stroke-dasharray: 4 3; }
.hs-ev-target-bg { fill: var(--ev-card); stroke: var(--ev-amber); stroke-width: 1; }
.hs-ev-target-text { fill: var(--ev-amber); font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
@media (max-width: 640px) {
  .hs-ev-cal-section { padding: 14px 12px 16px; }
  .hs-ev-cal-month { flex-basis: 100%; min-width: 0; }
  .hs-ev-cal-cell { min-height: 44px; padding: 3px 4px; }
  .hs-ev-cal-pts { font-size: 11px; }
  .hs-ev-cal-weekly { font-size: 9px; }
}

.hs-ev-foot { margin-top: 22px; font-size: 12px; color: var(--ev-muted); line-height: 1.6; text-align: center; }
</style>
