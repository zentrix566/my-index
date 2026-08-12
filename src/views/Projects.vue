<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">项目索引</p>
        <h1>个人项目与工作项目</h1>
        <p>集中查看互动页面、实用工具与项目经验。</p>
      </div>
      <div class="project-tools" role="search">
        <label class="project-search">
          <span class="sr-only">搜索项目</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model.trim="query" type="search" placeholder="搜索名称、简介或标签" />
        </label>
        <div class="project-filters" aria-label="项目分类">
          <button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="filter = item.value">
            {{ item.label }}
          </button>
        </div>
      </div>
      <div class="project-groups">
        <section v-if="recentApps.length && !query && filter === 'all'" class="project-group project-quick-group">
          <h2 class="group-title">最近使用</h2>
          <VueAppGrid :apps="recentApps" show-favorite />
        </section>
        <section v-if="filteredApps.length" id="personal-projects" class="project-group">
          <h2 class="group-title">个人项目</h2>
          <VueAppGrid :apps="filteredApps" show-favorite />
        </section>
        <section id="work-projects" v-for="g in filteredProjectGroups" :key="g.name" class="project-group">
          <h2 class="group-title">{{ g.name }}</h2>
          <ProjectGrid v-if="g.items.length" :projects="g.items" />
          <p v-else class="group-empty">（暂无，把简历相关项目设 group: '工作项目' 即可显示在此）</p>
        </section>
        <UiState v-if="!filteredApps.length && !filteredProjectGroups.length" title="没有找到匹配项目" message="换个关键词，或清除当前分类后再试。" action-label="清除筛选" @action="resetFilters" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import ProjectGrid from '../components/ProjectGrid.vue'
import VueAppGrid from '../components/VueAppGrid.vue'
import { projects } from '../data/projects'
import { vueApps } from '../data/vueApps'
import { useProjectPreferences } from '../composables/useProjectPreferences.js'
import UiState from '../components/UiState.vue'

const GROUP_ORDER = ['工作项目']
const projectGroups = GROUP_ORDER.map((name) => ({
  name,
  items: projects.filter((p) => p.group === name)
}))
const query = ref('')
const filter = ref('all')
const { favorites, recents } = useProjectPreferences()
const filters = [
  { value: 'all', label: '全部' },
  { value: 'favorite', label: '我的收藏' },
  { value: 'personal', label: '个人项目' },
  { value: 'work', label: '工作项目' }
]

function matches(item) {
  if (!query.value) return true
  const text = [item.title, item.summary, item.kicker, item.category, ...(item.tags || [])].join(' ').toLowerCase()
  return text.includes(query.value.toLowerCase())
}

const filteredApps = computed(() => vueApps.filter((app) => {
  if (filter.value === 'work') return false
  if (filter.value === 'favorite' && !favorites.value.includes(app.to)) return false
  return matches(app)
}))
const filteredProjectGroups = computed(() => projectGroups
  .map((group) => ({
    ...group,
    items: group.items.filter((project) => {
      const path = `/projects/${project.slug}`
      if (filter.value === 'personal') return false
      if (filter.value === 'favorite' && !favorites.value.includes(path)) return false
      return matches(project)
    })
  }))
  .filter((group) => group.items.length))
const recentApps = computed(() => recents.value
  .map((path) => vueApps.find((app) => app.to === path))
  .filter(Boolean)
  .slice(0, 3))

function resetFilters() {
  query.value = ''
  filter.value = 'all'
}
</script>

<style scoped>
.project-groups {
  display: flex;
  flex-direction: column;
  gap: 44px;
}
.project-tools { display: grid; gap: 14px; margin: 0 0 34px; }
.project-search {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 620px;
  min-height: 48px;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 13px;
  color: var(--text-muted);
  background: var(--surface);
}
.project-search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent); }
.project-search input { width: 100%; height: 44px; border: 0; outline: 0; color: var(--text); background: transparent; font: inherit; }
.project-filters { display: flex; gap: 8px; overflow-x: auto; padding: 2px; }
.project-filters button {
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-muted);
  background: var(--surface);
  font: inherit;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.project-filters button.active { border-color: var(--primary); color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, var(--surface)); }
.project-quick-group { padding: 20px; border: 1px solid var(--line); border-radius: 18px; background: var(--surface-soft); }
.project-group {
  scroll-margin-top: 96px;
}
.group-title {
  margin: 0 0 18px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--line, #e2e8f0);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text, #1f2937);
}
.group-empty {
  margin: 0;
  color: var(--text-muted, #9ca3af);
  font-size: 0.9rem;
}
</style>
