<template>
  <section class="todo-app">
    <TodoSidebar :lists="lists" @new-group="groupModal?.open()" />

    <div class="todo-main">
      <p v-if="loadError" class="todo-error">{{ loadError }}</p>

      <header class="todo-header">
        <div>
          <h1 class="todo-title">{{ title }}</h1>
          <div v-if="showDate" class="todo-date">{{ dateLabel }}</div>
          <div v-else-if="view.startsWith('list:')" class="todo-date">共 {{ tasks.length }} 项 · 点击右上角新建</div>
        </div>
        <div class="todo-actions">
          <button v-if="view === 'today_done' && tasks.length" class="todo-btn export" type="button" @click="exportDoneCard">导出卡片</button>
          <button v-if="view === 'today_done' && tasks.length" class="todo-btn ghost" type="button" @click="pickSlogan">🔁 换一句</button>
          <button class="todo-btn primary" type="button" @click="openNewTask">＋ 新建</button>
        </div>
      </header>

      <!-- 今日已完成：卡片样式 -->
      <template v-if="view === 'today_done'">
        <div v-if="tasks.length" class="todo-done-card-wrap">
          <div class="todo-done-card" ref="doneCardRef">
            <div class="todo-done-card-head">
              <div class="todo-done-card-left">
                <span class="todo-done-head-icon">✓</span>
                <span class="todo-done-head-title">今日已完成</span>
              </div>
              <div class="todo-done-card-right">
                <span class="todo-done-head-date">{{ dateLabelFull }}</span>
                <span class="todo-done-count"><b>{{ tasks.length }}</b><small>项完成</small></span>
              </div>
            </div>
            <div class="todo-done-card-body">
              <div v-for="t in tasks" :key="t.id" class="todo-done-item">
                <span class="todo-done-check"><span class="todo-done-check-inner">✓</span></span>
                <span class="todo-done-text">{{ t.title }}</span>
              </div>
            </div>
            <div class="todo-done-card-foot">
              {{ doneSlogan }}
            </div>
          </div>
        </div>

        <div v-else class="todo-empty">
          <span class="todo-empty-emoji">🗒️</span>
          <p>{{ emptyText }}</p>
          <p class="todo-empty-hint">或去「管理 → 日程管理」查看全部任务</p>
          <button class="todo-btn primary todo-empty-action" type="button" @click="openNewTask">＋ 新建任务</button>
        </div>
      </template>

      <!-- 其它视图保持原列表 -->
      <template v-else>
        <div v-if="tasks.length" class="todo-today-layout" :class="{ 'is-today-view': view === 'today_todo' }">
          <div class="todo-task-column">
            <div v-if="view === 'today_todo'" class="todo-progress-card">
              <div class="todo-progress-copy">
                <span class="todo-progress-kicker">TODAY'S FOCUS</span>
                <strong>先完成一件最重要的事</strong>
              </div>
              <span class="todo-progress-count">{{ todayDoneCount }} / {{ todayTotal }} 已完成</span>
              <div class="todo-progress-track" aria-hidden="true"><span :style="{ width: `${todayProgress}%` }"></span></div>
            </div>
            <div class="todo-task-list">
              <div v-for="t in tasks" :key="t.id" class="todo-task" :class="'status-' + t.status">
            <!-- 今日待办：点击圆钮直接标记完成，不用下拉 -->
            <button
              v-if="view === 'today_todo'"
              class="todo-check"
              type="button"
              :class="{ done: t.status === 'done' }"
              :aria-label="t.status === 'done' ? '标记为未完成' : '标记为已完成'"
              :title="t.status === 'done' ? '标记为未完成' : '标记为已完成'"
              @click="toggleDone(t)"
            >
              <span v-if="t.status === 'done'">✓</span>
            </button>
            <select
              v-else
              class="todo-status-select"
              :value="t.status"
              :style="statusStyle(t.status)"
              @change="setStatus(t, $event.target.value)"
            >
              <option v-for="s in TASK_STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
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
          </div>

          <aside v-if="view === 'today_todo'" class="todo-overview" aria-label="今日概览">
            <div class="todo-overview-head">
              <div><span class="todo-overview-kicker">TODAY</span><h2>今日概览</h2></div>
              <span class="todo-overview-ring" :style="{ '--progress': todayProgress }">{{ todayProgress }}%</span>
            </div>
            <div class="todo-overview-stat main"><strong>{{ tasks.length }}</strong><span>待处理任务</span></div>
            <div class="todo-overview-grid">
              <div class="todo-overview-stat high"><strong>{{ priorityCounts.high }}</strong><span>高优先级</span></div>
              <div class="todo-overview-stat"><strong>{{ priorityCounts.medium }}</strong><span>中优先级</span></div>
              <div class="todo-overview-stat"><strong>{{ priorityCounts.low }}</strong><span>低优先级</span></div>
              <div class="todo-overview-stat done"><strong>{{ todayDoneCount }}</strong><span>已经完成</span></div>
            </div>
            <p class="todo-overview-tip"><span>✦</span> 从高优先级任务开始，今天会更轻松。</p>
          </aside>
        </div>

        <div v-else class="todo-empty">
          <span class="todo-empty-emoji">🗒️</span>
          <p>{{ emptyText }}</p>
          <p class="todo-empty-hint">或去「管理 → 日程管理」查看全部任务</p>
          <button class="todo-btn primary todo-empty-action" type="button" @click="openNewTask">＋ 新建任务</button>
        </div>
      </template>

      <!-- 底部装饰（仅今日待办有任务时显示） -->
      <div v-if="view === 'today_todo' && tasks.length" class="todo-bottom-deco" aria-hidden="true">
        <svg viewBox="0 0 360 80" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="deco-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#c7d2fe" stop-opacity="0"/>
              <stop offset="35%" stop-color="#a5b4fc" stop-opacity=".45"/>
              <stop offset="65%" stop-color="#a5b4fc" stop-opacity=".45"/>
              <stop offset="100%" stop-color="#c7d2fe" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="M0 55 Q45 30 90 50 T180 48 T270 52 T360 46 V80 H0 Z" fill="url(#deco-grad)"/>
          <path d="M0 62 Q60 42 120 58 T240 54 T360 60 V80 H0 Z" fill="url(#deco-grad)" opacity=".5"/>
          <circle cx="72" cy="38" r="3" fill="#a5b4fc" opacity=".35"/>
          <circle cx="148" cy="28" r="2.5" fill="#c4b5fd" opacity=".3"/>
          <circle cx="228" cy="36" r="2" fill="#a5b4fc" opacity=".25"/>
          <circle cx="296" cy="30" r="3.5" fill="#c4b5fd" opacity=".3"/>
        </svg>
      </div>
    </div>

    <!-- 新建 / 编辑任务弹窗 -->
    <div v-if="taskModal" class="todo-modal-mask" @click.self="taskModal = false">
      <div class="todo-modal">
        <h3>{{ editingId ? '编辑任务' : '新建任务' }}</h3>
        <div class="todo-field">
          <label>标题</label>
          <input v-model="form.title" class="todo-input" maxlength="200" placeholder="要做点什么？" @keyup.enter="submitTask" />
        </div>
        <div class="todo-field">
          <label>备注（可选）</label>
          <textarea v-model="form.note" class="todo-textarea" maxlength="2000" placeholder="补充说明、链接、想法…"></textarea>
        </div>
        <div class="todo-row">
          <div class="todo-field">
            <label>日期</label>
            <input v-model="form.dueDate" type="date" class="todo-input" />
          </div>
          <div class="todo-field">
            <label>优先级</label>
            <select v-model="form.priority" class="todo-select">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>
        <div class="todo-field">
          <label>分组</label>
          <select v-model="form.listId" class="todo-select">
            <option :value="''">未分组</option>
            <option v-for="l in lists" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div class="todo-field">
          <label>状态</label>
          <select v-model="form.status" class="todo-select">
            <option v-for="s in TASK_STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div v-if="form.status === 'done'" class="todo-field">
          <label>完成日期</label>
          <input v-model="form.completedDate" type="date" class="todo-input" />
        </div>
        <p v-if="taskError" class="todo-error">{{ taskError }}</p>
        <div class="todo-modal-actions">
          <button class="todo-btn ghost" type="button" @click="taskModal = false">取消</button>
          <button class="todo-btn primary" type="button" :disabled="taskBusy" @click="submitTask">保存</button>
        </div>
      </div>
    </div>

    <TodoNewGroupModal ref="groupModal" @created="loadLists" />

  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import { getAvailableLastListId, setLastListId } from '../utils/lastList.js'
