<template>
  <section class="section page-section">
    <div class="container">
      <div class="training-header">
        <div>
          <p class="eyebrow">400m Interval</p>
          <h1>间歇训练数据看板</h1>
          <p>从原训练站迁移出的 Vue 页面，支持本地新增、导入和导出。</p>
        </div>
        <div class="training-actions">
          <button class="button primary" type="button" @click="showAddDialog = true">添加记录</button>
          <button class="button secondary" type="button" @click="exportData">导出数据</button>
          <label class="button secondary">
            导入数据
            <input type="file" accept=".json" hidden @change="importData">
          </label>
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
            <h2>配速趋势</h2>
            <p>纵轴越高表示配速越快；每条线代表一次训练。</p>
          </div>
          <div class="chart-shell">
            <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="配速趋势图">
              <line :x1="chart.left" :y1="chart.top" :x2="chart.left" :y2="chart.height - chart.bottom" stroke="#d9e1ea" />
              <line :x1="chart.left" :y1="chart.height - chart.bottom" :x2="chart.width - chart.right" :y2="chart.height - chart.bottom" stroke="#d9e1ea" />
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
              <circle v-for="dot in chart.dots" :key="dot.key" :cx="dot.x" :cy="dot.y" r="3.5" :fill="dot.color">
                <title>{{ dot.title }}</title>
              </circle>
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

    <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
      <form class="dialog-card" @submit.prevent="addSession">
        <div class="panel-heading">
          <h2>添加训练记录</h2>
          <p>每行一组，例如 01:56.90 或 01:56.90 4分52秒。</p>
        </div>
        <label>
          训练日期
          <input v-model="newSession.date" type="date" required>
        </label>
        <label>
          每组时间
          <textarea v-model="newSession.lapsText" rows="10" placeholder="01:56.90 4分52秒&#10;01:59.10 4分58秒" required></textarea>
        </label>
        <div class="dialog-actions">
          <button class="button secondary" type="button" @click="showAddDialog = false">取消</button>
          <button class="button primary" type="submit">保存</button>
        </div>
      </form>
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
  parseLapLine,
  parseSessionDate,
  ratingOrder,
  secondsToPace,
  weekdays
} from '../data/intervalTraining'

const STORAGE_KEY = 'zentrixIntervalTrainingData'
const colors = ['#2563eb', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#334155']
const showAddDialog = ref(false)
const selectedDateKey = ref('')
const calendarCursor = ref(new Date())
const sessions = ref(normalizeSessions(intervalTrainingSessions))
const newSession = ref({ date: '', lapsText: '' })

const sessionMap = computed(() => new Map(sessions.value.map((session) => [getSessionDateKey(session), session])))
const selectedSession = computed(() => sessionMap.value.get(selectedDateKey.value))

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

const chart = computed(() => {
  const width = 760
  const height = 300
  const left = 52
  const right = 22
  const top = 24
  const bottom = 42
  const maxLaps = Math.max(...sessions.value.map((session) => session.laps.length), 1)
  const values = allLaps.value.map((lap) => lap.paceSeconds)
  const min = Math.min(...values) - 8
  const max = Math.max(...values) + 8
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
    yLabels: [min, (min + max) / 2, max].map((value) => ({ text: secondsToPace(value), y: y(value) + 4 })),
    xLabels: Array.from({ length: maxLaps }, (_, index) => ({ text: String(index + 1), x: x(index) })),
    lines: sessions.value.map((session, sessionIndex) => ({
      key: session.date,
      label: session.date.split('（')[0],
      color: colors[sessionIndex % colors.length],
      points: session.laps.map((lap, index) => `${x(index)},${y(lap.paceSeconds)}`).join(' ')
    })),
    dots: sessions.value.flatMap((session, sessionIndex) => session.laps.map((lap, index) => ({
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

const addSession = () => {
  const lines = newSession.value.lapsText.split('\n').map((line) => line.trim()).filter(Boolean)
  const laps = lines.map(parseLapLine)
  if (!newSession.value.date || laps.some((lap) => !lap)) {
    alert('请检查日期和每组时间格式。')
    return
  }

  const session = normalizeSessions([{ date: newSession.value.date, laps }])[0]
  sessions.value = normalizeSessions([...sessions.value.filter((item) => getSessionDateKey(item) !== getSessionDateKey(session)), session])
  selectedDateKey.value = getSessionDateKey(session)
  const date = parseSessionDate(session.date)
  calendarCursor.value = new Date(date.getFullYear(), date.getMonth(), 1)
  newSession.value = { date: '', lapsText: '' }
  showAddDialog.value = false
}

const exportData = () => {
  const blob = new Blob([JSON.stringify(sessions.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `interval-training-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const importData = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      sessions.value = normalizeSessions(JSON.parse(reader.result))
      selectedDateKey.value = ''
      syncSelectedSession()
    } catch {
      alert('导入失败，JSON 格式不正确。')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

watch(sessions, () => {
  saveToLocalStorage()
  syncSelectedSession()
}, { deep: true })

onMounted(() => {
  loadFromLocalStorage()
  syncSelectedSession()
})
</script>
