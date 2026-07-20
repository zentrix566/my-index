<script setup>
import AchievementCard from './AchievementCard.vue'
import MyAchievementCard from './MyAchievementCard.vue'

const props = defineProps({
  heroClass: { type: String, required: true },
  achievements: { type: Array, default: () => [] },
  badgeStyle: { type: Object, default: () => ({}) },
  classStyle: { type: Object, default: () => ({}) },
  useMyCard: { type: Boolean, default: false },
  editable: { type: Boolean, default: false },
  // 折叠状态由父组件控制（v-model:collapsed），默认展开
  collapsed: { type: Boolean, default: false },
  // 收起态头部展示的总览数据：{ total, completed, percent }
  summary: { type: Object, default: null },
  // 批量完成模式：开启时卡片显示勾选框
  selectMode: { type: Boolean, default: false },
  selectedIds: { type: Array, default: () => [] }
})

const emit = defineEmits(['card-click', 'update:collapsed', 'toggle-select'])

const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}
</script>

<template>
  <section class="hs-class-section">
    <header
      class="hs-class-header"
      :class="{ 'hs-class-header-collapsed': collapsed }"
      :style="badgeStyle"
      @click="toggleCollapse"
      role="button"
      :aria-expanded="!collapsed"
      tabindex="0"
      @keydown.enter="toggleCollapse"
      @keydown.space.prevent="toggleCollapse"
    >
      <span class="hs-class-name">{{ heroClass }}</span>
      <span class="hs-class-header-right">
        <span v-if="summary" class="hs-class-summary">
          <span class="hs-class-remaining" :class="{ 'is-done': summary.remaining === 0 }">
            {{ summary.remaining === 0 ? '已完成' : '剩 ' + summary.remaining + ' 个' }}
          </span>
          <span class="hs-class-summary-num">{{ summary.completed }}/{{ summary.total }}</span>
          <span class="hs-class-summary-bar">
            <span class="hs-class-summary-fill" :style="{ width: summary.percent + '%' }"></span>
          </span>
          <span class="hs-class-summary-pct">{{ summary.percent }}%</span>
        </span>
        <span class="hs-class-count">{{ achievements.length }} 个</span>
        <span class="hs-collapse-arrow">{{ collapsed ? '▶' : '▼' }}</span>
      </span>
    </header>
    <div v-show="!collapsed" class="hs-achievement-list">
      <component
        :is="useMyCard ? MyAchievementCard : AchievementCard"
        v-for="ach in achievements"
        :key="ach.id"
        :achievement="ach"
        :editable="useMyCard ? editable : undefined"
        :style="classStyle"
        :select-mode="useMyCard && selectMode ? true : undefined"
        :selected="useMyCard && selectMode ? selectedIds.includes(ach.id) : undefined"
        @click="emit('card-click', ach)"
        @toggle-select="emit('toggle-select', $event)"
      />
    </div>
  </section>
</template>