import { TASK_STATUS_LIST, statusStyle, TASK_STATUS_META } from '../constants.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import TodoNewGroupModal from '../components/TodoNewGroupModal.vue'
import { useFeedback } from '../../../composables/useFeedback.js'
import { taskToCreatePayload } from '../utils/taskPayload.js'
import { useToast } from '../../../composables/useToast.js'
import { formatBeijingDateKey, formatBeijingIso } from '../../../utils/date.js'

const route = useRoute()
const router = useRouter()
const { user, init } = useAuth()

const lists = ref([])
const tasks = ref([])
const { push: pushFeedback } = useFeedback()
const loadError = ref('')

// ===== 视图与标题 =====
const view = computed(() => {
  if (route.params.listId) return `list:${route.params.listId}`
  if (route.name === 'todo-done') return 'today_done'
  return 'today_todo'
})

const listMap = computed(() => new Map(lists.value.map((l) => [l.id, l])))
const listName = computed(() => {
  if (view.value.startsWith('list:')) {
    const id = Number(view.value.slice(5))
    return lists.value.find((l) => l.id === id)?.name || '分组'
  }
  return ''
})
const title = computed(() => {
  if (view.value === 'today_done') return '今日已完成'
  if (view.value.startsWith('list:')) return listName.value
  return '今日待办'
})
const showDate = computed(() => view.value.startsWith('today_'))
const emptyText = computed(() => {
  if (view.value === 'today_done') return '今天还没有已完成的任务'
  if (view.value.startsWith('list:')) return '这个分组还没有任务，点右上角新建一个吧'
  return '今天还没有待办事项，点右上角新建一个吧'
})
const prioLabel = { low: '低', medium: '中', high: '高' }

