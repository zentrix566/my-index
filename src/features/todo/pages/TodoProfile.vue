<template>
  <section class="todo-app">
    <TodoSidebar :lists="lists" @new-group="groupModal?.open()" />

    <main class="todo-main todo-profile-page">
      <header class="todo-profile-hero">
        <div class="todo-profile-avatar">{{ initials }}</div>
        <div class="todo-profile-intro">
          <span class="todo-profile-kicker">MY TODO SPACE</span>
          <h1>{{ displayName }}</h1>
          <p>让每一天的安排，都有一个清晰的落点。</p>
        </div>
        <RouterLink class="todo-btn" to="/settings">编辑账户资料</RouterLink>
      </header>

      <p v-if="loadError" class="todo-error">{{ loadError }}</p>

      <div class="todo-profile-grid">
        <section class="todo-profile-card todo-profile-activity">
          <div class="todo-profile-card-head"><div><span>今天</span><h2>任务进度</h2></div><strong>{{ progress }}%</strong></div>
          <div class="todo-profile-progress"><span :style="{ width: `${progress}%` }"></span></div>
          <div class="todo-profile-stats">
            <div><strong>{{ activeTasks.length }}</strong><span>待完成</span></div>
            <div><strong>{{ doneTasks.length }}</strong><span>已完成</span></div>
            <div><strong>{{ totalTasks }}</strong><span>今日总数</span></div>
          </div>
        </section>

        <section class="todo-profile-card">
          <div class="todo-profile-card-head"><div><span>分类</span><h2>任务分组</h2></div><RouterLink to="/todo/groups">管理</RouterLink></div>
          <div v-if="lists.length" class="todo-profile-groups">
            <RouterLink v-for="list in lists.slice(0, 5)" :key="list.id" :to="`/todo/list/${list.id}`">
              <span class="todo-profile-group-icon">{{ list.icon || '◌' }}</span>{{ list.name }}<b>›</b>
            </RouterLink>
          </div>
          <p v-else class="todo-profile-empty">还没有分组，创建一个来整理任务。</p>
        </section>

      </div>
    </main>

    <TodoNewGroupModal ref="groupModal" @created="loadLists" />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../../auth/useAuth.js'
import todoApi from '../api/todo.js'
import TodoSidebar from '../components/TodoSidebar.vue'
import TodoNewGroupModal from '../components/TodoNewGroupModal.vue'

const router = useRouter()
const { user, init } = useAuth()
const lists = ref([])
const activeTasks = ref([])
const doneTasks = ref([])
const loadError = ref('')
const groupModal = ref(null)

const displayName = computed(() => user.value?.displayName || user.value?.username || '我的待办')
const initials = computed(() => displayName.value.trim().slice(0, 1).toUpperCase() || '我')
const totalTasks = computed(() => activeTasks.value.length + doneTasks.value.length)
const progress = computed(() => totalTasks.value ? Math.round(doneTasks.value.length / totalTasks.value * 100) : 0)

async function loadLists() {
  const result = await todoApi.listLists()
  lists.value = result.lists || []
}

async function loadProfile() {
  try {
    const [active, done] = await Promise.all([todoApi.listTasks('today_todo'), todoApi.listTasks('today_done')])
    activeTasks.value = active.tasks || []
    doneTasks.value = done.tasks || []
  } catch (error) {
    loadError.value = error.message || '数据加载失败'
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login?redirect=/todo/profile&source=todo')
    return
  }
  await Promise.all([loadLists(), loadProfile()])
})
</script>

<style scoped>
.todo-profile-page { min-height: calc(100vh - 64px); }
.todo-profile-hero { display: flex; align-items: center; gap: 16px; margin: 2px 0 24px; padding: 24px; border: 1px solid rgba(99, 102, 241, .18); border-radius: 18px; background: linear-gradient(125deg, rgba(238, 242, 255, .96), rgba(255, 255, 255, .8)); box-shadow: 0 12px 32px rgba(55, 65, 125, .08); }
.todo-profile-avatar { display: grid; place-items: center; flex: 0 0 58px; width: 58px; height: 58px; border-radius: 18px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 25px; font-weight: 800; }
.todo-profile-intro { flex: 1; min-width: 0; }
.todo-profile-kicker, .todo-profile-card-head span { color: #6366f1; font-size: 10px; font-weight: 800; letter-spacing: 1.1px; }
.todo-profile-intro h1 { margin: 3px 0; font-size: 25px; }
.todo-profile-intro p { margin: 0; color: var(--todo-text-soft); font-size: 14px; }
.todo-profile-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(280px, .9fr); gap: 18px; max-width: 1050px; }
.todo-profile-card { padding: 20px; border: 1px solid var(--todo-border); border-radius: 16px; background: rgba(255,255,255,.8); box-shadow: var(--todo-shadow); }
.todo-profile-card-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 17px; }
.todo-profile-card-head h2 { margin: 3px 0 0; font-size: 17px; }
.todo-profile-card-head a { color: var(--todo-primary); font-size: 13px; text-decoration: none; }
.todo-profile-card-head > strong { color: #4f46e5; font-size: 26px; }
.todo-profile-progress { height: 8px; border-radius: 999px; overflow: hidden; background: #e8eaff; }
.todo-profile-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6366f1, #8b5cf6); }
.todo-profile-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 18px; }
.todo-profile-stats div { padding: 12px; border-radius: 11px; background: rgba(99, 102, 241, .06); }
.todo-profile-stats strong, .todo-profile-stats span { display: block; }
.todo-profile-stats strong { font-size: 19px; }.todo-profile-stats span, .todo-profile-empty { color: var(--todo-text-soft); font-size: 12px; }
.todo-profile-groups { display: flex; flex-direction: column; gap: 5px; }
.todo-profile-groups a { display: flex; align-items: center; gap: 8px; padding: 8px 6px; border-radius: 8px; color: var(--todo-text); font-size: 14px; text-decoration: none; }.todo-profile-groups a:hover { background: var(--todo-hover-bg); }.todo-profile-groups b { margin-left: auto; color: var(--todo-text-faint); }.todo-profile-group-icon { width: 20px; text-align: center; }
.todo-profile-empty { margin: 0; }
html[data-theme='dark'] .todo-profile-hero, html[data-theme='dark'] .todo-profile-card { background: linear-gradient(145deg, rgba(31,37,50,.96), rgba(25,31,43,.94)); border-color: rgba(129,140,248,.2); }.todo-profile-page :deep(.todo-btn) { margin-left: auto; }
@media (max-width: 760px) { .todo-profile-hero { flex-wrap: wrap; padding: 18px; }.todo-profile-page :deep(.todo-btn) { margin-left: 74px; }.todo-profile-grid { grid-template-columns: 1fr; } }
</style>
