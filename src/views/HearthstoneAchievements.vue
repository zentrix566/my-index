<template>
  <section class="section page-section hs-page">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Hearthstone</p>
        <h1>炉石传说成就查看器</h1>
        <p>按扩展包浏览成就，支持按职业/难度/类型筛选，查看关联卡牌图片，一键复制推荐卡组代码。</p>
      </div>

      <header class="hs-topbar">
        <div class="hs-brand">
          <div class="hs-brand-mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </div>
          <div>
            <h2>炉石成就</h2>
            <p>{{ currentExpansion?.name }}</p>
          </div>
        </div>
        <div class="hs-top-actions">
          <ExpansionTabs
            :expansions="expansions"
            :current-id="currentExpansionId"
            @switch="currentExpansionId = $event"
          />
        </div>
      </header>

      <FilterBar
        v-model:query="query"
        v-model:selected-class="selectedClass"
        v-model:selected-difficulty="selectedDifficulty"
        v-model:selected-type="selectedType"
        :available-classes="availableClasses"
        :difficulties="difficulties"
        :types="types"
      />

      <section class="hs-result-bar">
        <span>共 {{ filteredAchievements.length.toLocaleString() }} 个成就</span>
        <span v-if="currentExpansion?.description">{{ currentExpansion.description }}</span>
      </section>

      <div class="hs-expansion-groups">
        <template v-for="heroClass in classOrder" :key="heroClass">
          <ClassSection
            v-if="filteredByClass[heroClass] && filteredByClass[heroClass].length > 0"
            :hero-class="heroClass"
            :achievements="filteredByClass[heroClass]"
            :badge-style="getClassBadgeStyle(heroClass)"
            :class-style="getClassStyle(heroClass)"
            @card-click="openCardModal"
          />
        </template>
      </div>

      <div v-if="showEmpty" class="hs-empty-state">
        <p>没有符合筛选条件的成就</p>
      </div>

      <CardModal
        :visible="modalVisible"
        :title="modalTitle"
        :cards="modalCards"
        @close="closeModal"
      />

      <ScrollToTop />
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { expansions } from '../hearthstone-achievements/data/expansions.js'
import { classColors, getClassOrder, groupByClass } from '../hearthstone-achievements/utils/achievements.js'
import ExpansionTabs from '../hearthstone-achievements/components/ExpansionTabs.vue'
import FilterBar from '../hearthstone-achievements/components/FilterBar.vue'
import ClassSection from '../hearthstone-achievements/components/ClassSection.vue'
import CardModal from '../hearthstone-achievements/components/CardModal.vue'
import ScrollToTop from '../hearthstone-achievements/components/ScrollToTop.vue'

// 动态加载所有卡牌图片
const cardImages = import.meta.glob('../hearthstone-achievements/assets/cards/**/*.png', { eager: true, import: 'default' })

const getCardImageUrl = (cardName, imageDir) => {
  const path = `../hearthstone-achievements/assets/cards/${imageDir}/${cardName}.png`
  return cardImages[path] || null
}

// 状态
const currentExpansionId = ref(expansions[0].id)
const query = ref('')
const selectedClass = ref('all')
const selectedDifficulty = ref('all')
const selectedType = ref('all')

const modalCards = ref([])
const modalTitle = ref('')
const modalVisible = ref(false)

const difficulties = ['易', '中等', '难']
const types = ['一次性', '累计']

// 当前版本
const currentExpansion = computed(() =>
  expansions.find((exp) => exp.id === currentExpansionId.value)
)

const currentAchievements = computed(() => {
  const exp = currentExpansion.value
  if (!exp) return []
  return exp.achievements.map((ach) => ({
    ...ach,
    cards: (ach.relatedCards || []).map((name) => ({
      name,
      image: getCardImageUrl(name, exp.cardImageDir)
    }))
  }))
})

const availableClasses = computed(() => {
  const classes = new Set()
  for (const ach of currentAchievements.value) {
    classes.add(ach.heroClass || '中立')
  }
  return getClassOrder().filter((c) => classes.has(c))
})

// 筛选
const filteredAchievements = computed(() => {
  const text = query.value.trim().toLowerCase()
  return currentAchievements.value.filter((ach) => {
    if (selectedClass.value !== 'all' && ach.heroClass !== selectedClass.value) return false
    if (selectedDifficulty.value !== 'all' && ach.difficulty !== selectedDifficulty.value) return false
    if (selectedType.value !== 'all' && ach.type !== selectedType.value) return false
    if (text) {
      const targets = [ach.name, ach.heroClass, ...(ach.relatedCards || []), ...ach.stages.map((s) => s.description)]
      return targets.filter(Boolean).some((v) => String(v).toLowerCase().includes(text))
    }
    return true
  })
})

const filteredByClass = computed(() => groupByClass(filteredAchievements.value))
const classOrder = getClassOrder()

// 切换版本重置
watch(currentExpansionId, () => {
  query.value = ''
  selectedClass.value = 'all'
  selectedDifficulty.value = 'all'
  selectedType.value = 'all'
  closeModal()
})

// 弹窗
const openCardModal = (achievement) => {
  if (!achievement.cards || achievement.cards.length === 0) return
  modalTitle.value = achievement.name
  modalCards.value = achievement.cards
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  modalCards.value = []
  modalTitle.value = ''
}

const getClassStyle = (heroClass) => ({
  borderColor: classColors[heroClass] || '#8b7355',
  backgroundColor: `${classColors[heroClass] || '#8b7355'}10`
})

const getClassBadgeStyle = (heroClass) => ({
  backgroundColor: classColors[heroClass] || '#8b7355',
  color: '#fff'
})

// 空状态
const showEmpty = computed(() => filteredAchievements.value.length === 0)
</script>
