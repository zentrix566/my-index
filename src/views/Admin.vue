<template>
  <div class="ad-page">
    <div class="ad-shell">
      <RouterLink class="ad-back" to="/settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回个人中心
      </RouterLink>

      <nav class="ad-tabs" aria-label="后台功能">
        <button type="button" :class="{ active: activeTab === 'users' }" @click="setActiveTab('users')">用户与模块</button>
        <button type="button" :class="{ active: activeTab === 'stats' }" @click="setActiveTab('stats')">访问统计</button>
      </nav>

      <template v-if="activeTab === 'users'">
        <header class="ad-head">
        <div>
          <p class="ad-eyebrow">站点后台</p>
          <h1 class="ad-title">用户与模块</h1>
        </div>
        <button class="ad-manage-btn" type="button" :disabled="loading" @click="load">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
          </svg>
          {{ loading ? '加载中…' : '刷新' }}
        </button>
        </header>

      <p v-if="error" class="ad-error" role="alert">{{ error }}</p>

      <section class="ad-stats">
        <div class="ad-stat">
          <span class="ad-stat-label">注册用户</span>
          <strong class="ad-stat-value">{{ users.length }}</strong>
        </div>
        <div v-for="mod in moduleCatalog" :key="mod.key" class="ad-stat">
          <span class="ad-stat-label">用过{{ mod.label }}</span>
          <strong class="ad-stat-value" :style="{ color: mod.color }">{{ countByModule(mod.key) }}</strong>
        </div>
        <div class="ad-stat">
          <span class="ad-stat-label">从未使用</span>
          <strong class="ad-stat-value ad-muted">{{ idleCount }}</strong>
        </div>
      </section>

      <nav class="ad-filters" aria-label="按模块筛选">
        <button
          v-for="option in filterOptions"
          :key="option.key"
          class="ad-filter"
          :class="{ active: filter === option.key }"
          type="button"
          @click="filter = option.key"
        >
          {{ option.label }}
          <span class="ad-filter-count">{{ option.count }}</span>
        </button>
      </nav>

      <section class="ad-card">
        <div v-if="loading && !users.length" class="ad-empty">正在读取用户数据…</div>
        <div v-else-if="!filteredUsers.length" class="ad-empty">没有符合条件的用户。</div>

        <ul v-else class="ad-list">
          <li v-for="row in filteredUsers" :key="row.id" class="ad-row">
            <span class="ad-avatar" aria-hidden="true">{{ initialOf(row) }}</span>

            <div class="ad-identity">
              <strong>
                {{ row.displayName || row.username }}
                <small v-if="row.displayName">（{{ row.username }}）</small>
              </strong>
              <span>
                {{ row.email || '未绑定邮箱' }}
                <template v-if="row.email"> · {{ row.emailVerified ? '已激活' : '待激活' }}</template>
              </span>
            </div>

            <div class="ad-modules">
              <span
                v-for="key in row.modules"
                :key="key"
                class="ad-tag"
                :style="tagStyle(key)"
              >{{ moduleLabel(key) }}</span>
              <span v-if="!row.modules.length" class="ad-tag ad-tag-idle">未使用任何模块</span>
            </div>

            <div class="ad-times">
              <span><em>注册</em>{{ formatDate(row.createdAt) }}</span>
              <span><em>活跃</em>{{ row.lastSeen ? formatDate(row.lastSeen) : '—' }}</span>
            </div>
          </li>
        </ul>
      </section>

        <p class="ad-note">
          模块使用记录在用户访问对应模块接口时自动写入，只记录首次与最近一次访问时间，不记录具体行为。
        </p>
      </template>

      <StatsPage v-else />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'
import StatsPage from '../features/analytics/pages/Stats.vue'

// 模块登记表：新增模块时在这里加一行，统计与标签会自动跟上
const moduleCatalog = [
  { key: 'hearthstone', label: '炉石', color: '#38bdf8' },
  { key: 'willpower', label: '心魔', color: '#c084fc' }
]

const { user, init } = useAuth()
const route = useRoute()
const router = useRouter()

const users = ref([])
const loading = ref(false)
const error = ref('')
const filter = ref('all')
const activeTab = computed(() => route.query.tab === 'stats' ? 'stats' : 'users')

const idleCount = computed(() => users.value.filter((u) => !u.modules.length).length)

const filterOptions = computed(() => [
  { key: 'all', label: '全部', count: users.value.length },
  ...moduleCatalog.map((mod) => ({
    key: mod.key,
    label: mod.label,
    count: countByModule(mod.key)
  })),
  { key: 'idle', label: '未使用', count: idleCount.value }
])

const filteredUsers = computed(() => {
  if (filter.value === 'all') return users.value
  if (filter.value === 'idle') return users.value.filter((u) => !u.modules.length)
  return users.value.filter((u) => u.modules.includes(filter.value))
})

function countByModule(key) {
  return users.value.filter((u) => u.modules.includes(key)).length
}

