<template>
  <section class="section page-section">
    <div class="container">
      <div class="training-header">
        <div>
          <p class="eyebrow">400m Interval</p>
          <h1>间歇训练数据看板</h1>
          <p>按训练日期查看 400 米间歇配速、评级分布和每组明细。</p>
        </div>
      </div>

      <div class="training-stats" aria-label="训练统计">
        <div class="metric-item">
          <span>训练次数</span>
          <strong>{{ stats.sessions }}</strong>
        </div>
        <div class="metric-item">
          <span>总组数</span>
          <strong>{{ stats.laps }}</strong>
        </div>
        <div class="metric-item">
          <span>平均配速</span>
          <strong>{{ stats.avgPace }}</strong>
        </div>
        <div class="metric-item">
          <span>优秀次数</span>
          <strong>{{ stats.excellent }}</strong>
        </div>
      </div>

      <div class="training-grid">
        <section class="dashboard-panel wide-panel">
          <div class="panel-heading">
            <div>
              <h2>配速趋势</h2>
              <p>纵轴越高表示配速越快；每条线代表一次训练。</p>
            </div>
            <div class="chart-actions">
              <button type="button" class="chart-action-btn" @click="selectLatestChartSession">最新</button>
              <button type="button" class="chart-action-btn" @click="selectAllChartSessions">全选</button>
            </div>
          </div>
          <div class="chart-date-options" aria-label="选择趋势图日期">
            <label
              v-for="option in chartDateOptions"
              :key="option.key"
              class="chart-date-option"
              :class="{ 'is-active': chartSelectedDateKeys.includes(option.key) }"
            >
              <input
                type="checkbox"
                :checked="chartSelectedDateKeys.includes(option.key)"
                @change="toggleChartSession(option.key)"
              >
              <span>{{ option.label }}</span>
            </label>
          </div>
          <div class="chart-shell">
            <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="配速趋势图">
              <g class="chart-grid-lines" aria-hidden="true">
                <line
                  v-for="line in chart.yGridLines"
                  :key="line.key"
                  :x1="chart.left"
                  :y1="line.y"
                  :x2="chart.width - chart.right"
                  :y2="line.y"
                />
                <line
                  v-for="line in chart.xGridLines"
                  :key="line.key"
                  :x1="line.x"
                  :y1="chart.top"
                  :x2="line.x"
                  :y2="chart.height - chart.bottom"
                />
              </g>
              <line class="chart-axis-line" :x1="chart.left" :y1="chart.top" :x2="chart.left" :y2="chart.height - chart.bottom" />
              <line class="chart-axis-line" :x1="chart.left" :y1="chart.height - chart.bottom" :x2="chart.width - chart.right" :y2="chart.height - chart.bottom" />
              <text v-for="label in chart.yLabels" :key="label.text" x="8" :y="label.y" font-size="11" fill="#607086">{{ label.text }}</text>
              <text v-for="label in chart.xLabels" :key="label.text" :x="label.x" :y="chart.height - 12" text-anchor="middle" font-size="11" fill="#607086">{{ label.text }}</text>
              <polyline
                v-for="line in chart.lines"
                :key="line.key"
                :points="line.points"
                fill="none"
                :stroke="line.color"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-for="dot in chart.dots"
                :key="dot.key"
                :cx="dot.x"
                :cy="dot.y"
                r="4.5"
                :fill="dot.color"
                tabindex="0"
                @mouseenter="hoveredDot = dot"
                @mouseleave="hoveredDot = null"
                @focus="hoveredDot = dot"
                @blur="hoveredDot = null"
              >
                <title>{{ dot.title }}</title>
              </circle>
              <g v-if="chartTooltip" class="chart-tooltip" :transform="`translate(${chartTooltip.x}, ${chartTooltip.y})`">
                <rect width="156" height="62" rx="8" />
                <text
                  v-for="(line, index) in chartTooltip.lines"
                  :key="line"
                  x="12"
                  :y="18 + index * 18"
                >{{ line }}</text>
              </g>
            </svg>
            <div class="chart-legend">
              <span v-for="line in chart.lines" :key="line.key" :style="{ borderColor: line.color }">{{ line.label }}</span>
            </div>
          </div>
        </section>

        <section class="dashboard-panel">
          <div class="panel-heading">
            <h2>评级分布</h2>
            <p>按每组 400 米用时自动评级。</p>
          </div>
          <div class="bar-chart">
            <div v-for="row in ratingRows" :key="row.rating" class="bar-row">
              <span>{{ row.rating }}</span>
              <div class="bar-track"><div class="bar-fill" :style="{ width: `${row.percent}%` }"></div></div>
              <strong>{{ row.count }}</strong>
            </div>
          </div>
        </section>
      </div>

      <section class="dashboard-panel calendar-panel">
        <div class="panel-heading calendar-title-row">
          <div>
            <h2>训练日历</h2>
            <p>选择有记录的日期查看每组明细。</p>
          </div>
          <div class="calendar-controls">
            <button type="button" aria-label="上个月" @click="changeMonth(-1)">‹</button>
            <strong>{{ calendarTitle }}</strong>
            <button type="button" aria-label="下个月" @click="changeMonth(1)">›</button>
          </div>
        </div>
        <div class="calendar-grid">
          <div v-for="weekday in weekdays" :key="weekday" class="calendar-weekday">{{ weekday }}</div>
          <button
            v-for="day in calendarDays"
            :key="day.key"
            class="calendar-day"
            :class="{ 'is-outside': !day.isCurrentMonth, 'has-session': day.session, 'is-selected': day.key === selectedDateKey }"
            type="button"
            :disabled="!day.session"
            @click="selectSession(day.key)"
          >
            <span>{{ day.date.getDate() }}</span>
            <span v-if="day.session" class="day-meta">{{ day.session.laps.length }}组</span>
          </button>
        </div>

        <div v-if="selectedSession" class="session-detail">
          <div class="panel-heading">
            <h2>{{ selectedSession.date }}</h2>
            <p>{{ selectedSession.laps.length }} 组，最快 {{ fastestPace }}/km</p>
          </div>
          <table class="session-table">
            <thead>
              <tr><th>组号</th><th>时间</th><th>平均配速</th><th>评级</th></tr>
            </thead>
            <tbody>
              <tr v-for="(lap, index) in selectedSession.laps" :key="`${selectedSession.date}-${index}`">
                <td>{{ index + 1 }}</td>
                <td>{{ lap.time }}</td>
                <td>{{ lap.pace }}/km</td>
                <td><span class="rating-badge" :class="ratingClass(lap.rating)">{{ lap.rating }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  formatDateKey,
  getSessionDateKey,
  intervalTrainingSessions,
  normalizeSessions,
  parseSessionDate,
  ratingOrder,
  secondsToPace,
  weekdays
} from '../data/intervalTraining'

