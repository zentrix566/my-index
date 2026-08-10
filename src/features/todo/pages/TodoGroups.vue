<template>
  <section class="todo-app">
    <TodoSidebar :lists="lists" @new-group="openCreate" />

    <div class="todo-main">
      <p v-if="loadError" class="todo-error">{{ loadError }}</p>

      <header class="todo-header">
        <div>
          <h1 class="todo-title">分组设置</h1>
          <div class="todo-date">共 {{ lists.length }} 个分组 · 默认提供「工作 / 学习 / 生活」，可自由增删改</div>
        </div>
        <div class="todo-actions">
          <button
            class="todo-btn"
            type="button"
            :disabled="busyRestore || !missingDefaults.length"
            :title="missingDefaults.length ? `补齐：${missingDefaults.join('、')}` : '默认分组已齐全'"
            @click="restoreDefaults"
          >
            ♻️ 恢复默认分组
          </button>
          <button class="todo-btn primary" type="button" @click="openCreate">＋ 新建分组</button>
        </div>
      </header>

      <!-- 分组卡片 -->
      <div class="todo-grp-grid">
        <article
          v-for="l in lists"
          :key="l.id"
          class="todo-grp-card"
          :style="{ '--grp-color': l.color || '#3b82f6' }"
        >
          <div class="todo-grp-bar"></div>
          <div class="todo-grp-body">
            <div class="todo-grp-head">
              <span class="todo-grp-ico">{{ l.icon || '📁' }}</span>
              <div class="todo-grp-meta">
                <RouterLink :to="`/todo/list/${l.id}`" class="todo-grp-name">{{ l.name }}</RouterLink>
                <div class="todo-grp-stat">
                  待办 <b>{{ statOf(l.id).pending }}</b>
                  · 已完成 <b>{{ statOf(l.id).done }}</b>
                </div>
              </div>
            </div>
            <div class="todo-grp-actions">
              <button class="todo-btn ghost small" type="button" @click="openEdit(l)">编辑</button>
              <button class="todo-btn ghost small danger" type="button" @click="removeList(l)">删除</button>
            </div>
          </div>
        </article>

        <!-- 未分组（伪分组，不可删） -->
        <article class="todo-grp-card is-none" style="--grp-color: #94a3b8">
          <div class="todo-grp-bar"></div>
          <div class="todo-grp-body">
            <div class="todo-grp-head">
              <span class="todo-grp-ico">🗂️</span>
              <div class="todo-grp-meta">
                <span class="todo-grp-name plain">未分组</span>
                <div class="todo-grp-stat">
                  待办 <b>{{ statOf(null).pending }}</b>
                  · 已完成 <b>{{ statOf(null).done }}</b>
                </div>
              </div>
            </div>
            <div class="todo-grp-actions">
              <span class="todo-grp-tip">系统默认，不可删除</span>
            </div>
          </div>
        </article>
      </div>

      <p class="todo-grp-note">删除分组不会删除任务，组内任务会自动移到「未分组」。</p>
    </div>

    <!-- 新建 / 编辑分组弹窗 -->
    <div v-if="modal" class="todo-modal-mask" @click.self="modal = false">
      <div class="todo-modal">
        <h3>{{ editingId ? '编辑分组' : '新建分组' }}</h3>
        <div class="todo-field">
          <label>名称</label>
          <input
            v-model="form.name"
            class="todo-input"
            maxlength="20"
            placeholder="如：工作、学习、生活"
            @keyup.enter="submit"
          />
        </div>
        <div class="todo-field">
          <label>图标</label>
          <div class="todo-ico-row">
            <span
              v-for="i in icons"
              :key="i"
              class="todo-ico-pick"
              :class="{ sel: form.icon === i }"
              @click="form.icon = i"
            >{{ i }}</span>
          </div>
          <input v-model="form.icon" class="todo-input" maxlength="4" placeholder="也可直接粘贴 emoji" />
        </div>
        <div class="todo-field">
          <label>颜色</label>
          <div class="todo-color-row">
            <span
              v-for="c in colors"
              :key="c"
              class="todo-color-dot"
              :class="{ sel: form.color === c }"
              :style="{ background: c }"
              @click="form.color = c"
            ></span>
          </div>
        </div>
        <p v-if="formError" class="todo-error">{{ formError }}</p>
        <div class="todo-modal-actions">
          <button class="todo-btn ghost" type="button" @click="modal = false">取消</button>
          <button class="todo-btn primary" type="button" :disabled="busy" @click="submit">
            {{ editingId ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="toastMsg" class="todo-toast">{{ toastMsg }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import { clearLastListId } from '../utils/lastList.js'

const router = useRouter()
const { user, init } = useAuth()

const DEFAULT_NAMES = ['工作', '学习', '生活']
const colors = ['#3b82f6', '#ef4444', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']
const icons = ['📁', '💼', '📚', '🏡', '🎯', '💪', '🛒', '💰', '✈️', '🎮', '❤️', '📌']

const lists = ref([])
const tasks = ref([])
const loadError = ref('')

const missingDefaults = computed(() => {
  const have = new Set(lists.value.map((l) => l.name))
  return DEFAULT_NAMES.filter((n) => !have.has(n))
})

/** 某分组下的待办 / 已完成数量；listId 传 null 表示「未分组」 */
function statOf(listId) {
  let pending = 0
  let done = 0
  for (const t of tasks.value) {
    const matched = listId === null ? !t.listId : t.listId === listId
    if (!matched) continue
    if (t.status === 'done') done += 1
    else pending += 1
  }
  return { pending, done }
}

const toastMsg = ref('')
let toastTimer = null
function toast(msg) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2500)
}

async function loadLists() {
  const r = await todoApi.listLists()
  lists.value = r.lists || []
}
async function loadTasks() {
  const r = await todoApi.listTasks('all')
  tasks.value = r.tasks || []
}

// ===== 新建 / 编辑 =====
const modal = ref(false)
const editingId = ref(null)
const busy = ref(false)
const formError = ref('')
const form = ref({ name: '', icon: '📁', color: '#3b82f6' })

function openCreate() {
  editingId.value = null
  formError.value = ''
  form.value = { name: '', icon: '📁', color: '#3b82f6' }
  modal.value = true
}
function openEdit(l) {
  editingId.value = l.id
  formError.value = ''
  form.value = { name: l.name, icon: l.icon || '📁', color: l.color || '#3b82f6' }
  modal.value = true
}

async function submit() {
  const name = form.value.name.trim()
  if (!name) {
    formError.value = '请输入分组名称'
    return
  }
  busy.value = true
  formError.value = ''
  const payload = { name, icon: form.value.icon || '📁', color: form.value.color }
  try {
    if (editingId.value) {
      await todoApi.updateList(editingId.value, payload)
      toast('已保存')
    } else {
      await todoApi.createList(payload)
      toast('已创建')
    }
    modal.value = false
    await loadLists()
  } catch (e) {
    formError.value = e.message
  } finally {
    busy.value = false
  }
}

async function removeList(l) {
  const s = statOf(l.id)
  const total = s.pending + s.done
  const extra = total ? `\n该组下 ${total} 个任务不会被删除，将移到「未分组」。` : ''
  if (!confirm(`确定删除分组「${l.name}」？${extra}`)) return
  try {
    await todoApi.deleteList(l.id)
    clearLastListId(l.id)
    await Promise.all([loadLists(), loadTasks()])
    toast('已删除')
  } catch (e) {
    toast(e.message)
  }
}

const busyRestore = ref(false)
async function restoreDefaults() {
  busyRestore.value = true
  try {
    const r = await todoApi.restoreDefaultLists()
    lists.value = r.lists || []
    toast('默认分组已补齐')
  } catch (e) {
    toast(e.message)
  } finally {
    busyRestore.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login?redirect=/todo/groups&source=todo')
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
.todo-grp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.todo-grp-card {
  background: var(--todo-panel);
  border: 1px solid var(--todo-border);
  border-radius: var(--todo-radius);
  box-shadow: var(--todo-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s, transform 0.15s;
}
.todo-grp-card:hover {
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.1);
  transform: translateY(-1px);
}
.todo-grp-card.is-none {
  border-style: dashed;
  background: transparent;
  box-shadow: none;
}
.todo-grp-bar {
  height: 4px;
  background: var(--grp-color);
}
.todo-grp-body {
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.todo-grp-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.todo-grp-ico {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(148, 163, 184, 0.14);
  background: color-mix(in srgb, var(--grp-color) 14%, transparent);
}
.todo-grp-meta {
  min-width: 0;
}
.todo-grp-name {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--todo-text);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.todo-grp-name:hover { color: var(--grp-color); }
.todo-grp-name.plain { cursor: default; }
.todo-grp-stat {
  font-size: 12px;
  color: var(--todo-text-soft);
  margin-top: 3px;
}
.todo-grp-stat b {
  color: var(--todo-text);
  font-variant-numeric: tabular-nums;
}
.todo-grp-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  align-items: center;
}
.todo-grp-tip {
  font-size: 12px;
  color: var(--todo-text-faint);
}
.todo-btn.small {
  padding: 5px 12px;
  font-size: 12px;
}
.todo-btn.danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.28);
}
.todo-btn.danger:hover {
  background: rgba(220, 38, 38, 0.08);
}
.todo-grp-note {
  margin-top: 16px;
  font-size: 12px;
  color: var(--todo-text-faint);
}

/* 图标选择 */
.todo-ico-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.todo-ico-pick {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--todo-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.12s;
}
.todo-ico-pick:hover { border-color: var(--todo-primary); }
.todo-ico-pick.sel {
  border-color: var(--todo-primary);
  background: var(--todo-primary-soft);
}
</style>
