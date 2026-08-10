<template>
  <section class="todo-app">
    <TodoSidebar :lists="lists" @new-group="groupModal?.open()" />

    <div class="todo-main">
      <p v-if="loadError" class="todo-error">{{ loadError }}</p>

      <!-- 顶部控制栏 -->
      <header class="todo-cal-topbar">
        <div class="todo-cal-month-ctrl">
          <button class="todo-btn small" type="button" @click="shift(-1)">‹</button>
          <strong class="todo-cal-month-label">{{ headLabel }}</strong>
          <button class="todo-btn small" type="button" @click="shift(1)">›</button>
          <button class="todo-btn small ghost" type="button" @click="goToday">今天</button>
        </div>
        <div class="todo-cal-topbar-right">
          <div class="todo-cal-segment">
            <button type="button" :class="{ active: mode === 'week' }" @click="switchMode('week')">周</button>
            <button type="button" :class="{ active: mode === 'month' }" @click="switchMode('month')">月</button>
          </div>
          <button class="todo-btn primary" type="button" @click="openNewTaskForToday">＋ 添加日程</button>
        </div>
      </header>

      <!-- 月份统计摘要 -->
      <div class="todo-cal-summary" v-if="periodStats">
        <span class="sum-item">
          <i class="sum-dot pending"></i>待办 <b>{{ periodStats.pending }}</b>
        </span>
        <span class="sum-item">
          <i class="sum-dot done"></i>已完成 <b>{{ periodStats.done }}</b>
        </span>
        <span class="sum-item">
          <i class="sum-dot total"></i>合计 <b>{{ periodStats.total }}</b>
        </span>
        <span class="sum-item rate" v-if="periodStats.total > 0">
          完成率 <b>{{ Math.round((periodStats.done / periodStats.total) * 100) }}%</b>
        </span>
      </div>

      <!-- 月视图 -->
      <section v-if="mode === 'month'" class="todo-cal-section">
        <div class="todo-cal-month-card">
          <div class="todo-cal-month-card-title">{{ monthLabel }}</div>
          <div class="todo-cal-week-header">
            <span v-for="d in dow" :key="d" :class="{ weekend: d === '日' || d === '六' }">{{ d }}</span>
          </div>
          <div class="todo-cal-grid">
            <div
              v-for="c in cells"
              :key="c.key"
              class="todo-cal-cell"
              :class="{
                out: c.isOut,
                today: c.key === todayKey,
                weekend: c.isWeekend && !c.isOut,
                past: c.isPast && !c.isOut,
                'all-done': c.tasks.length > 0 && c.tasks.every(t => t.status === 'done'),
                'has-pending': c.tasks.some(t => t.status === 'pending')
              }"
              @click="selectDay(c.key)"
            >
              <div class="todo-cal-cell-head">
                <span class="todo-cal-daynum">{{ c.day }}</span>
                <span v-if="c.tasks.length" class="todo-cal-badge">{{ c.tasks.length }}</span>
              </div>
              <div v-if="c.tasks && c.tasks.length" class="todo-cal-task-list">
                <div
                  v-for="t in c.tasks.slice(0, 2)"
                  :key="t.id"
                  class="todo-cal-task"
                  :class="{ done: t.status === 'done' }"
                >
                  <i class="todo-cal-task-dot" :class="t.status"></i>
                  <span class="todo-cal-task-text">{{ t.title }}</span>
                </div>
                <div v-if="c.tasks.length > 2" class="todo-cal-more">+{{ c.tasks.length - 2 }} 更多</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 图例 -->
        <div class="todo-cal-legend">
          <span><i class="dot today"></i>今天</span>
          <span><i class="dot weekend"></i>周末</span>
          <span><i class="dot past"></i>已过去</span>
          <span><i class="dot pending"></i>待办</span>
          <span><i class="dot done"></i>已完成</span>
        </div>
      </section>

      <!-- 周视图 -->
      <section v-else class="todo-cal-section">
        <div class="todo-cal-week-grid">
          <div
            v-for="d in weekDays"
            :key="d.key"
            class="todo-cal-week-day"
            :class="{
              today: d.key === todayKey,
              weekend: d.isWeekend,
              past: d.isPast
            }"
            @click="selectDay(d.key)"
          >
            <div class="todo-cal-week-date">
              <span class="todo-cal-week-dow">{{ d.dowLabel }}</span>
              <span class="todo-cal-week-num">{{ d.dayNum }}</span>
            </div>
            <div v-if="d.tasks.length" class="todo-cal-week-list">
              <div
                v-for="t in d.tasks"
                :key="t.id"
                class="todo-cal-week-item"
                :class="{ done: t.status === 'done' }"
              >
                <i class="todo-cal-task-dot" :class="t.status"></i>
                <span>{{ t.title }}</span>
              </div>
            </div>
            <div v-else class="todo-cal-week-empty">无日程</div>
          </div>
        </div>
      </section>
    </div>

    <!-- 单日详情弹窗 -->
    <div v-if="selectedDate" class="todo-modal-mask" @click.self="selectedDate = null">
      <div class="todo-modal todo-day-modal">
        <div class="todo-modal-header">
          <h3>{{ fmtDateCn(selectedDate) }} 的日程</h3>
          <button class="todo-icon-btn" type="button" @click="selectedDate = null">✕</button>
        </div>
        <div class="todo-day-actions">
          <button class="todo-btn primary small" type="button" @click="openNewTask(selectedDate)">＋ 添加日程</button>
        </div>
        <p v-if="selError" class="todo-error">{{ selError }}</p>
        <div v-if="dayTasks.length" class="todo-task-list">
          <div v-for="t in dayTasks" :key="t.id" class="todo-task" :class="{ done: t.status === 'done' }">
            <span class="todo-check" @click="toggleDayTask(t)">{{ t.status === 'done' ? '✓' : '' }}</span>
            <div class="todo-task-body">
              <div class="todo-task-title">{{ t.title }}</div>
              <div v-if="t.note" class="todo-task-note">{{ t.note }}</div>
              <div class="todo-task-meta">
                <span class="todo-tag" :class="'prio-' + t.priority">{{ prioLabel[t.priority] }}</span>
                <span v-if="t.listId && listMap.get(t.listId)" class="todo-tag list">{{ listMap.get(t.listId).name }}</span>
              </div>
            </div>
            <div class="todo-task-actions">
              <button class="todo-icon-btn" type="button" title="编辑" @click="editTask(t)">✎</button>
              <button class="todo-icon-btn danger" type="button" title="删除" @click="removeTask(t)">✕</button>
            </div>
          </div>
        </div>
        <div v-else class="todo-empty-hint">这一天还没有任务</div>
      </div>
    </div>

    <TodoTaskModal ref="taskModalRef" :lists="lists" @save="handleSave" />

    <TodoNewGroupModal ref="groupModal" @created="loadLists" />

    <div v-if="toastMsg" class="todo-toast">{{ toastMsg }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import TodoTaskModal from '../components/TodoTaskModal.vue'
import TodoNewGroupModal from '../components/TodoNewGroupModal.vue'

const route = useRoute()
const router = useRouter()
const { user, init } = useAuth()

const lists = ref([])
const listMap = computed(() => new Map(lists.value.map((l) => [l.id, l])))
const loadError = ref('')
const selError = ref('')
const prioLabel = { low: '低', medium: '中', high: '高' }
const dow = ['一', '二', '三', '四', '五', '六', '日']

function beijingToday() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
function beijingMonth() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}
function fmtKey(y, m, d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}`
}
/** 在 YYYY-MM-DD 上加减天数 */
function addDaysKey(key, n) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return fmtKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}
/** 取某天所在周的周一（周一为一周第一天） */
function mondayOfKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7
  return addDaysKey(key, -dow)
}
/** a - b 的天数差 */
function diffDays(a, b) {
  const toDate = (k) => {
    const [y, m, d] = k.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return Math.round((toDate(a) - toDate(b)) / 86400000)
}
function fmtDateCn(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dt.getDay()]
  return `${m}月${d}日 ${wd}`
}

function isWeekendDay(year, month, day) {
  const dt = new Date(year, month - 1, day)
  const dow = dt.getDay()
  return dow === 0 || dow === 6
}

function isPastDay(dateKey) {
  return dateKey < todayKey
}

const todayKey = beijingToday()
const month = ref(beijingMonth())
const mode = ref('week')
// 周视图锚点：今天所在周的周一
const weekAnchor = mondayOfKey(todayKey)
const weekOffset = ref(0)
const weekStartKey = computed(() => addDaysKey(weekAnchor, weekOffset.value * 7))
const monthLabel = computed(() => {
  const [y, m] = month.value.split('-')
  return `${y}年${Number(m)}月`
})
const weekLabel = computed(() => {
  const s = weekStartKey.value
  const e = addDaysKey(s, 6)
  const [sy, sm, sd] = s.split('-').map(Number)
  const [, em, ed] = e.split('-').map(Number)
  const suffix = weekOffset.value === 0 ? '（本周）' : ''
  return sm === em
    ? `${sy}年${sm}月${sd}–${ed}日${suffix}`
    : `${sy}年${sm}月${sd}日 – ${em}月${ed}日${suffix}`
})
const headLabel = computed(() => (mode.value === 'month' ? monthLabel.value : weekLabel.value))

function shift(delta) {
  if (mode.value === 'month') {
    const [y, m] = month.value.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const pad = (n) => String(n).padStart(2, '0')
    month.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  } else {
    weekOffset.value += delta
  }
}
function goToday() {
  month.value = beijingMonth()
  weekOffset.value = 0
}
/** 切换月/周视图时保持当前浏览到的时间段一致 */
function switchMode(next) {
  if (next === mode.value) return
  if (next === 'month') {
    // 以本周周四所在月份为准（ISO 惯例）
    month.value = addDaysKey(weekStartKey.value, 3).slice(0, 7)
  } else {
    const target = month.value === beijingMonth() ? todayKey : `${month.value}-01`
    weekOffset.value = diffDays(mondayOfKey(target), weekAnchor) / 7
  }
  mode.value = next
}

// 月网格
const calData = ref({})
const cells = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  // 周一为一周第一天
  const startDow = (first.getDay() + 6) % 7
  const daysInMonth = new Date(y, m, 0).getDate()
  const out = []
  const prev = new Date(y, m - 1, 0)
  for (let i = startDow - 1; i >= 0; i--) {
    const day = prev.getDate() - i
    const key = fmtKey(prev.getFullYear(), prev.getMonth() + 1, day)
    out.push({
      key, day, isOut: true,
      isWeekend: isWeekendDay(prev.getFullYear(), prev.getMonth() + 1, day),
      isPast: isPastDay(key),
      tasks: calData.value[key]?.tasks || []
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = fmtKey(y, m, d)
    out.push({
      key, day: d, isOut: false,
      isWeekend: isWeekendDay(y, m, d),
      isPast: isPastDay(key),
      tasks: calData.value[key]?.tasks || []
    })
  }
  // 补齐到 42 格（6 行）
  const nextCount = 42 - out.length
  for (let i = 1; i <= nextCount; i++) {
    const key = fmtKey(y, m + 1, i)
    out.push({
      key, day: i, isOut: true,
      isWeekend: isWeekendDay(y, m + 1, i),
      isPast: isPastDay(key),
      tasks: calData.value[key]?.tasks || []
    })
  }
  return out
})

// 当前时间段统计（月视图=本月，周视图=本周）
const periodStats = computed(() => {
  let pending = 0, done = 0
  const source = mode.value === 'month' ? cells.value.filter((c) => !c.isOut) : weekDays.value
  for (const c of source) {
    for (const t of c.tasks) {
      if (t.status === 'done') done++
      else pending++
    }
  }
  const total = pending + done
  return total > 0 ? { pending, done, total } : null
})

// 周视图：以今天所在周的周一为锚点，按 weekOffset 前后翻周
const weekDays = computed(() => {
  const start = weekStartKey.value
  const dowLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return Array.from({ length: 7 }).map((_, i) => {
    const key = addDaysKey(start, i)
    return {
      key,
      dayNum: Number(key.slice(8)),
      dowLabel: dowLabels[i],
      isWeekend: i >= 5,
      isPast: key < todayKey,
      tasks: calData.value[key]?.tasks || []
    }
  })
})

async function loadMonth() {
  try {
    const r = await todoApi.calendar(month.value)
    calData.value = r.days || {}
  } catch (e) {
    loadError.value = e.message
  }
}

/** 周视图数据：按区间拉取（跨月的周也能取全） */
async function loadWeek() {
  const from = weekStartKey.value
  const to = addDaysKey(from, 6)
  try {
    const r = await todoApi.range(from, to)
    const map = {}
    for (const t of r.tasks || []) {
      const k = t.dueDate
      if (!k) continue
      if (!map[k]) map[k] = { total: 0, done: 0, pending: 0, tasks: [] }
      map[k].tasks.push(t)
      map[k].total += 1
      if (t.status === 'done') map[k].done += 1
      else map[k].pending += 1
    }
    calData.value = map
  } catch (e) {
    loadError.value = e.message
  }
}

function loadCal() {
  loadError.value = ''
  return mode.value === 'month' ? loadMonth() : loadWeek()
}

// 单日详情
const selectedDate = ref(null)
const dayTasks = ref([])
async function selectDay(key) {
  selectedDate.value = key
  selError.value = ''
  dayTasks.value = calData.value[key]?.tasks ? [...calData.value[key].tasks] : []
}

async function refreshCal() {
  await loadCal()
  if (selectedDate.value && calData.value[selectedDate.value]) {
    dayTasks.value = [...calData.value[selectedDate.value].tasks]
  }
}

const toastMsg = ref('')
let toastTimer = null
function toast(msg) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2500)
}

async function loadLists() {
  try {
    const r = await todoApi.listLists()
    lists.value = r.lists || []
  } catch (e) {
    toast(e.message)
  }
}

async function toggleDayTask(t) {
  const next = t.status === 'done' ? 'pending' : 'done'
  const prev = t.status
  t.status = next
  try {
    await todoApi.updateTask(t.id, { status: next })
    toast(next === 'done' ? '已完成 ✓' : '已标记为待办')
    await refreshCal()
  } catch (e) {
    t.status = prev
    toast(e.message)
  }
}

async function removeTask(t) {
  if (!confirm(`确定删除「${t.title}」？`)) return
  try {
    await todoApi.deleteTask(t.id)
    toast('已删除')
    await refreshCal()
  } catch (e) {
    toast(e.message)
  }
}

const taskModalRef = ref(null)
function openNewTaskForToday() {
  // 浏览到非本周/非本月时，默认落在当前浏览的时间段起点
  if (mode.value === 'week') {
    openNewTask(weekOffset.value === 0 ? todayKey : weekStartKey.value)
  } else {
    openNewTask(month.value === beijingMonth() ? todayKey : `${month.value}-01`)
  }
}
function openNewTask(date) {
  taskModalRef.value?.open({ title: '', note: '', dueDate: date || todayKey, priority: 'medium', listId: '' })
}
function editTask(t) {
  taskModalRef.value?.open({ id: t.id, title: t.title, note: t.note || '', dueDate: t.dueDate || '', priority: t.priority, listId: t.listId || '' })
}
async function handleSave({ payload, id }) {
  try {
    if (id) {
      await todoApi.updateTask(id, payload)
      toast('已更新')
    } else {
      await todoApi.createTask(payload)
      toast('已新建')
    }
    taskModalRef.value?.markSaved()
    await refreshCal()
  } catch (e) {
    taskModalRef.value?.markError(e.message)
  }
}

watch([month, mode, weekOffset], loadCal)

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login?redirect=/todo/calendar&source=todo')
    return
  }
  try {
    await Promise.all([loadLists(), loadCal()])
  } catch (e) {
    loadError.value = e.message
  }
})
</script>

<style scoped>
/* ===== 顶部控制栏 ===== */
.todo-cal-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.todo-cal-month-ctrl {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.todo-cal-month-label {
  font-size: 18px;
  font-weight: 800;
  min-width: 100px;
  text-align: center;
  letter-spacing: 0.5px;
}
.todo-cal-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.todo-cal-segment {
  display: inline-flex;
  border: 1px solid var(--todo-border-strong);
  border-radius: 8px;
  overflow: hidden;
  background: var(--todo-panel);
}
.todo-cal-segment button {
  border: none;
  background: none;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--todo-text-soft);
  transition: all 0.15s;
}
.todo-cal-segment button.active {
  background: var(--todo-primary-soft);
  color: var(--todo-primary);
  font-weight: 700;
}

/* ===== 月份统计摘要 ===== */
.todo-cal-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 14px;
}
.todo-cal-summary .sum-item {
  font-size: 12px;
  font-weight: 600;
  background: var(--todo-panel);
  border: 1px solid var(--todo-border);
  border-radius: 999px;
  padding: 5px 12px;
  color: var(--todo-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.todo-cal-summary .sum-item b {
  color: var(--todo-primary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.todo-cal-summary .sum-item.rate b {
  color: var(--todo-success);
}
.todo-cal-summary .sum-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.todo-cal-summary .sum-dot.pending { background: var(--todo-primary); }
.todo-cal-summary .sum-dot.done { background: var(--todo-success); }
.todo-cal-summary .sum-dot.total { background: var(--todo-text-faint); }

/* ===== 日历主区域（渐变背景卡片） ===== */
.todo-cal-section {
  background: linear-gradient(180deg, var(--todo-primary-soft), var(--todo-panel) 40%);
  border: 1.5px solid var(--todo-primary);
  border-radius: 16px;
  padding: 14px 16px 16px;
}

/* ===== 月份卡片 ===== */
.todo-cal-month-card {
  background: var(--todo-panel);
  border: 1px solid var(--todo-border);
  border-radius: 12px;
  padding: 10px 10px 8px;
}
.todo-cal-month-card-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--todo-text);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

/* ===== 星期表头 ===== */
.todo-cal-week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.todo-cal-week-header span {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--todo-text-faint);
  padding: 3px 0;
}
.todo-cal-week-header span.weekend {
  color: var(--todo-primary);
}

/* ===== 月视图网格 ===== */
.todo-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

/* ===== 日期单元格 ===== */
.todo-cal-cell {
  position: relative;
  min-height: 58px;
  border: 1px solid var(--todo-border);
  border-radius: 8px;
  padding: 4px 5px;
  box-sizing: border-box;
  background: var(--todo-panel);
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  transition: all 0.15s;
}
.todo-cal-cell:hover {
  border-color: var(--todo-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
}
.todo-cal-cell.out {
  background: rgba(107, 114, 128, 0.04);
  border-style: dashed;
  border-color: var(--todo-border);
  opacity: 0.5;
}
.todo-cal-cell.weekend {
  background: var(--todo-primary-soft);
}
.todo-cal-cell.today {
  outline: 2px solid var(--todo-primary);
  outline-offset: 1px;
}
.todo-cal-cell.past {
  background: rgba(107, 114, 128, 0.06);
  border-style: dashed;
}
.todo-cal-cell.past .todo-cal-daynum {
  color: var(--todo-text-faint);
}
.todo-cal-cell.all-done {
  border-color: var(--todo-success);
  background: rgba(22, 163, 74, 0.06);
}
.todo-cal-cell.has-pending:not(.all-done) {
  border-color: var(--todo-primary);
}

/* 单元格头部（日期 + 任务数徽章） */
.todo-cal-cell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}
.todo-cal-daynum {
  font-size: 12px;
  font-weight: 700;
  color: var(--todo-text);
  line-height: 1;
}
.todo-cal-badge {
  font-size: 9px;
  font-weight: 800;
  color: #fff;
  background: var(--todo-primary);
  border-radius: 999px;
  padding: 1px 5px;
  line-height: 1.5;
  min-width: 14px;
  text-align: center;
}
.todo-cal-cell.all-done .todo-cal-badge {
  background: var(--todo-success);
}

/* 单元格内任务列表 */
.todo-cal-task-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}
.todo-cal-task {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--todo-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
}
.todo-cal-task.done {
  background: rgba(22, 163, 74, 0.08);
  color: var(--todo-success);
  opacity: 0.9;
}
.todo-cal-task-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex: 0 0 4px;
  display: inline-block;
}
.todo-cal-task-dot.pending { background: var(--todo-primary); }
.todo-cal-task-dot.done { background: var(--todo-success); }
.todo-cal-task-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
.todo-cal-more {
  font-size: 9px;
  color: var(--todo-text-faint);
  padding: 0 4px;
  font-weight: 600;
}

/* ===== 图例 ===== */
.todo-cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.todo-cal-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--todo-text-soft);
}
.todo-cal-legend i.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}
.todo-cal-legend i.today { background: var(--todo-primary); }
.todo-cal-legend i.weekend { background: var(--todo-primary-soft); border: 1px solid var(--todo-border); }
.todo-cal-legend i.past { background: rgba(107, 114, 128, 0.15); border: 1px dashed var(--todo-text-faint); }
.todo-cal-legend i.pending { background: var(--todo-primary); border-radius: 50%; }
.todo-cal-legend i.done { background: var(--todo-success); border-radius: 50%; }

/* ===== 周视图 ===== */
.todo-cal-week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.todo-cal-week-day {
  border: 1px solid var(--todo-border);
  border-radius: 10px;
  padding: 8px;
  min-height: 150px;
  background: var(--todo-panel);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.todo-cal-week-day:hover {
  border-color: var(--todo-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}
.todo-cal-week-day.today {
  outline: 2px solid var(--todo-primary);
  outline-offset: 1px;
}
.todo-cal-week-day.weekend {
  background: var(--todo-primary-soft);
}
.todo-cal-week-day.past {
  background: rgba(107, 114, 128, 0.04);
  border-style: dashed;
}
.todo-cal-week-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--todo-border);
  margin-bottom: 4px;
}
.todo-cal-week-dow {
  font-size: 11px;
  font-weight: 700;
  color: var(--todo-text-faint);
}
.todo-cal-week-num {
  font-size: 18px;
  font-weight: 800;
  color: var(--todo-text);
  line-height: 1;
}
.todo-cal-week-day.today .todo-cal-week-num {
  color: var(--todo-primary);
}
.todo-cal-week-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.todo-cal-week-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--todo-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.todo-cal-week-item.done {
  background: rgba(22, 163, 74, 0.08);
  color: var(--todo-success);
  opacity: 0.9;
}
.todo-cal-week-empty {
  font-size: 12px;
  color: var(--todo-text-faint);
  text-align: center;
  padding: 12px 0;
}

/* ===== 弹窗 ===== */
.todo-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.todo-modal-header h3 { margin: 0; font-size: 17px; }
.todo-day-actions { margin-bottom: 14px; }
.todo-day-modal { max-width: 520px; width: 100%; }

/* ===== Toast ===== */
.todo-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2329;
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 1100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* ===== 响应式 ===== */
@media (max-width: 760px) {
  .todo-cal-topbar { flex-direction: column; align-items: flex-start; }
  .todo-cal-section { padding: 12px 10px 14px; }
  .todo-cal-grid { gap: 2px; }
  .todo-cal-cell { min-height: 50px; padding: 3px 4px; }
  .todo-cal-daynum { font-size: 11px; }
  .todo-cal-task { font-size: 9px; padding: 1px 3px; }
  .todo-cal-week-grid { grid-template-columns: 1fr; }
  .todo-cal-week-day { min-height: auto; }
}
</style>
