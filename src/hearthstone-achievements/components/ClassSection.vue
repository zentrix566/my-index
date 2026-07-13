<script setup>
import { ref, h, resolveComponent } from 'vue'
import AchievementCard from './AchievementCard.vue'
import MyAchievementCard from './MyAchievementCard.vue'

const props = defineProps({
  heroClass: { type: String, required: true },
  achievements: { type: Array, default: () => [] },
  badgeStyle: { type: Object, default: () => ({}) },
  classStyle: { type: Object, default: () => ({}) },
  useMyCard: { type: Boolean, default: false }
})

const emit = defineEmits(['card-click'])

const collapsed = ref(false)

const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <section class="hs-class-section">
    <header
      class="hs-class-header"
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
        :style="classStyle"
        @click="emit('card-click', ach)"
      />
    </div>
  </section>
</template>
