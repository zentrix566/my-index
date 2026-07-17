<script setup>
defineProps({
  query: { type: String, default: '' },
  selectedClass: { type: String, default: 'all' },
  selectedDifficulty: { type: String, default: 'all' },
  selectedType: { type: String, default: 'all' },
  selectedStatus: { type: String, default: 'all' },
  availableClasses: { type: Array, default: () => [] },
  difficulties: { type: Array, default: () => [] },
  types: { type: Array, default: () => [] },
  statuses: { type: Array, default: () => [] },
  hideClassFilter: { type: Boolean, default: false },
  showStatusFilter: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:query',
  'update:selectedClass',
  'update:selectedDifficulty',
  'update:selectedType',
  'update:selectedStatus'
])
</script>

<template>
  <section
    class="hs-controls"
    :class="{ 'hs-controls--with-status': showStatusFilter }"
    aria-label="筛选"
  >
    <label class="hs-search-box">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        :value="query"
        type="search"
        placeholder="搜索名称、描述或卡牌"
        @input="emit('update:query', $event.target.value)"
      />
    </label>

    <label v-if="!hideClassFilter" class="hs-select-wrap">
      <span>职业</span>
      <select :value="selectedClass" @change="emit('update:selectedClass', $event.target.value)">
        <option value="all">全部职业</option>
        <option v-for="cls in availableClasses" :key="cls" :value="cls">{{ cls }}</option>
      </select>
    </label>

    <label class="hs-select-wrap">
      <span>难度</span>
      <select :value="selectedDifficulty" @change="emit('update:selectedDifficulty', $event.target.value)">
        <option value="all">全部难度</option>
        <option v-for="diff in difficulties" :key="diff" :value="diff">{{ diff }}</option>
      </select>
    </label>

    <label class="hs-select-wrap">
      <span>类型</span>
      <select :value="selectedType" @change="emit('update:selectedType', $event.target.value)">
        <option value="all">全部类型</option>
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>

    <label v-if="showStatusFilter" class="hs-select-wrap">
      <span>完成</span>
      <select :value="selectedStatus" @change="emit('update:selectedStatus', $event.target.value)">
        <option value="all">全部</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </label>
  </section>
</template>