// ===== 今日已完成卡片底部励志短句（不固定，随机轮换）=====
const DONE_SLOGANS = [
  '把每一件小事做好，就是不平凡 ☀️',
  '今天的努力，都会在未来开花 🌱',
  '完成比完美更重要 ✅',
  '一步一个脚印，走得踏实 👣',
  '你比昨天的自己更进了一步 🌟',
  '行动，是治愈焦虑的良药 💪',
  '慢慢来，比较快 🐢',
  '认真生活的人，自带光芒 ✨',
  '每一天都是新的开始 🌅',
  '小事做到极致，便是大事 🔥',
  '坚持很酷，别轻易认输 🏔️',
  '你在为自己的人生打卡 📌',
  '自律给你自由 🕊️',
  '今天也很棒，明天继续加油 🚀'
]
const doneSlogan = ref(DONE_SLOGANS[Math.floor(Math.random() * DONE_SLOGANS.length)])
function pickSlogan() {
  let next = doneSlogan.value
  while (next === doneSlogan.value && DONE_SLOGANS.length > 1) {
    next = DONE_SLOGANS[Math.floor(Math.random() * DONE_SLOGANS.length)]
  }
  doneSlogan.value = next
}

// ===== 日期（北京时间）=====
function beijingToday() {
  return formatBeijingDateKey()
}
/** 当前北京时间的 ISO 字符串（带 +08:00），与后端 nowIso() 同格式。 */
function beijingNowIso() {
  return formatBeijingIso()
}
function fmtDateCn(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dt.getDay()]
  return `${m}月${d}日 ${wd}`
}
function fmtDateFull(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dt.getDay()]
  const p = (n) => String(n).padStart(2, '0')
  return `${y}/${p(m)}/${p(d)} ${wd}`
}
const dateKey = beijingToday()
const dateLabel = fmtDateCn(dateKey)
const dateLabelFull = fmtDateFull(dateKey)
const todayDoneTasks = ref([])
const todayDoneCount = computed(() => todayDoneTasks.value.length)
const todayTotal = computed(() => tasks.value.length + todayDoneCount.value)
const todayProgress = computed(() => todayTotal.value ? Math.round((todayDoneCount.value / todayTotal.value) * 100) : 0)
const priorityCounts = computed(() => tasks.value.reduce((counts, task) => {
  const priority = ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium'
  counts[priority] += 1
  return counts
}, { high: 0, medium: 0, low: 0 }))

