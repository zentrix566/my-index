<template>
  <section
    v-if="recommendations.length"
    class="hs-priority-group hs-sprint-cat hs-rule-recommendations"
    aria-labelledby="hs-rule-recommendations-title"
  >
    <button
      type="button"
      class="hs-sprint-cat-head"
      :aria-expanded="!collapsed"
      aria-controls="hs-rule-recommendations-list"
      @click="$emit('toggle')"
    >
      <span class="hs-sprint-cat-caret" :class="{ open: !collapsed }" aria-hidden="true">▶</span>
      <h2 id="hs-rule-recommendations-title" class="hs-sprint-cat-title">优先冲刺建议</h2>
      <span class="hs-sprint-cat-count">{{ recommendations.length }} 项</span>
    </button>

    <div
      id="hs-rule-recommendations-list"
      v-show="!collapsed"
      class="hs-achievement-list hs-priority-list"
    >
      <MyAchievementCard
        v-for="recommendation in recommendations"
        :key="recommendation.achievement.id"
        :achievement="recommendation.achievement"
        show-remaining
        :editable="editable"
        @click="$emit('select', $event)"
        @share="$emit('share', $event)"
      />
    </div>
  </section>
</template>

<script setup>
import MyAchievementCard from './MyAchievementCard.vue'

defineProps({
  recommendations: { type: Array, required: true },
  editable: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: true }
})

defineEmits(['toggle', 'select', 'share'])
</script>