const STORAGE_KEY = 'zentrixIntervalTrainingData'
const colors = ['#2563eb', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#334155']
const selectedDateKey = ref('')
const chartSelectedDateKeys = ref([])
const hoveredDot = ref(null)
const calendarCursor = ref(new Date())
const sessions = ref(normalizeSessions(intervalTrainingSessions))

const sessionMap = computed(() => new Map(sessions.value.map((session) => [getSessionDateKey(session), session])))
const selectedSession = computed(() => sessionMap.value.get(selectedDateKey.value))
const chartDateOptions = computed(() => sessions.value.map((session) => ({
  key: getSessionDateKey(session),
  label: session.date.split('（')[0]
})))
const chartSessions = computed(() => {
  const selectedKeys = new Set(chartSelectedDateKeys.value)
  return sessions.value.filter((session) => selectedKeys.has(getSessionDateKey(session)))
})

const allLaps = computed(() => sessions.value.flatMap((session) => session.laps))

const stats = computed(() => ({
  sessions: sessions.value.length,
  laps: allLaps.value.length,
  avgPace: allLaps.value.length
    ? secondsToPace(allLaps.value.reduce((sum, lap) => sum + lap.paceSeconds, 0) / allLaps.value.length)
    : '-',
  excellent: allLaps.value.filter((lap) => lap.rating === '优秀').length
}))

const fastestPace = computed(() => {
  if (!selectedSession.value) return '-'
  return secondsToPace(Math.min(...selectedSession.value.laps.map((lap) => lap.paceSeconds)))
})

const calendarTitle = computed(() => `${calendarCursor.value.getFullYear()}年${calendarCursor.value.getMonth() + 1}月`)

const calendarDays = computed(() => {
  const year = calendarCursor.value.getFullYear()
  const month = calendarCursor.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(year, month, 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const key = formatDateKey(date)
    return {
      key,
      date,
      isCurrentMonth: date.getMonth() === month,
      session: sessionMap.value.get(key)
    }
  })
})

const chartTooltip = computed(() => {
  if (!hoveredDot.value) return null

  const tooltipWidth = 156
  const x = Math.min(hoveredDot.value.x + 12, 760 - tooltipWidth - 8)
  const y = Math.max(hoveredDot.value.y - 76, 8)

  return {
    x,
    y,
    lines: hoveredDot.value.title.split(' ')
  }
})

