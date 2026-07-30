<template>
  <div v-if="viewMode === 'expansion'" class="hs-expansion-groups">
    <template v-for="heroClass in classGroupOrder" :key="heroClass">
      <ClassSection
        v-if="filteredByClass[heroClass]?.length"
        :collapsed="classViewCollapsed[heroClass]"
        :hero-class="heroClass"
        :achievements="filteredByClass[heroClass]"
        :badge-style="getClassBadgeStyle(heroClass)"
        :class-style="getClassStyle(heroClass)"
        :summary="{ total: filteredByClass[heroClass].length }"
        summary-total-only
        @update:collapsed="$emit('set-class-collapsed', heroClass, $event)"
        @card-click="$emit('card-click', $event)"
        @deck-click="$emit('deck-click', $event)"
        @share="$emit('share', $event)"
      />
    </template>
  </div>

  <div v-else-if="viewMode === 'class'" class="hs-expansion-groups">
    <template v-for="expansion in expansions" :key="expansion.id">
      <ClassSection
        v-if="filteredByExpansion[expansion.id]?.length"
        :collapsed="expViewCollapsed[expansion.id]"
        :hero-class="expansion.name"
        :achievements="filteredByExpansion[expansion.id]"
        :badge-style="expansionBadgeStyle"
        :class-style="expansionStyle"
        :summary="expViewSummaries[expansion.id]"
        summary-total-only
        @update:collapsed="$emit('set-expansion-collapsed', expansion.id, $event)"
        @card-click="$emit('card-click', $event)"
        @deck-click="$emit('deck-click', $event)"
        @share="$emit('share', $event)"
      />
    </template>
  </div>

  <div v-else-if="myGroupBy === 'expansion'" class="hs-expansion-groups">
    <template v-for="heroClass in classGroupOrder" :key="heroClass">
      <ClassSection
        v-if="myFilteredByClass[heroClass]?.length"
        :collapsed="classViewCollapsed[heroClass]"
        :hero-class="heroClass"
        :achievements="myFilteredByClass[heroClass]"
        :badge-style="getClassBadgeStyle(heroClass)"
        :class-style="getClassStyle(heroClass)"
        :summary="classViewSummaries[heroClass]"
        use-my-card
        show-remaining
        :editable="Boolean(user)"
        :select-mode="batchMode"
        :selected-ids="selectedAchIds"
        :pinned-ids="pinnedIds"
        :pinning="profileSaving"
        @update:collapsed="$emit('set-class-collapsed', heroClass, $event)"
        @card-click="$emit('card-click', $event)"
        @deck-click="$emit('deck-click', $event)"
        @toggle-select="$emit('toggle-select', $event)"
        @toggle-pin="$emit('toggle-pin', $event)"
        @share="$emit('share', $event)"
      />
    </template>
  </div>

  <div v-else-if="myGroupBy === 'class'" class="hs-expansion-groups">
    <template v-for="expansion in myClassExpansionOrder" :key="expansion.id">
      <ClassSection
        v-if="myFilteredByExpansion[expansion.id]?.length"
        :collapsed="expViewCollapsed[expansion.id]"
        :hero-class="expansion.name"
        :achievements="myFilteredByExpansion[expansion.id]"
        :badge-style="expansionBadgeStyle"
        :class-style="expansionStyle"
        :summary="expViewSummaries[expansion.id]"
        use-my-card
        show-remaining
        :editable="Boolean(user)"
        :select-mode="batchMode"
        :selected-ids="selectedAchIds"
        :pinned-ids="pinnedIds"
        :pinning="profileSaving"
        @update:collapsed="$emit('set-expansion-collapsed', expansion.id, $event)"
        @card-click="$emit('card-click', $event)"
        @deck-click="$emit('deck-click', $event)"
        @toggle-select="$emit('toggle-select', $event)"
        @toggle-pin="$emit('toggle-pin', $event)"
        @share="$emit('share', $event)"
      />
    </template>
  </div>

  <div v-else-if="myGroupBy === 'sprint'" class="hs-priority-wrap">
    <AchievementRecommendations
      v-if="!batchMode"
      :recommendations="recommendations"
      :editable="Boolean(user)"
      :collapsed="recommendationsCollapsed"
      @toggle="$emit('toggle-sprint-section', 'recommendations')"
      @select="$emit('card-click', $event)"
      @share="$emit('share', $event)"
    />

    <section
      v-for="section in sprintSections"
      v-show="section.achievements.length"
      :key="section.key"
      class="hs-priority-group hs-sprint-cat"
    >
      <button
        type="button"
        class="hs-sprint-cat-head"
        :aria-expanded="!sprintSectionCollapsed[section.key]"
        @click="$emit('toggle-sprint-section', section.key)"
      >
        <span class="hs-sprint-cat-caret" :class="{ open: !sprintSectionCollapsed[section.key] }">▶</span>
        <span class="hs-sprint-cat-title">{{ section.title }}</span>
        <span class="hs-sprint-cat-count">
          {{ section.achievements.length }} 个{{ section.key === 'oneTime' ? ` · 剩余 ${sprintOneTimeRemain} 次` : '' }}
        </span>
      </button>
      <div v-show="!sprintSectionCollapsed[section.key]" class="hs-achievement-list hs-priority-list">
        <MyAchievementCard
          v-for="achievement in section.achievements"
          :key="achievement.id"
          :achievement="achievement"
          show-remaining
          :editable="Boolean(user)"
          :pinned="pinnedIds.includes(achievement.id)"
          :pinning="profileSaving"
          @click="$emit('card-click', $event)"
          @deck-click="$emit('deck-click', $event)"
          @toggle-pin="$emit('toggle-pin', $event)"
          @share="$emit('share', $event)"
        />
      </div>
    </section>

    <p v-if="!sprintAllList.length" class="hs-sprint-empty">
      当前筛选范围内没有未完成的成就。
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { classColors } from '../utils/achievements.js'
import AchievementRecommendations from './AchievementRecommendations.vue'
import ClassSection from './ClassSection.vue'
import MyAchievementCard from './MyAchievementCard.vue'