function moduleLabel(key) {
  return moduleCatalog.find((mod) => mod.key === key)?.label || key
}

function tagStyle(key) {
  const color = moduleCatalog.find((mod) => mod.key === key)?.color || '#94a3b8'
  return { color, borderColor: `${color}55`, background: `${color}1a` }
}

function initialOf(row) {
  const name = row.displayName || row.username || '?'
  return name.slice(0, 1).toUpperCase()
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const resp = await fetch('/api/auth/admin/module-usage')
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(data.error || '读取失败')
    users.value = Array.isArray(data.users) ? data.users : []
  } catch (e) {
    error.value = e.message || '读取失败'
  } finally {
    loading.value = false
  }
}

function setActiveTab(tab) {
  router.replace({ path: '/admin', query: tab === 'stats' ? { tab: 'stats' } : {} })
}

watch(activeTab, (tab) => {
  if (tab === 'users' && !users.value.length && !loading.value) load()
})

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login')
    return
  }
  if (!user.value.isOwner) {
    router.replace('/settings')
    return
  }
  if (activeTab.value === 'users') await load()
})
</script>

<style scoped>
.ad-page {
  min-height: calc(100vh - 137px);
  padding: 48px 24px;
  color: #e2e8f0;
  background:
    radial-gradient(900px 520px at 12% -8%, rgba(56, 189, 248, 0.14), transparent 60%),
    radial-gradient(760px 520px at 96% 4%, rgba(192, 132, 252, 0.12), transparent 60%),
    #0b1120;
}
.ad-shell {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
}
.ad-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 22px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.ad-back:hover { color: #38bdf8; }

.ad-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.ad-tabs button {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.5);
  font-weight: 700;
  cursor: pointer;
}
.ad-tabs button.active {
  border-color: rgba(56, 189, 248, 0.5);
  color: #e0f2fe;
  background: rgba(56, 189, 248, 0.14);
}
.ad-tabs button:focus-visible {
  outline: 3px solid rgba(56, 189, 248, 0.5);
  outline-offset: 3px;
}
.ad-shell :deep(.page-section) {
  padding: 0;
}
.ad-shell :deep(.narrow-container) {
  max-width: none;
  padding: 0;
}

.ad-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.ad-eyebrow {
  margin: 0 0 4px;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ad-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  color: #f8fafc;
}
.ad-manage-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  color: #dbeafe;
  background: rgba(15, 23, 42, 0.45);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.ad-manage-btn:hover:not(:disabled) {
  border-color: rgba(56, 189, 248, 0.5);
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
}
.ad-manage-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.ad-error {
  margin: 0 0 16px;
  padding: 12px 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 11px;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  font-size: 13px;
  font-weight: 600;
}

.ad-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.ad-stat {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
}
.ad-stat-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}
.ad-stat-value {
  color: #f1f5f9;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.1;
}
.ad-stat-value.ad-muted { color: #64748b; }

.ad-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.ad-filter {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.5);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.ad-filter:hover { color: #e2e8f0; border-color: rgba(148, 163, 184, 0.35); }
.ad-filter.active {
  border-color: rgba(56, 189, 248, 0.45);
  color: #e0f2fe;
  background: rgba(56, 189, 248, 0.14);
}
.ad-filter-count {
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  font-size: 11px;
  font-weight: 800;
}

.ad-card {
  padding: 6px 0;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}
.ad-empty {
  padding: 40px 22px;
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
}
.ad-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ad-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1.4fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 22px;
}
.ad-row + .ad-row { border-top: 1px solid rgba(148, 163, 184, 0.12); }
.ad-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid rgba(56, 189, 248, 0.24);
  border-radius: 11px;
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.09);
  font-size: 16px;
  font-weight: 800;
}
.ad-identity {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.ad-identity strong {
  overflow-wrap: anywhere;
  color: #f1f5f9;
  font-size: 14px;
}
.ad-identity small {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}
.ad-identity > span {
  overflow-wrap: anywhere;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}
.ad-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ad-tag {
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.ad-tag-idle {
  color: #64748b;
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(148, 163, 184, 0.08);
}
.ad-times {
  display: grid;
  gap: 3px;
  justify-items: end;
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}
.ad-times em {
  margin-right: 6px;
  color: #64748b;
  font-style: normal;
  font-weight: 700;
}

.ad-note {
  margin: 16px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.ad-back:focus-visible,
.ad-manage-btn:focus-visible,
.ad-filter:focus-visible {
  outline: 3px solid rgba(56, 189, 248, 0.5);
  outline-offset: 3px;
}

@media (max-width: 720px) {
  .ad-page { padding: 24px 14px; }
  .ad-title { font-size: 24px; }
  .ad-row {
    grid-template-columns: 40px minmax(0, 1fr);
    row-gap: 10px;
    padding: 16px;
  }
  .ad-modules,
  .ad-times {
    grid-column: 2;
    justify-items: start;
    justify-content: start;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ad-manage-btn,
  .ad-filter { transition: none; }
}
</style>
