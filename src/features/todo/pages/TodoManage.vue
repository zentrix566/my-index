<template>
  <section class="todo-app">
    <TodoSidebar :lists="lists" @new-group="groupModal?.open()" />

    <div class="todo-main">
      <p v-if="loadError" class="todo-error">{{ loadError }}</p>
      <header class="todo-header">
        <div>
          <h1 class="todo-title">日程管理</h1>
          <div class="todo-date">全部记录 · 共 {{ filteredTasks.length }} 项（未完成 {{ activeCount }} / 已完成 {{ doneCount }} / 已取消 {{ cancelledCount }}）</div>
        </div>
        <div class="todo-actions">
          <button class="todo-btn" type="button" :disabled="!filteredTasks.length" @click="exportExcel">📤 导出 Excel</button>
          <button class="todo-btn primary" type="button" @click="openNewTask">＋ 新建</button>
        </div>
      </header>

      <!-- 筛选条 -->
      <div class="todo-filters">
        <label class="todo-filter">
          起
          <input type="date" v-model="filterFrom" class="todo-input" />
        </label>
        <label class="todo-filter">
          止
          <input type="date" v-model="filterTo" class="todo-input" />
        </label>
        <label class="todo-filter">
          状态
          <select v-model="filterStatus" class="todo-select">
            <option value="all">全部</option>
            <option v-for="s in TASK_STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
        <label class="todo-filter">
          分组
          <select v-model="filterList" class="todo-select">
            <option value="">全部分组</option>
            <option v-for="l in lists" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </label>
        <button v-if="hasFilter" class="todo-btn ghost small" type="button" @click="resetFilters">清除筛选</button>
      </div>

      <!-- 表格 -->
      <div v-if="filteredTasks.length" class="todo-table-wrap">
        <table class="todo-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>时间</th>
              <th>标题</th>
              <th>分类</th>
              <th>备注</th>
              <th>优先级</th>
              <th>状态</th>
              <th>完成日期</th>
              <th class="todo-th-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in filteredTasks" :key="t.id" :class="'status-' + t.status">
              <td class="todo-td-date">{{ t.dueDate || '—' }}</td>
              <td>{{ doneTime(t) }}</td>
              <td class="todo-td-title">{{ t.title }}</td>
              <td>
                <span v-if="t.listId && listMap.get(t.listId)" class="todo-tag list">{{ listMap.get(t.listId).name }}</span>
                <span v-else class="todo-text-faint">未分组</span>
              </td>
              <td class="todo-td-note">{{ t.note || '—' }}</td>
              <td>
                <span class="todo-tag" :class="'prio-' + t.priority">{{ prioLabel[t.priority] }}</span>
              </td>
              <td>
                <select class="todo-status-select" :value="t.status" :style="statusStyle(t.status)" @change="setStatus(t, $event.target.value)">
                  <option v-for="s in TASK_STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </td>
              <td class="todo-td-date">{{ doneDate(t) }}</td>
              <td class="todo-th-actions">
                <button class="todo-icon-btn" type="button" title="编辑" @click="editTask(t)">✎</button>
                <button class="todo-icon-btn danger" type="button" title="删除" @click="removeTask(t)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="todo-empty">
        <span class="todo-empty-emoji">🗂️</span>
        <p>没有符合条件的记录，调整筛选或新建一个任务吧</p>
      </div>
    </div>

    <!-- 编辑 / 新建弹窗 -->
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import TodoNewGroupModal from '../components/TodoNewGroupModal.vue'
import { getLastListId, setLastListId } from '../utils/lastList.js'
import { TASK_STATUS_LIST, statusStyle, TASK_STATUS_META, TASK_STATUS_WEIGHT } from '../constants.js'

const router = useRouter()
const { user, init } = useAuth()

const lists = ref([])
const listMap = computed(() => new Map(lists.value.map((l) => [l.id, l])))
const tasks = ref([])
const loadError = ref('')
const prioLabel = { low: '低', medium: '中', high: '高' }

// 筛选条件
const filterFrom = ref('')
const filterTo = ref('')
const filterStatus = ref('all')
const filterList = ref('')

const hasFilter = computed(
  () => !!(filterFrom.value || filterTo.value || filterStatus.value !== 'all' || filterList.value)
)
function resetFilters() {
  filterFrom.value = ''
  filterTo.value = ''
  filterStatus.value = 'all'
  filterList.value = ''
}

const activeCount = computed(() =>
  filteredTasks.value.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length
)
const doneCount = computed(() => filteredTasks.value.filter((t) => t.status === 'done').length)
const cancelledCount = computed(() => filteredTasks.value.filter((t) => t.status === 'cancelled').length)