const props = defineProps({
  viewMode: { type: String, required: true },
  myGroupBy: { type: String, required: true },
  classGroupOrder: { type: Array, required: true },
  filteredByClass: { type: Object, required: true },
  classViewCollapsed: { type: Object, required: true },
  expansions: { type: Array, required: true },
  filteredByExpansion: { type: Object, required: true },
  expViewCollapsed: { type: Object, required: true },
  expViewSummaries: { type: Object, required: true },
  myFilteredByClass: { type: Object, required: true },
  classViewSummaries: { type: Object, required: true },
  myFilteredByExpansion: { type: Object, required: true },
  myClassExpansionOrder: { type: Array, required: true },
  user: { type: Object, default: null },
  batchMode: { type: Boolean, required: true },
  selectedAchIds: { type: Array, required: true },
  pinnedIds: { type: Array, required: true },
  profileSaving: { type: Boolean, required: true },
  sprintGroups: { type: Object, required: true },
  sprintSectionCollapsed: { type: Object, required: true },
  sprintOneTimeRemain: { type: Number, required: true },
  sprintAllList: { type: Array, required: true },
  recommendations: { type: Array, default: () => [] },
  recommendationsCollapsed: { type: Boolean, default: true }
})

defineEmits([
  'set-class-collapsed',
  'set-expansion-collapsed',
  'toggle-sprint-section',
  'card-click',
  'deck-click',
  'toggle-select',
  'toggle-pin',
  'share'
])

const sprintSections = computed(() => [
  { key: 'oneTime', title: '一次性成就', achievements: props.sprintGroups.oneTime },
  { key: 'count', title: '累计-次数（剩余从低到高）', achievements: props.sprintGroups.count },
  { key: 'points', title: '累计-点数（剩余从低到高）', achievements: props.sprintGroups.points }
])

const getClassStyle = (heroClass) => ({
  '--hs-class-color': classColors[heroClass] || '#8b7355'
})

const getClassBadgeStyle = (heroClass) => ({
  backgroundColor: classColors[heroClass] || '#8b7355',
  color: '#fff'
})

const expansionStyle = { '--hs-class-color': '#6b5b4f' }
const expansionBadgeStyle = { backgroundColor: '#6b5b4f', color: '#fff' }
</script>