const chart = computed(() => {
  const width = 760
  const height = 300
  const left = 52
  const right = 22
  const top = 24
  const bottom = 42
  const trendSessions = chartSessions.value
  const trendLaps = trendSessions.flatMap((session) => session.laps)
  const maxLaps = Math.max(...trendSessions.map((session) => session.laps.length), 1)
  const values = trendLaps.map((lap) => lap.paceSeconds)
  const min = values.length ? Math.min(...values) - 8 : 0
  const max = values.length ? Math.max(...values) + 8 : 1
  const xStep = (width - left - right) / Math.max(maxLaps - 1, 1)
  const x = (index) => left + index * xStep
  const y = (pace) => top + ((pace - min) / (max - min)) * (height - top - bottom)

  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    yGridLines: [min, (min + max) / 2, max].map((value) => ({ key: `y-${value}`, y: y(value) })),
    xGridLines: Array.from({ length: maxLaps }, (_, index) => ({ key: `x-${index}`, x: x(index) })),
    yLabels: [min, (min + max) / 2, max].map((value) => ({ text: secondsToPace(value), y: y(value) + 4 })),
    xLabels: Array.from({ length: maxLaps }, (_, index) => ({ text: String(index + 1), x: x(index) })),
    lines: trendSessions.map((session, sessionIndex) => ({
      key: session.date,
      label: session.date.split('（')[0],
      color: colors[sessionIndex % colors.length],
      points: session.laps.map((lap, index) => `${x(index)},${y(lap.paceSeconds)}`).join(' ')
    })),
    dots: trendSessions.flatMap((session, sessionIndex) => session.laps.map((lap, index) => ({
      key: `${session.date}-${index}`,
      x: x(index),
      y: y(lap.paceSeconds),
      color: colors[sessionIndex % colors.length],
      title: `${session.date} 第${index + 1}组 ${lap.pace}/km`
    })))
  }
})

const ratingRows = computed(() => {
  const counts = allLaps.value.reduce((acc, lap) => {
    acc[lap.rating] = (acc[lap.rating] || 0) + 1
    return acc
  }, {})
  const max = Math.max(...Object.values(counts), 1)

  return ratingOrder
    .filter((rating) => counts[rating])
    .map((rating) => ({ rating, count: counts[rating], percent: (counts[rating] / max) * 100 }))
})

const syncSelectedSession = () => {
  if (selectedSession.value) return
  const latest = sessions.value[0]
  selectedDateKey.value = latest ? getSessionDateKey(latest) : ''
  const date = latest ? parseSessionDate(latest.date) : new Date()
  calendarCursor.value = new Date(date.getFullYear(), date.getMonth(), 1)
}

const syncChartSelection = () => {
  const availableKeys = new Set(sessions.value.map(getSessionDateKey))
  chartSelectedDateKeys.value = chartSelectedDateKeys.value.filter((key) => availableKeys.has(key))

  if (chartSelectedDateKeys.value.length === 0 && sessions.value.length > 0) {
    chartSelectedDateKeys.value = [getSessionDateKey(sessions.value[0])]
  }
}

const selectLatestChartSession = () => {
  chartSelectedDateKeys.value = sessions.value.length ? [getSessionDateKey(sessions.value[0])] : []
}

const selectAllChartSessions = () => {
  chartSelectedDateKeys.value = sessions.value.map(getSessionDateKey)
}

const toggleChartSession = (dateKey) => {
  if (chartSelectedDateKeys.value.includes(dateKey)) {
    chartSelectedDateKeys.value = chartSelectedDateKeys.value.filter((key) => key !== dateKey)
  } else {
    chartSelectedDateKeys.value = [...chartSelectedDateKeys.value, dateKey]
  }
}

const selectSession = (dateKey) => {
  selectedDateKey.value = dateKey
}

const changeMonth = (offset) => {
  calendarCursor.value = new Date(calendarCursor.value.getFullYear(), calendarCursor.value.getMonth() + offset, 1)
}

const ratingClass = (rating) => ({
  'rating-very-fast': rating === '非常快',
  'rating-faster': rating === '比较快',
  'rating-fast': rating === '有点快',
  'rating-excellent': rating === '优秀',
  'rating-good': rating === '良',
  'rating-normal': rating === '一般',
  'rating-bad': rating === '差',
  'rating-very-bad': rating === '很差'
})

const saveToLocalStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
}

const loadFromLocalStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return

  try {
    sessions.value = normalizeSessions(JSON.parse(saved))
  } catch {
    sessions.value = normalizeSessions(intervalTrainingSessions)
  }
}

watch(sessions, () => {
  saveToLocalStorage()
  syncSelectedSession()
  syncChartSelection()
}, { deep: true })

onMounted(() => {
  loadFromLocalStorage()
  syncSelectedSession()
  syncChartSelection()
})
</script>
