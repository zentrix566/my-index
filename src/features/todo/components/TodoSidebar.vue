<template>
  <aside class="todo-sidebar">
    <RouterLink to="/todo" class="todo-brand">日程管理</RouterLink>

    <div class="todo-section-title">日常</div>
    <nav class="todo-nav">
      <RouterLink to="/todo" class="todo-nav-item">
        <span class="todo-nav-ico">☐</span>今日待办
        <span v-if="todayPendingCount !== null" class="todo-nav-count">{{ todayPendingCount }}</span>
      </RouterLink>
      <RouterLink to="/todo/done" class="todo-nav-item">
        <span class="todo-nav-ico">✓</span>今日已完成
        <span v-if="todayDoneCount !== null" class="todo-nav-count">{{ todayDoneCount }}</span>
      </RouterLink>
    </nav>

    <div class="todo-section-title">管理</div>
    <nav class="todo-nav">
      <RouterLink to="/todo/calendar" class="todo-nav-item">
        <span class="todo-nav-ico">📅</span>日历视图
      </RouterLink>
      <RouterLink to="/todo/manage" class="todo-nav-item">
        <span class="todo-nav-ico">🗓️</span>日程管理
      </RouterLink>
      <RouterLink to="/todo/ai" class="todo-nav-item">
        <span class="todo-nav-ico">🤖</span>日程 AI
      </RouterLink>
      <RouterLink to="/todo/groups" class="todo-nav-item">
        <span class="todo-nav-ico">⚙️</span>分组设置
      </RouterLink>
      <RouterLink to="/todo/profile" class="todo-nav-item">
        <span class="todo-nav-ico">◉</span>个人中心
      </RouterLink>
    </nav>

    <div class="todo-section-title">我的分组</div>
    <nav class="todo-nav">
      <RouterLink
        v-for="l in lists"
        :key="l.id"
        :to="`/todo/list/${l.id}`"
        class="todo-nav-item"
      >
        <span class="todo-nav-ico">{{ l.icon || '📁' }}</span>{{ l.name }}
      </RouterLink>
      <p v-if="!lists.length" class="todo-empty-hint" style="padding: 0 10px">还没有分组，点下方新建</p>
    </nav>

    <div class="todo-sidebar-footer">
      <button class="todo-new-group" type="button" @click="$emit('new-group')">＋ 新建分组</button>
    </div>
  </aside>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi, { TODO_TASKS_CHANGED_EVENT } from '../api/todo.js'

defineProps({
  lists: { type: Array, default: () => [] }
})
defineEmits(['new-group'])

const { user, init } = useAuth()
const todayPendingCount = ref(null)
const todayDoneCount = ref(null)

async function loadTaskCounts() {
  try {
    const [pending, done] = await Promise.all([todoApi.listTasks('today_todo'), todoApi.listTasks('today_done')])
    todayPendingCount.value = (pending.tasks || []).length
    todayDoneCount.value = (done.tasks || []).length
  } catch {
    // 导航数量只作辅助展示，加载失败不影响页面主体。
  }
}

function handleTasksChanged() {
  loadTaskCounts()
}

onMounted(async () => {
  window.addEventListener(TODO_TASKS_CHANGED_EVENT, handleTasksChanged)
  await init()
  if (!user.value) return
  await loadTaskCounts()
})

onUnmounted(() => {
  window.removeEventListener(TODO_TASKS_CHANGED_EVENT, handleTasksChanged)
})
</script>