// ===== 轻量 toast =====
const { push: toast } = useToast()

// ===== 加载 =====
async function loadLists() {
  try {
    const r = await todoApi.listLists()
    lists.value = r.lists || []
  } catch (e) {
    toast(e.message)
  }
}
async function loadTasks() {
  try {
    const r = await todoApi.listTasks(view.value)
    // 新加入的任务（id 较大）排在最前
    tasks.value = (r.tasks || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0))
    if (view.value === 'today_todo') {
      const done = await todoApi.listTasks('today_done')
      todayDoneTasks.value = done.tasks || []
    } else {
      todayDoneTasks.value = []
    }
  } catch (e) {
    loadError.value = e.message
  }
}

const doneCardRef = ref(null)

async function exportDoneCard() {
  if (!tasks.value.length) return toast('没有可导出的已完成任务')
  if (!doneCardRef.value) return
  try {
    const exportWidth = 760
    const dataUrl = await toPng(doneCardRef.value, {
      pixelRatio: 2,
      backgroundColor: '#f4faf7',
      cacheBust: true,
      width: exportWidth,
      style: {
        width: `${exportWidth}px`,
        maxWidth: 'none',
        margin: '0',
        transform: 'none',
        boxShadow: 'none',
        borderRadius: '0',
        border: '0'
      }
    })
    const link = document.createElement('a')
    const now = new Date()
    const pad = (value, size = 2) => String(value).padStart(size, '0')
    const exportTime = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
    link.download = `todo-done-card-${dateKey.replaceAll('-', '')}-${exportTime}.png`
    link.href = dataUrl
    link.click()
    toast('已导出卡片图片')
  } catch (e) {
    toast('导出失败：' + (e?.message || '未知错误'))
  }
}

async function setStatus(t, next) {
  const prev = t.status
  const prevCompleted = t.completedAt
  t.status = next
  t.completedAt = next === 'done' ? beijingNowIso() : null
  try {
    const r = await todoApi.updateTask(t.id, { status: next })
    Object.assign(t, r.task)
    toast(`已设为「${TASK_STATUS_META[next].label}」`)
    return true
  } catch (e) {
    t.status = prev
    t.completedAt = prevCompleted
    toast(e.message)
    return false
  }
}

// 今日待办：点击圆钮在 待办 ⇄ 已完成 间切换；标记完成后移出当前列表（转到「今日已完成」）
async function toggleDone(t) {
  const becomingDone = t.status !== 'done'
  const ok = await setStatus(t, becomingDone ? 'done' : 'pending')
  if (ok && becomingDone && view.value === 'today_todo') {
    tasks.value = tasks.value.filter((x) => x.id !== t.id)
    todayDoneTasks.value.unshift(t)
  }
}

async function removeTask(t) {
  try {
    await todoApi.deleteTask(t.id)
    tasks.value = tasks.value.filter((x) => x.id !== t.id)
    pushFeedback(`已删除「${t.title}」`, {
      type: 'success',
      actionLabel: '撤销',
      action: async () => {
        await todoApi.createTask(taskToCreatePayload(t))
        await loadTasks()
        pushFeedback('任务已恢复', { type: 'success' })
      }
    })
  } catch (e) {
    pushFeedback(e.message || '删除失败', { type: 'error' })
  }
}

// ===== 任务弹窗 =====
const taskModal = ref(false)
const editingId = ref(null)
const taskBusy = ref(false)
const taskError = ref('')
const form = ref({ title: '', note: '', dueDate: dateKey, priority: 'medium', status: 'pending', listId: '', completedDate: '' })

