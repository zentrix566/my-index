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
                <span class="todo-done-count">{{ tasks.length }}</span>
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
        </div>
      </template>

      <!-- 其它视图保持原列表 -->
      <template v-else>
        <div v-if="tasks.length" class="todo-task-list">
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
          <div class="todo-encourage">
            <span class="todo-encourage-ico" aria-hidden="true">💪</span>
            <div class="todo-encourage-body">
              <p class="todo-encourage-title">今日还有 {{ tasks.length }} 项待办</p>
              <p class="todo-encourage-sub">{{ encourageSlogan }}</p>
            </div>
          </div>
        </div>

        <div v-else class="todo-empty">
          <span class="todo-empty-emoji">🗒️</span>
          <p>{{ emptyText }}</p>
          <p class="todo-empty-hint">或去「管理 → 日程管理」查看全部任务</p>
        </div>
      </template>
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
          <div class="todo-field">
            <label>状态</label>
            <select v-model="form.status" class="todo-select">
              <option v-for="s in TASK_STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
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
        <p v-if="taskError" class="todo-error">{{ taskError }}</p>
        <div class="todo-modal-actions">
          <button class="todo-btn ghost" type="button" @click="taskModal = false">取消</button>
          <button class="todo-btn primary" type="button" :disabled="taskBusy" @click="submitTask">保存</button>
        </div>
      </div>
    </div>

    <TodoNewGroupModal ref="groupModal" @created="loadLists" />

    <div v-if="toastMsg" class="todo-toast">{{ toastMsg }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import { getLastListId, setLastListId } from '../utils/lastList.js'
import { TASK_STATUS_LIST, statusStyle, TASK_STATUS_META } from '../constants.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import TodoNewGroupModal from '../components/TodoNewGroupModal.vue'

const route = useRoute()
const router = useRouter()
const { user, init } = useAuth()

const lists = ref([])
const tasks = ref([])
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

// ===== 今日待办下方的鼓励短句 =====
const ENCOURAGE_SLOGANS = [
  '一点一点推进，每完成一项都是对自己的承诺 🌱',
  '不必急于全部搞定，先挑最容易的开始 ✨',
  '把今天的待办拆小一点，三件比一件+一件+一件更省心 🪴',
  '已完成的任务会在「今日已完成」里等着你，留下记号吧 📌',
  '别忘了给自己留几秒钟，看一眼窗外的光 ☀️'
]
const encourageSlogan = ref(ENCOURAGE_SLOGANS[Math.floor(Math.random() * ENCOURAGE_SLOGANS.length)])

// ===== 日期（北京时间）=====
function beijingToday() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
/** 当前北京时间的 ISO 字符串（带 +08:00），与后端 nowIso() 同格式。 */
function beijingNowIso() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  const pad3 = (n) => String(n).padStart(3, '0')
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad3(d.getUTCMilliseconds())}+08:00`
  )
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

// ===== 轻量 toast =====
const toastMsg = ref('')
let toastTimer = null
function toast(msg) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2500)
}

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
  } catch (e) {
    loadError.value = e.message
  }
}

const doneCardRef = ref(null)

async function exportDoneCard() {
  if (!tasks.value.length) return toast('没有可导出的已完成任务')
  if (!doneCardRef.value) return
  try {
    const dataUrl = await toPng(doneCardRef.value, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true
    })
    const link = document.createElement('a')
    link.download = `todo-done-card-${dateKey}.png`
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
  }
}

async function removeTask(t) {
  if (!confirm(`确定删除「${t.title}」？`)) return
  try {
    await todoApi.deleteTask(t.id)
    tasks.value = tasks.value.filter((x) => x.id !== t.id)
    toast('已删除')
  } catch (e) {
    toast(e.message)
  }
}

// ===== 任务弹窗 =====
const taskModal = ref(false)
const editingId = ref(null)
const taskBusy = ref(false)
const taskError = ref('')
const form = ref({ title: '', note: '', dueDate: dateKey, priority: 'medium', status: 'pending', listId: '' })

function openNewTask() {
  editingId.value = null
  taskError.value = ''
  form.value = {
    title: '',
    note: '',
    dueDate: showDate.value ? dateKey : '',
    priority: 'medium',
    status: 'pending',
    listId: view.value.startsWith('list:') ? Number(view.value.slice(5)) : getLastListId()
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
    listId: t.listId || ''
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
    listId: form.value.listId ? Number(form.value.listId) : null
  }
  try {
    if (editingId.value) {
      const r = await todoApi.updateTask(editingId.value, payload)
      const idx = tasks.value.findIndex((x) => x.id === editingId.value)
      if (idx >= 0) tasks.value[idx] = r.task
      toast('已更新')
    } else {
      const r = await todoApi.createTask(payload)
      if (payload.listId) setLastListId(payload.listId)
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
  max-width: 1100px;
  margin: 0 auto;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 28px rgba(16, 185, 129, 0.18), 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.todo-done-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #4ec199 0%, #3ba883 100%);
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
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.todo-done-card-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.todo-done-head-date {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.95;
  letter-spacing: 0.3px;
}
.todo-done-count {
  font-size: 14px;
  font-weight: 800;
  color: #3ba883;
  background: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.todo-done-card-body {
  padding: 24px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.todo-done-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #1f2937;
}
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
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: 14px 16px;
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
  .todo-done-count { width: 26px; height: 26px; font-size: 13px; }
  .todo-done-card-body { padding: 18px 16px 14px; gap: 13px; }
  .todo-done-item { font-size: 15px; }
  .todo-done-card-foot { padding: 12px 14px; font-size: 12px; }
}
</style>
