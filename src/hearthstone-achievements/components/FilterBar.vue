<script setup>
defineProps({
  query: { type: String, default: '' },
  selectedClass: { type: String, default: 'all' },
  selectedDifficulty: { type: String, default: 'all' },
  selectedStatus: { type: String, default: 'all' },
  availableClasses: { type: Array, default: () => [] },
  difficulties: { type: Array, default: () => [] },
  statuses: { type: Array, default: () => [] },
  selectedMetric: { type: String, default: 'all' },
  metrics: { type: Array, default: () => [] },
  hideClassFilter: { type: Boolean, default: false },
  showStatusFilter: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:query',
  'update:selectedClass',
  'update:selectedDifficulty',
  'update:selectedMetric',
  'update:selectedStatus'
])
</script>

<template>
  <section
    class="hs-controls"
    :class="{ 'hs-controls--with-status': showStatusFilter }"
    aria-label="筛选"
  >
    <div class="hs-controls-title">
      <span class="hs-controls-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/>
        </svg>
      </span>
      <span><strong>筛选成就</strong><small>缩小范围，更快找到目标</small></span>
    </div>

    <div class="hs-controls-grid">
      <label class="hs-filter-control hs-filter-control--search">
        <span class="hs-control-label">搜索</span>
        <span class="hs-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            :value="query"
            type="search"
            placeholder="名称、描述或关联卡牌"
            @input="emit('update:query', $event.target.value)"
          />
        </span>
      </label>

      <label v-if="!hideClassFilter" class="hs-filter-control hs-select-wrap">
        <span class="hs-control-label">职业</span>
        <select :value="selectedClass" @change="emit('update:selectedClass', $event.target.value)">
          <option value="all">全部职业</option>
          <option v-for="cls in availableClasses" :key="cls" :value="cls">{{ cls }}</option>
        </select>
      </label>

      <label class="hs-filter-control hs-select-wrap">
        <span class="hs-control-label">难度</span>
        <select :value="selectedDifficulty" @change="emit('update:selectedDifficulty', $event.target.value)">
          <option value="all">全部难度</option>
          <option v-for="diff in difficulties" :key="diff" :value="diff">{{ diff }}</option>
        </select>
      </label>

      <label class="hs-filter-control hs-select-wrap">
        <span class="hs-control-label">指标</span>
        <select :value="selectedMetric" @change="emit('update:selectedMetric', $event.target.value)">
          <option value="all">全部指标</option>
          <option v-for="m in metrics" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </label>

      <label v-if="showStatusFilter" class="hs-filter-control hs-select-wrap">
        <span class="hs-control-label">状态</span>
        <select :value="selectedStatus" @change="emit('update:selectedStatus', $event.target.value)">
          <option value="all">全部状态</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>
  </section>
</template>
