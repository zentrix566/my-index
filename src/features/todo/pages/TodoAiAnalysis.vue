<template>
  <section class="todo-app">
    <TodoSidebar :lists="lists" @new-group="groupModal?.open()" />

    <div class="todo-main">
      <p v-if="loadError" class="todo-error">{{ loadError }}</p>
      <header class="todo-header">
        <div>
          <h1 class="todo-title">日程 AI 分析</h1>
          <div class="todo-date">用内置 AI 帮你梳理日程、规划周与月</div>
        </div>
      </header>

      <div class="todo-card">
        <div class="todo-ai-scopes">
          <button
            v-for="s in scopes"
            :key="s.value"
            type="button"
            class="todo-chip"
            :class="{ active: scope === s.value }"
            @click="scope = s.value"
          >{{ s.label }}</button>
        </div>

        <div class="todo-ai-dates">
          <label v-if="scope !== 'month'">
            基准日期
            <input type="date" v-model="anchorDate" class="todo-input" />
          </label>
          <label v-else>
            月份
            <input type="month" v-model="anchorMonth" class="todo-input" />
          </label>
        </div>

        <div class="todo-actions" style="margin-top: 4px">
          <button class="todo-btn primary" type="button" :disabled="busy" @click="generate">
            {{ busy ? '分析中…' : '生成分析' }}
          </button>
          <span v-if="rangeLabel" class="todo-ai-range">{{ rangeLabel }}</span>
        </div>

        <p v-if="aiError" class="todo-error">{{ aiError }}</p>
      </div>

      <div v-if="report" class="todo-card todo-markdown" v-html="aiHtml"></div>
      <div v-else-if="!busy" class="todo-empty">
        <span class="todo-empty-emoji">🤖</span>
        <p>选择上方范围，点击「生成分析」让 AI 帮你复盘。</p>
      </div>
    </div>

    <TodoNewGroupModal ref="groupModal" @created="loadLists" />
    <div v-if="toastMsg" class="todo-toast">{{ toastMsg }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import TodoNewGroupModal from '../components/TodoNewGroupModal.vue'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const router = useRouter()
const { user, init } = useAuth()

const lists = ref([])
const loadError = ref('')
const groupModal = ref(null)

function localDateKey(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}
function localMonthKey(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}`
}

const scopes = [
  { value: 'day', label: '日程分析' },
  { value: 'week', label: '周计划' },
  { value: 'month', label: '月计划' }
]
const scope = ref('day')
const anchorDate = ref(localDateKey(new Date()))
const anchorMonth = ref(localMonthKey(new Date()))

const busy = ref(false)
const aiError = ref('')
const report = ref('')
const aiHtml = computed(() => (report.value ? md.render(report.value) : ''))

const rangeLabel = computed(() => {
  if (scope.value === 'day') return anchorDate.value
  if (scope.value === 'week') {
    // 简单展示：基准日期所在周首尾（与后端一致：周一~周日）
    const [y, m, d] = anchorDate.value.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dow = (dt.getDay() + 6) % 7
    const add = (n) => localDateKey(new Date(y, m - 1, d + n))
    return `${add(-dow)} ~ ${add(6 - dow)}`
  }
  return anchorMonth.value
})

const toastMsg = ref('')
let toastTimer = null
function toast(msg) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 2500)
}

async function generate() {
  busy.value = true
  aiError.value = ''
  report.value = ''
  try {
    const payload = { scope: scope.value }
    if (scope.value === 'day' || scope.value === 'week') payload.date = anchorDate.value
    else payload.month = anchorMonth.value
    const res = await todoApi.aiAnalyze(payload)
    report.value = res.report || ''
  } catch (err) {
    aiError.value = err.message || '分析失败，请稍后重试'
  } finally {
    busy.value = false
  }
}

async function loadLists() {
  try {
    const r = await todoApi.listLists()
    lists.value = r.lists || []
  } catch (e) {
    toast(e.message)
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login?redirect=/todo/ai&source=todo')
    return
  }
  try {
    await loadLists()
  } catch (e) {
    loadError.value = e.message
  }
})
</script>

<style scoped>
.todo-ai-scopes {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.todo-chip {
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid var(--todo-border-strong);
  background: var(--todo-panel);
  color: var(--todo-text-soft);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.todo-chip:hover { border-color: var(--todo-primary); color: var(--todo-text); }
.todo-chip.active {
  background: var(--todo-primary);
  border-color: var(--todo-primary);
  color: #fff;
  font-weight: 600;
}
.todo-ai-dates {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.todo-ai-dates label {
  font-size: 13px;
  color: var(--todo-text-soft);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.todo-ai-dates .todo-input { width: auto; min-width: 180px; }
.todo-ai-range {
  font-size: 13px;
  color: var(--todo-text-faint);
  align-self: center;
}

/* Markdown 渲染区 */
.todo-markdown :deep(h1),
.todo-markdown :deep(h2),
.todo-markdown :deep(h3) {
  margin: 14px 0 8px;
  line-height: 1.35;
}
.todo-markdown :deep(h1) { font-size: 20px; }
.todo-markdown :deep(h2) { font-size: 17px; }
.todo-markdown :deep(h3) { font-size: 15px; }
.todo-markdown :deep(p) { margin: 8px 0; line-height: 1.7; color: var(--todo-text); }
.todo-markdown :deep(ul),
.todo-markdown :deep(ol) { padding-left: 22px; margin: 8px 0; }
.todo-markdown :deep(li) { margin: 4px 0; line-height: 1.7; }
.todo-markdown :deep(strong) { color: var(--todo-primary); }
.todo-markdown :deep(code) {
  background: #f1f3f6;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 13px;
}
.todo-markdown :deep(a) { color: var(--todo-primary); }
</style>