const filteredTasks = computed(() => {
  const from = filterFrom.value
  const to = filterTo.value
  const rows = tasks.value.filter((t) => {
    if (filterStatus.value !== 'all' && t.status !== filterStatus.value) return false
    if (filterList.value && String(t.listId) !== String(filterList.value)) return false
    const d = t.dueDate || ''
    if (from && d && d < from) return false
    if (to && d && d > to) return false
    return true
  })
  // 按日期升序、状态权重（未完成在前、已取消在后）、再按标题
  return rows.sort((a, b) => {
    const da = a.dueDate || '9999-99-99'
    const db = b.dueDate || '9999-99-99'
    if (da !== db) return da < db ? -1 : 1
    const wa = TASK_STATUS_WEIGHT[a.status] ?? 99
    const wb = TASK_STATUS_WEIGHT[b.status] ?? 99
    if (wa !== wb) return wa - wb
    return a.title.localeCompare(b.title, 'zh')
  })
})

// 日期 / 时间格式化
function pad(n) { return String(n).padStart(2, '0') }
function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function doneDate(t) { return t.status === 'done' ? fmtDate(t.completedAt) : '—' }
function doneTime(t) { return t.status === 'done' ? fmtTime(t.completedAt) : '—' }

// 导出 Excel
function exportExcel() {
  if (!filteredTasks.value.length) return toast('没有可导出的记录')
  const rows = filteredTasks.value.map((t) => ({
    日期: t.dueDate || '',
    时间: doneTime(t),
    标题: t.title,
    分类: (t.listId && listMap.value.get(t.listId)?.name) || '未分组',
    备注: t.note || '',
    优先级: prioLabel[t.priority],
    状态: TASK_STATUS_META[t.status]?.label || t.status,
    完成日期: doneDate(t)
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '日程管理')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `todo-manage-${stamp}.xlsx`)
  toast('已导出 Excel')
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
async function loadTasks() {
  try {
    const r = await todoApi.listTasks('all')
    tasks.value = r.tasks || []
  } catch (e) {
    loadError.value = e.message
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

async function setStatus(t, next) {
  const prev = t.status
  t.status = next
  try {
    const r = await todoApi.updateTask(t.id, { status: next })
    Object.assign(t, r.task)
    toast(`已设为「${TASK_STATUS_META[next].label}」`)
  } catch (e) {
    t.status = prev
    toast(e.message)
  }
}

// 编辑弹窗
const taskModal = ref(false)
const editingId = ref(null)
const taskBusy = ref(false)
const taskError = ref('')
const form = ref({ title: '', note: '', dueDate: '', priority: 'medium', status: 'pending', listId: '' })

function openNewTask() {
  editingId.value = null
  taskError.value = ''
  form.value = { title: '', note: '', dueDate: '', priority: 'medium', status: 'pending', listId: filterList.value ? Number(filterList.value) : getLastListId() }
  taskModal.value = true
}
function editTask(t) {
  editingId.value = t.id
  taskError.value = ''
  form.value = { title: t.title, note: t.note || '', dueDate: t.dueDate || '', priority: t.priority, status: t.status || 'pending', listId: t.listId || '' }
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

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login?redirect=/todo/manage&source=todo')
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
/* 筛选条 */
.todo-filters {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: flex-end;
  margin-bottom: 18px;
}
.todo-filter {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--todo-text-soft);
  font-weight: 600;
}
.todo-filter .todo-input,
.todo-filter .todo-select { width: auto; min-width: 150px; }

/* 表格 */
.todo-table-wrap {
  background: var(--todo-panel);
  border: 1px solid var(--todo-border);
  border-radius: var(--todo-radius);
  box-shadow: var(--todo-shadow);
  overflow-x: auto;
}
.todo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 760px;
}
.todo-table thead th {
  text-align: left;
  padding: 12px 14px;
  background: #f7f9fc;
  color: var(--todo-text-soft);
  font-weight: 600;
  border-bottom: 1px solid var(--todo-border);
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.todo-table tbody td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--todo-border);
  vertical-align: top;
  color: var(--todo-text);
}
.todo-table tbody tr:last-child td { border-bottom: none; }
.todo-table tbody tr:hover { background: #f9fbfe; }
.todo-table tbody tr.done,
.todo-table tbody tr.status-done { color: var(--todo-text-faint); }
.todo-table tbody tr.status-cancelled { color: var(--todo-text-faint); text-decoration: line-through; }
.todo-td-title { font-weight: 600; min-width: 160px; }
.todo-td-note { color: var(--todo-text-soft); max-width: 280px; white-space: pre-wrap; word-break: break-word; }
.todo-td-date { white-space: nowrap; }
.todo-th-actions { white-space: nowrap; text-align: right; }
.todo-table tbody tr .todo-th-actions { text-align: right; }
.todo-text-faint { color: var(--todo-text-faint); }

.todo-status {
  display: inline-block;
  padding: 1px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.todo-status.is-done { background: #e7f6ec; color: var(--todo-success); }
.todo-status.is-pending { background: #eef2f7; color: #64748b; }

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
</style>
