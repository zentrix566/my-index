<template>
  <div class="changelog-page">
    <header class="changelog-header">
      <p class="eyebrow">Changelog</p>
      <h1>全站更新日志</h1>
      <p>集中查看主站、炉石、抵御心魔与日程管理的功能和数据更新。</p>
    </header>

    <nav class="changelog-filters" aria-label="更新日志分类">
      <button
        v-for="option in categoryOptions"
        :key="option.key"
        type="button"
        :class="{ active: selectedCategory === option.key }"
        @click="selectCategory(option.key)"
      >
        {{ option.label }}
        <span>{{ option.count }}</span>
      </button>
    </nav>

    <ol class="changelog-list">
      <li v-for="entry in filteredEntries" :key="entry.category + entry.date + entry.title" class="changelog-item">
        <div class="changelog-meta">
          <span class="changelog-date">{{ entry.date }}</span>
          <span class="changelog-category">{{ entry.categoryLabel }}</span>
          <h2 class="changelog-title">{{ entry.title }}</h2>
        </div>
        <button type="button" class="changelog-detail-link" @click="goDetail(entry)">查看对应功能 →</button>
        <ul class="changelog-changes">
          <li v-for="(change, index) in entry.changes" :key="index">{{ change }}</li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changelog } from '../data/changelog.js'

const route = useRoute()
const router = useRouter()

const entries = changelog
  .map((entry) => ({
    ...entry,
    category: entry.category || 'hearthstone',
    categoryLabel: {
      site: '主站',
      willpower: '抵御心魔',
      todo: '日程管理'
    }[entry.category] || '炉石',
    route: entry.route || '/hearthstone'
  }))
  .sort((a, b) => b.date.localeCompare(a.date))

const selectedCategory = computed(() => (
  ['site', 'hearthstone', 'willpower', 'todo'].includes(route.query.category) ? route.query.category : 'all'
))

const categoryOptions = computed(() => [
  { key: 'all', label: '全部', count: entries.length },
  { key: 'site', label: '主站', count: entries.filter((entry) => entry.category === 'site').length },
  { key: 'hearthstone', label: '炉石', count: entries.filter((entry) => entry.category === 'hearthstone').length },
  { key: 'willpower', label: '抵御心魔', count: entries.filter((entry) => entry.category === 'willpower').length },
  { key: 'todo', label: '日程管理', count: entries.filter((entry) => entry.category === 'todo').length }
])

const filteredEntries = computed(() => (
  selectedCategory.value === 'all'
    ? entries
    : entries.filter((entry) => entry.category === selectedCategory.value)
))

function selectCategory(category) {
  router.replace({ path: '/changelog', query: category === 'all' ? {} : { category } })
}

function goDetail(entry) {
  router.push(entry.route)
}
</script>

<style scoped>
.changelog-page {
  width: min(860px, calc(100% - 40px));
  margin: 0 auto;
  padding: 48px 0 72px;
}
.changelog-header {
  margin-bottom: 24px;
}
.changelog-header h1 {
  margin: 4px 0 8px;
  color: var(--text);
  font-size: 30px;
}
.changelog-header p:last-child {
  margin: 0;
  color: var(--muted);
}
.changelog-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 30px;
}
.changelog-filters button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  background: var(--surface);
  font-weight: 700;
  cursor: pointer;
}
.changelog-filters button.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--surface-soft);
}
.changelog-filters span {
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--surface-soft);
  font-size: 12px;
}
.changelog-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.changelog-item {
  position: relative;
  padding: 0 0 30px 24px;
  border-left: 2px solid var(--line);
}
.changelog-item:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}
.changelog-item::before {
  content: '';
  position: absolute;
  top: 5px;
  left: -7px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px var(--bg);
}
.changelog-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.changelog-date {
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.changelog-category {
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--muted);
  background: var(--surface-soft);
  font-size: 12px;
  font-weight: 700;
}
.changelog-title {
  flex-basis: 100%;
  margin: 2px 0 0;
  color: var(--text);
  font-size: 19px;
}
.changelog-detail-link {
  margin: 9px 0 2px;
  padding: 4px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--primary);
  background: var(--surface-soft);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.changelog-changes {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--text-soft, var(--text));
  font-size: 14px;
  line-height: 1.75;
}
.changelog-changes li {
  margin-bottom: 5px;
}
.changelog-filters button:focus-visible,
.changelog-detail-link:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--primary) 45%, transparent);
  outline-offset: 3px;
}
</style>
