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

  <div v-else-if="viewMode === 'class'" class="hs-flat-groups">
    <!-- 按职业浏览：取消版本分组，该职业全部成就按版本发布时间新→旧平铺（总览方便） -->
    <div class="hs-achievement-list">
      <AchievementCard
        v-for="achievement in classFlatAchievements"
        :key="achievement.id"
        :achievement="achievement"
        :style="expansionStyle"
        @click="$emit('card-click', $event)"
        @deck-click="$emit('deck-click', $event)"
        @share="$emit('share', $event)"
      />
    </div>
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

  <div v-else-if="myGroupBy === 'class'" class="hs-flat-groups">
    <!-- 我的成就-按职业：与待完成清单一致，按 一次性/累计-次数/累计-点数 分组，默认收起，组内未完成在前（剩余从低到高） -->
    <section
      v-for="section in myClassSections"
      v-show="section.achievements.length"
      :key="section.key"
      class="hs-priority-group hs-sprint-cat"
    >
      <button
        type="button"
        class="hs-sprint-cat-head"
        :aria-expanded="!myClassCollapsed[section.key]"
        @click="$emit('toggle-my-class-section', section.key)"
      >
        <span class="hs-sprint-cat-caret" :class="{ open: !myClassCollapsed[section.key] }">▶</span>
        <span class="hs-sprint-cat-title">{{ section.title }}</span>
        <span class="hs-sprint-cat-count">{{ section.achievements.length }} 个</span>
      </button>
      <div v-show="!myClassCollapsed[section.key]" class="hs-achievement-list hs-priority-list">
        <MyAchievementCard
          v-for="achievement in section.achievements"
          :key="achievement.id"
          :achievement="achievement"
          show-remaining
          :editable="Boolean(user)"
          :style="expansionStyle"
          :select-mode="batchMode"
          :selected="selectedAchIds.includes(achievement.id)"
          :pinned="pinnedIds.includes(achievement.id)"
          :pinning="profileSaving"
          @click="$emit('card-click', $event)"
          @deck-click="$emit('deck-click', $event)"
          @toggle-select="$emit('toggle-select', $event)"
          @toggle-pin="$emit('toggle-pin', $event)"
          @share="$emit('share', $event)"
        />
      </div>
    </section>
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
import AchievementCard from './AchievementCard.vue'
import AchievementRecommendations from './AchievementRecommendations.vue'
import ClassSection from './ClassSection.vue'
import MyAchievementCard from './MyAchievementCard.vue'

const props = defineProps({
  viewMode: { type: String, required: true },
  myGroupBy: { type: String, required: true },
  classGroupOrder: { type: Array, required: true },
  filteredByClass: { type: Object, required: true },
  classViewCollapsed: { type: Object, required: true },
  // 按职业浏览：取消版本分组后的平铺成就列表（版本发布时间新→旧）
  classFlatAchievements: { type: Array, required: true },
  myFilteredByClass: { type: Object, required: true },
  classViewSummaries: { type: Object, required: true },
  // 我的成就-按职业：按 一次性/累计-次数/累计-点数 分组（组内未完成在前、剩余从低到高，见 useAchievementFilters.js）
  myClassGroups: { type: Object, required: true },
  // 我的成就-按职业：分组折叠状态（默认收起）
  myClassCollapsed: { type: Object, required: true },
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
  'toggle-sprint-section',
  'toggle-my-class-section',
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

// 我的成就-按职业：分组标题与待完成清单一致（组内剩余从低到高）
const myClassSections = computed(() => [
  { key: 'oneTime', title: '一次性成就', achievements: props.myClassGroups.oneTime },
  { key: 'count', title: '累计-次数（剩余从低到高）', achievements: props.myClassGroups.count },
  { key: 'points', title: '累计-点数（剩余从低到高）', achievements: props.myClassGroups.points }
])

const getClassStyle = (heroClass) => ({
  '--hs-class-color': classColors[heroClass] || '#8b7355'
})

const getClassBadgeStyle = (heroClass) => ({
  backgroundColor: classColors[heroClass] || '#8b7355',
  color: '#fff'
})

const expansionStyle = { '--hs-class-color': '#6b5b4f' }
</script>