function openNewTask() {
  editingId.value = null
  taskError.value = ''
  form.value = {
    title: '',
    note: '',
    dueDate: showDate.value ? dateKey : '',
    priority: 'medium',
    status: 'pending',
    listId: view.value.startsWith('list:')
      ? Number(view.value.slice(5))
      : getAvailableLastListId(lists.value),
    completedDate: ''
  }
  taskModal.value = true
}
function editTask(t) {
  editingId.value = t.id
  taskError.value = ''
  form.value = {
    title: t.title,
    note: t.note || '',
    dueDate: t.dueDate || '',
    priority: t.priority,
    status: t.status || 'pending',
    listId: t.listId || '',
    completedDate: t.completedAt ? t.completedAt.slice(0, 10) : ''
  }
  taskModal.value = true
}
async function submitTask() {
  if (!form.value.title.trim()) {
    taskError.value = '请输入任务标题'
    return
  }
  taskBusy.value = true
  taskError.value = ''
  const payload = {
    title: form.value.title.trim(),
    note: form.value.note || '',
    dueDate: form.value.dueDate || null,
    priority: form.value.priority,
    status: form.value.status,
    listId: form.value.listId ? Number(form.value.listId) : null,
    completedAt: form.value.status === 'done' ? form.value.completedDate || null : null
  }
  try {
    if (editingId.value) {
      const r = await todoApi.updateTask(editingId.value, payload)
      const idx = tasks.value.findIndex((x) => x.id === editingId.value)
      if (idx >= 0) tasks.value[idx] = r.task
      toast('已更新')
    } else {
      const r = await todoApi.createTask(payload)
      setLastListId(payload.listId)
      // 若当前视图应包含该任务则插入；否则仅提示
      tasks.value.unshift(r.task)
      toast('已新建')
    }
    taskModal.value = false
  } catch (e) {
    taskError.value = e.message
  } finally {
    taskBusy.value = false
  }
}

const groupModal = ref(null)

watch(
  () => view.value,
  (v) => {
    loadTasks()
    if (v === 'today_done') pickSlogan()
  }
)

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login?redirect=/todo&source=todo')
    return
  }
  try {
    await Promise.all([loadLists(), loadTasks()])
  } catch (e) {
    loadError.value = e.message
  }
})
</script>

