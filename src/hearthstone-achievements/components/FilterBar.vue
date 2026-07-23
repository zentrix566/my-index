<script setup>
import { ref } from 'vue'
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
  showStatusFilter: { type: Boolean, default: false },
  passBonus: { type: Number, default: 0 },
  passBonusOptions: { type: Array, default: () => [] },
  showPassBonus: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:query',
  'update:selectedClass',
  'update:selectedDifficulty',
  'update:selectedMetric',
  'update:selectedStatus',
  'update:passBonus'
])

// 筛选条件（职业/难度/指标/状态/通行证）默认收起，点「筛选」展开；搜索框常驻。
const collapsed = ref(true)
</script>

<template>
  <section
    class="hs-controls"
    :class="{ 'hs-controls--with-status': showStatusFilter, 'hs-controls--collapsed': collapsed }"
    aria-label="筛选"
  >
    <div class="hs-controls-head">
      <label class="hs-filter-control hs-filter-control--search">
        <span class="hs-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            :value="query"
            type="search"
            placeholder="搜索成就（名称 / 描述 / 关联卡牌）"
            @input="emit('update:query', $event.target.value)"
          />
        </span>
      </label>

      <button
        type="button"
        class="hs-filter-toggle"
        :aria-expanded="!collapsed"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '筛选' : '收起筛选' }}
        <svg class="hs-filter-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>

    <div v-show="!collapsed" class="hs-controls-grid">
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

      <label v-if="showPassBonus" class="hs-filter-control hs-select-wrap">
        <span class="hs-control-label">通行证加成</span>
        <select :value="passBonus" @change="emit('update:passBonus', Number($event.target.value))">
          <option v-for="o in passBonusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
    </div>
  </section>
</template>