<style scoped>
/* ===== 今日已完成卡片 ===== */
.todo-done-card-wrap {
  display: block;
  padding: 8px 0 16px;
}
.todo-done-card {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid rgba(16, 185, 129, 0.18);
  border-radius: 22px;
  box-shadow: 0 16px 38px rgba(16, 185, 129, 0.16), 0 3px 10px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.todo-done-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
  background: linear-gradient(120deg, #35b98e 0%, #4fcaa5 55%, #6fd5b6 100%);
  color: #fff;
}
.todo-done-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.todo-done-head-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex: 0 0 24px;
}
.todo-done-head-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.todo-done-card-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.todo-done-head-date {
  font-size: 13px;
  font-weight: 700;
  opacity: 0.92;
  letter-spacing: 0.2px;
}
.todo-done-count {
  min-width: 64px;
  padding: 5px 9px;
  color: #157457;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.1;
  box-shadow: 0 3px 9px rgba(15, 88, 67, 0.13);
}
.todo-done-count b { font-size: 16px; }
.todo-done-count small { margin-top: 1px; font-size: 10px; font-weight: 700; white-space: nowrap; }
.todo-done-card-body {
  padding: 20px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #fff;
}
.todo-done-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 2px;
  border-bottom: 1px solid #eaf3ef;
  font-size: 16px;
  color: #1f2937;
}
.todo-done-item:last-child { border-bottom: 0; }
.todo-done-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e6f8f0;
  border: 1.5px solid #a7e9ce;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
}
.todo-done-check-inner {
  color: #22c55e;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}
.todo-done-text {
  word-break: break-word;
  font-weight: 500;
}
.todo-done-card-foot {
  background: #f4faf7;
  color: #5e7f71;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: 13px 16px;
  letter-spacing: 0.3px;
}

.todo-actions .todo-btn.export {
  background: rgba(59, 130, 246, 0.08);
  color: var(--todo-primary);
  border-color: var(--todo-primary);
}
.todo-actions .todo-btn.export:hover {
  background: var(--todo-primary);
  color: #fff;
}

/* ===== 今日待办：让右侧留白成为概览区，而不是一整片白卡 ===== */
.todo-progress-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px 16px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border: 1px solid rgba(99, 102, 241, 0.16);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(238, 242, 255, 0.92), rgba(255, 255, 255, 0.78));
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.08);
}
.todo-progress-copy { display: flex; flex-direction: column; gap: 3px; }
.todo-progress-copy strong { font-size: 15px; color: var(--todo-text); }
.todo-progress-kicker, .todo-overview-kicker {
  color: #6366f1;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.1px;
}
.todo-progress-count { align-self: center; color: var(--todo-text-soft); font-size: 13px; font-weight: 700; }
.todo-progress-track { grid-column: 1 / -1; height: 6px; overflow: hidden; border-radius: 999px; background: rgba(99, 102, 241, 0.12); }
.todo-progress-track span { display: block; height: 100%; min-width: 0; border-radius: inherit; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.25s ease; }
.todo-overview {
  position: sticky;
  top: 82px;
  padding: 19px;
  border: 1px solid rgba(99, 102, 241, 0.13);
  border-radius: 16px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.94), rgba(244, 247, 255, 0.88));
  box-shadow: 0 12px 32px rgba(48, 65, 110, 0.1);
}
.todo-overview-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.todo-overview h2 { margin: 3px 0 0; font-size: 17px; color: var(--todo-text); }
.todo-overview-ring { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: conic-gradient(#6366f1 calc(var(--progress, 0) * 1%), #e8eaff 0); color: #4f46e5; font-size: 12px; font-weight: 800; box-shadow: inset 0 0 0 6px #fff; }
.todo-overview-stat { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 11px; border-radius: 11px; background: rgba(255, 255, 255, 0.62); }
.todo-overview-stat strong { color: var(--todo-text); font-size: 19px; line-height: 1; }
.todo-overview-stat span { color: var(--todo-text-soft); font-size: 11px; white-space: nowrap; }
.todo-overview-stat.main { margin-bottom: 10px; padding: 14px; background: linear-gradient(135deg, #6366f1, #818cf8); }
.todo-overview-stat.main strong, .todo-overview-stat.main span { color: #fff; }
.todo-overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.todo-overview-stat.high strong { color: #dc2626; }
.todo-overview-stat.done strong { color: #16a34a; }
.todo-overview-tip { margin: 15px 0 0; padding-top: 13px; border-top: 1px dashed rgba(99, 102, 241, 0.2); color: var(--todo-text-soft); font-size: 12px; line-height: 1.55; }
.todo-overview-tip span { color: #8b5cf6; font-weight: 800; }

html[data-theme='dark'] .todo-progress-card,
html[data-theme='dark'] .todo-overview { background: linear-gradient(145deg, rgba(31, 37, 50, 0.96), rgba(25, 31, 43, 0.94)); border-color: rgba(129, 140, 248, 0.2); }
html[data-theme='dark'] .todo-overview-stat { background: rgba(255, 255, 255, 0.04); }
html[data-theme='dark'] .todo-overview-ring { box-shadow: inset 0 0 0 6px #1f2530; }

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

@media (max-width: 600px) {
  .todo-done-card-wrap { padding: 4px 0 12px; }
  .todo-done-card { max-width: 100%; border-radius: 16px; }
  .todo-done-card-head { padding: 15px 16px; }
  .todo-done-head-title { font-size: 16px; }
  .todo-done-head-date { font-size: 13px; }
  .todo-done-count { min-width: 56px; padding: 4px 7px; }
  .todo-done-count b { font-size: 14px; }
  .todo-done-count small { font-size: 9px; }
  .todo-done-card-body { padding: 14px 12px; gap: 7px; }
  .todo-done-item { font-size: 15px; }
  .todo-done-card-foot { padding: 12px 14px; font-size: 12px; }
  .todo-progress-card { padding: 14px; }
  .todo-overview { position: static; padding: 16px; }
}

/* ===== 底部波浪装饰 ===== */
.todo-main {
  display: flex;
  flex-direction: column;
}
.todo-bottom-deco {
  margin-top: auto;
  padding-top: 20px;
  width: 100%;
  pointer-events: none;
}
.todo-bottom-deco svg {
  display: block;
  width: 100%;
  height: auto;
}
</style>
