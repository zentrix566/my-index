<template>
  <section class="section page-section hs-page">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Hearthstone</p>
        <h1>炉石传说成就查看器</h1>
        <p>浏览成就数据，或记录自己的成就完成进度。支持按职业/难度/类型筛选，查看关联卡牌图片，一键复制推荐卡组代码。</p>
      </div>

      <!-- 视图模式切换 -->
      <div class="hs-view-switch">
        <button
          :class="{ active: viewMode === 'expansion' }"
          type="button"
          @click="viewMode = 'expansion'"
        >
          按版本浏览
        </button>
        <button
          :class="{ active: viewMode === 'class' }"
          type="button"
          @click="viewMode = 'class'"
        >
          按职业浏览
        </button>
        <button
          :class="{ active: viewMode === 'my' }"
          type="button"
          @click="viewMode = 'my'"
        >
          我的成就
        </button>
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
            <p>
              <template v-if="viewMode === 'expansion'">{{ currentExpansion?.name }}</template>
              <template v-else-if="viewMode === 'class'">{{ currentClassName }}</template>
              <template v-else>我的进度 - {{ myViewSubLabel }}</template>
            </p>
          </div>
        </div>
        <div class="hs-top-actions">
          <!-- 按版本/我的(按版本)：版本选择 -->
          <ExpansionTabs
            v-if="viewMode === 'expansion' || (viewMode === 'my' && myGroupBy === 'expansion')"
            :expansions="expansions"
            :current-id="currentExpansionId"
            @switch="currentExpansionId = $event"
          />
          <!-- 按职业/我的(按职业)/快完成/推荐冲刺：职业选择 -->
          <div v-else class="hs-expansion-tabs" role="tablist" aria-label="选择职业">
            <button
              v-for="cls in allClasses"
              :key="cls"
              :class="{ active: (myGroupBy === 'almost' || myGroupBy === 'priority') ? almostClassFilter === cls : currentClass === cls }"
              type="button"
              role="tab"
              @click="onClassTabClick(cls)"
            >
              {{ cls }}
            </button>
          </div>
        </div>
      </header>

      <!-- 我的成就模式：分组切换 + 统计面板 -->
      <template v-if="viewMode === 'my'">
        <div class="hs-my-sub-switch">
          <span class="hs-my-sub-label">视图：</span>
          <button
            :class="{ active: myGroupBy === 'expansion' }"
            type="button"
            @click="myGroupBy = 'expansion'"
          >按版本</button>
          <button
            :class="{ active: myGroupBy === 'class' }"
            type="button"
            @click="myGroupBy = 'class'"
          >按职业</button>
          <button
            :class="{ active: myGroupBy === 'almost' }"
            type="button"
            @click="myGroupBy = 'almost'"
          >快完成</button>
          <button
            :class="{ active: myGroupBy === 'priority' }"
            type="button"
            @click="myGroupBy = 'priority'"
          >推荐冲刺</button>
        </div>

        <div class="hs-stats-panel">
          <template v-if="myGroupBy === 'almost'">
            <div class="hs-stats-info">
              <span class="hs-stats-percent">🔥 {{ almostStats.count }}</span>
              <span class="hs-stats-detail">
                未完成（含 0%）：累计 {{ almostCumulativeList.length }} 个 · 一次性 {{ almostOneTimeList.length }} 个，按"还差最少"排序
              </span>
            </div>
          </template>
          <template v-else-if="myGroupBy === 'priority'">
            <div class="hs-stats-info">
              <span class="hs-stats-percent">🚀 {{ priorityAllList.length }}</span>
              <span class="hs-stats-detail">
                推荐冲刺目标：A 组 {{ priorityGroups.A.length }} · B 组 {{ priorityGroups.B.length }} · C 组 {{ priorityGroups.C.length }} · D 组 {{ priorityGroups.D.length }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="hs-stats-info">
              <span class="hs-stats-percent">{{ myStats.percentage }}%</span>
              <span class="hs-stats-detail">
                已完成阶段 {{ myStats.earnedPoints }} / {{ myStats.totalPoints }} 点
                （已完成 {{ myCompletedCount }} / {{ myAchievementsList.length }} 个成就）
              </span>
            </div>
            <div class="hs-stats-bar">
              <div class="hs-stats-bar-fill" :style="{ width: myStats.percentage + '%' }"></div>
            </div>
          </template>
        </div>
      </template>

      <FilterBar
        v-if="!(viewMode === 'my' && (myGroupBy === 'almost' || myGroupBy === 'priority'))"
        v-model:query="query"
        v-model:selected-class="selectedClass"
        v-model:selected-difficulty="selectedDifficulty"
        v-model:selected-type="selectedType"
        v-model:selected-status="selectedStatus"
        :available-classes="filterAvailableClasses"
        :difficulties="difficulties"
        :types="types"
        :statuses="statuses"
        :hide-class-filter="viewMode === 'class'"
        :show-status-filter="viewMode === 'my'"
      />

      <section class="hs-result-bar">
        <span>共 {{ filteredAchievements.length.toLocaleString() }} 个成就</span>
        <span v-if="viewMode === 'expansion'">
          {{ currentExpansion?.description }}
          <template v-if="currentExpansion?.referenceLinks && currentExpansion.referenceLinks.length > 0">
            <span class="hs-ref-links">
              <template v-for="(link, idx) in currentExpansion.referenceLinks" :key="link.url">
                <a :href="link.url" target="_blank" rel="noopener noreferrer" class="hs-ref-link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  {{ link.name }}
                </a>
              </template>
            </span>
          </template>
        </span>
        <span v-else-if="viewMode === 'class'">按职业查看所有版本中的成就</span>
        <span v-else-if="myGroupBy === 'almost'">即将完成的成就已按「一次性 / 累计」分开，针对性清掉更顺手</span>
        <span v-else-if="myGroupBy === 'priority'">按「零成本 → 低投入 → 中等投入 → 低优先级」分组，优先清 A 组</span>
        <span v-else>查看我的成就完成进度</span>
      </section>

      <!-- 按版本浏览：按职业分组 -->
      <div v-if="viewMode === 'expansion'" class="hs-expansion-groups">
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

      <!-- 按职业浏览：按版本分组 -->
      <div v-else-if="viewMode === 'class'" class="hs-expansion-groups">
        <template v-for="exp in expansions" :key="exp.id">
          <ClassSection
            v-if="filteredByExpansion[exp.id] && filteredByExpansion[exp.id].length > 0"
            :hero-class="exp.name"
            :achievements="filteredByExpansion[exp.id]"
            :badge-style="getExpansionBadgeStyle()"
            :class-style="getExpansionStyle()"
            @card-click="openCardModal"
          />
        </template>
      </div>

      <!-- 我的成就-按版本：按职业分组 -->
      <div v-else-if="myGroupBy === 'expansion'" class="hs-expansion-groups">
        <template v-for="heroClass in classOrder" :key="heroClass">
          <ClassSection
            v-if="myFilteredByClass[heroClass] && myFilteredByClass[heroClass].length > 0"
            :hero-class="heroClass"
            :achievements="myFilteredByClass[heroClass]"
            :badge-style="getClassBadgeStyle(heroClass)"
            :class-style="getClassStyle(heroClass)"
            :use-my-card="true"
            @card-click="openCardModal"
          />
        </template>
      </div>

      <!-- 我的成就-按职业：按版本分组 -->
      <div v-else-if="myGroupBy === 'class'" class="hs-expansion-groups">
        <template v-for="exp in expansions" :key="exp.id">
          <ClassSection
            v-if="myFilteredByExpansion[exp.id] && myFilteredByExpansion[exp.id].length > 0"
            :hero-class="exp.name"
            :achievements="myFilteredByExpansion[exp.id]"
            :badge-style="getExpansionBadgeStyle()"
            :class-style="getExpansionStyle()"
            :use-my-card="true"
            @card-click="openCardModal"
          />
        </template>
      </div>

      <!-- 我的成就-快完成：拆分为「累计」与「一次性」两个区块 -->
      <div v-else-if="myGroupBy === 'almost'" class="hs-almost-wrap">
        <div class="hs-almost-filters">
          <label class="hs-filter-field">
            <span class="hs-filter-label">版本</span>
            <select v-model="almostVersionFilter" class="hs-filter-select">
              <option value="all">全部版本</option>
              <option v-for="v in versionOptions" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </label>
          <label class="hs-filter-field">
            <span class="hs-filter-label">职业</span>
            <select v-model="almostClassFilter" class="hs-filter-select">
              <option value="all">全部职业</option>
              <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
        </div>
        <section v-if="almostCumulativeList.length" class="hs-almost-group">
          <div class="hs-almost-group-head">
            <h3 class="hs-almost-group-title hs-almost-cumulative-title">
              📊 累计成就 · 还差 {{ almostCumulativeRemainTotal }} 次（共 {{ almostCumulativeList.length }} 个）
            </h3>
            <div class="hs-page-size">
              <span class="hs-page-size-label">每页</span>
              <button
                v-for="sz in pageSizes"
                :key="sz"
                type="button"
                :class="{ active: cumulativePageSize === sz }"
                @click="cumulativePageSize = sz"
              >{{ sz }}</button>
            </div>
          </div>
          <div class="hs-achievement-list hs-almost-list">
            <MyAchievementCard
              v-for="ach in almostCumulativePaged"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              @click="openCardModal"
            />
          </div>
          <div v-if="almostCumulativeTotalPages > 1" class="hs-pager">
            <button
              type="button"
              class="hs-pager-btn"
              :disabled="cumulativePage <= 1"
              @click="cumulativePage--"
            >‹ 上一页</button>
            <span class="hs-pager-info">第 {{ cumulativePage }} / {{ almostCumulativeTotalPages }} 页</span>
            <button
              type="button"
              class="hs-pager-btn"
              :disabled="cumulativePage >= almostCumulativeTotalPages"
              @click="cumulativePage++"
            >下一页 ›</button>
          </div>
        </section>

        <section v-if="almostOneTimeList.length" class="hs-almost-group">
          <div class="hs-almost-group-head">
            <h3 class="hs-almost-group-title hs-almost-onetime-title">
              🎯 一次性成就 · 还差 {{ almostOneTimeRemainTotal }} 阶段（共 {{ almostOneTimeList.length }} 个）
            </h3>
            <div class="hs-page-size">
              <span class="hs-page-size-label">每页</span>
              <button
                v-for="sz in pageSizes"
                :key="sz"
                type="button"
                :class="{ active: oneTimePageSize === sz }"
                @click="oneTimePageSize = sz"
              >{{ sz }}</button>
            </div>
          </div>
          <div class="hs-achievement-list hs-almost-list">
            <MyAchievementCard
              v-for="ach in almostOneTimePaged"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              @click="openCardModal"
            />
          </div>
          <div v-if="almostOneTimeTotalPages > 1" class="hs-pager">
            <button
              type="button"
              class="hs-pager-btn"
              :disabled="oneTimePage <= 1"
              @click="oneTimePage--"
            >‹ 上一页</button>
            <span class="hs-pager-info">第 {{ oneTimePage }} / {{ almostOneTimeTotalPages }} 页</span>
            <button
              type="button"
              class="hs-pager-btn"
              :disabled="oneTimePage >= almostOneTimeTotalPages"
              @click="oneTimePage++"
            >下一页 ›</button>
          </div>
        </section>

        <p v-if="!almostCumulativeList.length && !almostOneTimeList.length" class="hs-almost-empty">
          🎉 暂无即将完成的成就，去别处卷吧！
        </p>
      </div>

      <!-- 我的成就-推荐冲刺：按 A/B/C/D 四档分组 -->
      <div v-else-if="myGroupBy === 'priority'" class="hs-priority-wrap">
        <section v-if="priorityGroups.A.length" class="hs-priority-group hs-priority-group-a">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              🥇 A 组 · 一次即成（零成本，{{ priorityGroups.A.length }} 个）
            </h3>
            <span class="hs-priority-group-tip">优先清掉，完成数涨最快</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in priorityGroups.A"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="priorityGroups.B.length" class="hs-priority-group hs-priority-group-b">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              🥈 B 组 · 还差 ≤20 次（做几把就满，{{ priorityGroups.B.length }} 个）
            </h3>
            <span class="hs-priority-group-tip">A 组清完后顺手做</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in priorityGroups.B"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="priorityGroups.C.length" class="hs-priority-group hs-priority-group-c">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              🥉 C 组 · 还差 21~50 次（中等投入，{{ priorityGroups.C.length }} 个）
            </h3>
            <span class="hs-priority-group-tip">按兴致推进</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in priorityGroups.C"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="priorityGroups.D.length" class="hs-priority-group hs-priority-group-d">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              📌 D 组 · 一次性剩多阶段（优先级最低，{{ priorityGroups.D.length }} 个）
            </h3>
            <span class="hs-priority-group-tip">需要多步推进，放最后</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in priorityGroups.D"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              @click="openCardModal"
            />
          </div>
        </section>

        <p v-if="!priorityAllList.length" class="hs-almost-empty">
          🎉 暂无推荐冲刺目标，你已经很强了！
        </p>
      </div>

      <div v-if="showEmpty && !(viewMode === 'my' && (myGroupBy === 'almost' || myGroupBy === 'priority'))" class="hs-empty-state">
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
import { useAchievementProgress } from '../hearthstone-achievements/composables/useAchievementProgress.js'

import ExpansionTabs from '../hearthstone-achievements/components/ExpansionTabs.vue'
import FilterBar from '../hearthstone-achievements/components/FilterBar.vue'
import ClassSection from '../hearthstone-achievements/components/ClassSection.vue'
import CardModal from '../hearthstone-achievements/components/CardModal.vue'
import ScrollToTop from '../hearthstone-achievements/components/ScrollToTop.vue'
import MyAchievementCard from '../hearthstone-achievements/components/MyAchievementCard.vue'

const { getStats, isAchievementCompleted, getProgressInfo } = useAchievementProgress()

// 动态加载所有卡牌图片
const cardImages = import.meta.glob('../hearthstone-achievements/assets/cards/**/*.png', { eager: true, import: 'default' })

const getCardImageUrl = (cardName, imageDir) => {
  const path = `../hearthstone-achievements/assets/cards/${imageDir}/${cardName}.png`
  return cardImages[path] || null
}

// 给成就附加卡牌图片和版本信息
const attachCards = (ach, exp) => ({
  ...ach,
  cards: (ach.relatedCards || []).map((name) => ({
    name,
    image: getCardImageUrl(name, exp.cardImageDir)
  })),
  _expansionId: exp.id,
  _expansionName: exp.name
})

// 所有成就（带版本信息和卡牌）
const allAchievements = computed(() => {
  const all = []
  for (const exp of expansions) {
    for (const ach of exp.achievements) {
      all.push(attachCards(ach, exp))
    }
  }
  return all
})

// 状态
const viewMode = ref('expansion')
const myGroupBy = ref('expansion') // 'expansion' | 'class'
const currentExpansionId = ref(expansions[0].id)
const currentClass = ref('圣骑士')
const query = ref('')
const selectedClass = ref('all')
const selectedDifficulty = ref('all')
const selectedType = ref('all')
const selectedStatus = ref('未完成')

const modalCards = ref([])
const modalTitle = ref('')
const modalVisible = ref(false)

const difficulties = ['易', '中等', '难']
const types = ['一次性', '累计']
const statuses = ['未完成', '已完成']

// 所有职业列表
const allClasses = getClassOrder().filter(c => c !== '双职业' && c !== '中立').concat(['双职业', '中立'])
const classOrder = getClassOrder()

// 当前版本
const currentExpansion = computed(() =>
  expansions.find((exp) => exp.id === currentExpansionId.value)
)

const currentClassName = computed(() => currentClass.value)
const onClassTabClick = (cls) => {
  if (myGroupBy.value === 'almost' || myGroupBy.value === 'priority') {
    almostClassFilter.value = cls
  }
  currentClass.value = cls
}
const myViewSubLabel = computed(() => {
  if (myGroupBy.value === 'almost') return '快完成'
  if (myGroupBy.value === 'priority') return '推荐冲刺'
  return myGroupBy.value === 'expansion' ? currentExpansion.value?.name : currentClassName.value
})

// 当前版本的成就
const currentExpansionAchievements = computed(() => {
  const exp = currentExpansion.value
  if (!exp) return []
  return exp.achievements.map(ach => attachCards(ach, exp))
})

// 当前职业的成就（按职业浏览模式）
const currentClassAchievements = computed(() => {
  return allAchievements.value.filter((ach) => ach.heroClass === currentClass.value)
})

// 我的成就模式 - 当前范围的成就列表
const myAchievementsList = computed(() => {
  if (myGroupBy.value === 'almost') return almostDoneList.value
  if (myGroupBy.value === 'priority') return priorityAllList.value
  if (myGroupBy.value === 'expansion') {
    return currentExpansionAchievements.value
  } else {
    return allAchievements.value.filter((ach) => ach.heroClass === currentClass.value)
  }
})

// 推荐冲刺分组：按投入产出比分为 A/B/C/D 四档
const priorityGroups = computed(() => {
  const A = [] // 一次即成（零成本）
  const B = [] // 累计还差 ≤20（做几把就满）
  const C = [] // 累计还差 21~50（中等投入）
  const D = [] // 一次性剩多阶段（优先级最低）

  for (const ach of allAchievements.value) {
    if (almostVersionFilter.value !== 'all' && ach._expansionId !== almostVersionFilter.value) continue
    if (almostClassFilter.value !== 'all' && ach.heroClass !== almostClassFilter.value) continue
    const info = getProgressInfo(ach)
    if (info.completed) continue
    if (ach.type === '累计') {
      const rem = info.remainingCount
      if (rem <= 1) A.push(ach)
      else if (rem <= 20) B.push(ach)
      else if (rem <= 50) C.push(ach)
    } else {
      if (info.remainingCount === 1 && info.doneStages >= 1) A.push(ach)
      else if (info.totalStages === 1 && info.doneStages === 0) A.push(ach)
      else D.push(ach)
    }
  }

  const sortByRemaining = (list) => {
    return [...list].sort((a, b) => {
      const ia = getProgressInfo(a)
      const ib = getProgressInfo(b)
      if (ia.remainingCount !== ib.remainingCount) return ia.remainingCount - ib.remainingCount
      return ib.percent - ia.percent
    })
  }

  return {
    A: sortByRemaining(A),
    B: sortByRemaining(B),
    C: sortByRemaining(C),
    D: sortByRemaining(D)
  }
})
const priorityAllList = computed(() => [
  ...priorityGroups.value.A,
  ...priorityGroups.value.B,
  ...priorityGroups.value.C,
  ...priorityGroups.value.D
])

// 累计成就"快完成"：所有未完成(含 0% 未启动)的累计成就，按"还差最少"排序（展示全部，前端分页）
const almostCumulativeList = computed(() => {
  return allAchievements.value
    .filter((ach) => {
      if (ach.type !== '累计') return false
      const info = getProgressInfo(ach)
      if (info.completed) return false
      if (almostVersionFilter.value !== 'all' && ach._expansionId !== almostVersionFilter.value) return false
      if (almostClassFilter.value !== 'all' && ach.heroClass !== almostClassFilter.value) return false
      // 0% 未启动的也展示，靠"还差次数"排序自然落到末尾
      return true
    })
    .sort((a, b) => {
      const ia = getProgressInfo(a)
      const ib = getProgressInfo(b)
      if (ia.remainingCount !== ib.remainingCount) return ia.remainingCount - ib.remainingCount
      return ib.percent - ia.percent
    })
})

// 累计区分页（可配置每页数量：10 / 20 / 50）
const pageSizes = [10, 20, 50]
const cumulativePageSize = ref(10)
const cumulativePage = ref(1)
const almostCumulativeTotalPages = computed(() =>
  Math.max(1, Math.ceil(almostCumulativeList.value.length / cumulativePageSize.value))
)
const almostCumulativePaged = computed(() => {
  const start = (cumulativePage.value - 1) * cumulativePageSize.value
  return almostCumulativeList.value.slice(start, start + cumulativePageSize.value)
})
// 切换每页数量时回到第 1 页
watch(cumulativePageSize, () => { cumulativePage.value = 1 })

// 一次性成就"快完成"：所有未完成的(含 0% 未启动)，按还差最少排序
const almostOneTimeList = computed(() => {
  return allAchievements.value
    .filter((ach) => {
      if (ach.type === '累计') return false
      const info = getProgressInfo(ach)
      if (almostVersionFilter.value !== 'all' && ach._expansionId !== almostVersionFilter.value) return false
      if (almostClassFilter.value !== 'all' && ach.heroClass !== almostClassFilter.value) return false
      // 所有未完成的(含 0% 未启动)都展示，按"还差阶段"排序
      return !info.completed
    })
    .sort((a, b) => {
      const ia = getProgressInfo(a)
      const ib = getProgressInfo(b)
      if (ia.remainingCount !== ib.remainingCount) return ia.remainingCount - ib.remainingCount
      return ib.percent - ia.percent
    })
})

// 一次性区分页（可配置每页数量：10 / 20 / 50）
const oneTimePageSize = ref(10)
const oneTimePage = ref(1)
const almostOneTimeTotalPages = computed(() =>
  Math.max(1, Math.ceil(almostOneTimeList.value.length / oneTimePageSize.value))
)
const almostOneTimePaged = computed(() => {
  const start = (oneTimePage.value - 1) * oneTimePageSize.value
  return almostOneTimeList.value.slice(start, start + oneTimePageSize.value)
})
// 切换每页数量时回到第 1 页
watch(oneTimePageSize, () => { oneTimePage.value = 1 })

// 快完成视图：版本 / 职业 筛选
const almostVersionFilter = ref('all')
const almostClassFilter = ref('all')
const versionOptions = computed(() => expansions.map((e) => ({ id: e.id, name: e.name })))
// 筛选条件变化时回到第 1 页
watch([almostVersionFilter, almostClassFilter], () => {
  cumulativePage.value = 1
  oneTimePage.value = 1
})

// 合并（供 myAchievementsList / 统计使用）
const almostDoneList = computed(() => [...almostCumulativeList.value, ...almostOneTimeList.value])

const almostCumulativeRemainTotal = computed(() =>
  almostCumulativeList.value.reduce((sum, a) => sum + (getProgressInfo(a).remainingCount || 0), 0)
)
const almostOneTimeRemainTotal = computed(() =>
  almostOneTimeList.value.reduce((sum, a) => sum + (getProgressInfo(a).remainingCount || 0), 0)
)

// 快完成统计
const almostStats = computed(() => ({ count: almostDoneList.value.length }))

// 展示的成就列表
const displayAchievements = computed(() => {
  if (viewMode.value === 'my') return myAchievementsList.value
  if (viewMode.value === 'class') return currentClassAchievements.value
  return currentExpansionAchievements.value
})

// 可用职业筛选
const getAvailableClassesForList = (list) => {
  const classes = new Set()
  for (const ach of list) {
    classes.add(ach.heroClass || '中立')
  }
  return getClassOrder().filter((c) => classes.has(c))
}

const availableClassesExp = computed(() => getAvailableClassesForList(currentExpansionAchievements.value))
const availableClassesMy = computed(() => getAvailableClassesForList(myAchievementsList.value))

const filterAvailableClasses = computed(() => {
  if (viewMode.value === 'class') return []
  return viewMode.value === 'my' ? availableClassesMy.value : availableClassesExp.value
})

// 筛选成就
const filterAchievements = (list) => {
  const text = query.value.trim().toLowerCase()
  return list.filter((ach) => {
    if (selectedClass.value !== 'all' && ach.heroClass !== selectedClass.value) return false
    if (selectedDifficulty.value !== 'all' && ach.difficulty !== selectedDifficulty.value) return false
    if (selectedType.value !== 'all' && ach.type !== selectedType.value) return false
    if (viewMode.value === 'my' && selectedStatus.value !== 'all') {
      const completed = isAchievementCompleted(ach)
      if (selectedStatus.value === '已完成' && !completed) return false
      if (selectedStatus.value === '未完成' && completed) return false
    }
    if (text) {
      const targets = [ach.name, ach.heroClass, ...(ach.relatedCards || []), ...ach.stages.map((s) => s.description)]
      return targets.filter(Boolean).some((v) => String(v).toLowerCase().includes(text))
    }
    return true
  })
}

const filteredAchievements = computed(() => filterAchievements(displayAchievements.value))

	// 按职业分组（按版本浏览 / 我的-按版本）
const filteredByClass = computed(() => groupByClass(filteredAchievements.value))

// 我的成就-按职业分组：未完成排前面
const myFilteredByClass = computed(() => {
  const groups = groupByClass(filteredAchievements.value)
  for (const cls in groups) {
    groups[cls] = [...groups[cls]].sort((a, b) => {
      return (isAchievementCompleted(a) ? 1 : 0) - (isAchievementCompleted(b) ? 1 : 0)
    })
  }
  return groups
})

// 按版本分组（按职业浏览）
const groupByExpansion = (list) => {
  const groups = {}
  for (const exp of expansions) {
    const achs = list.filter((a) => a._expansionId === exp.id)
    if (achs.length > 0) groups[exp.id] = achs
  }
  return groups
}
const filteredByExpansion = computed(() => groupByExpansion(filteredAchievements.value))

// 我的成就-按版本分组：未完成排前面
const myFilteredByExpansion = computed(() => {
  const groups = {}
  for (const exp of expansions) {
    let achs = filteredAchievements.value.filter((a) => a._expansionId === exp.id)
    if (achs.length > 0) {
      achs = [...achs].sort((a, b) => {
        return (isAchievementCompleted(a) ? 1 : 0) - (isAchievementCompleted(b) ? 1 : 0)
      })
      groups[exp.id] = achs
    }
  }
  return groups
})

// 我的成就统计
const myStats = computed(() => getStats(myAchievementsList.value))
const myCompletedCount = computed(() =>
  myAchievementsList.value.filter(ach => isAchievementCompleted(ach)).length
)

// 切换视图时重置筛选
watch(viewMode, () => {
  query.value = ''
  selectedClass.value = 'all'
  selectedDifficulty.value = 'all'
  selectedType.value = 'all'
  selectedStatus.value = viewMode.value === 'my' ? '未完成' : 'all'
  closeModal()
})

watch(myGroupBy, () => {
  query.value = ''
  selectedClass.value = 'all'
  selectedDifficulty.value = 'all'
  selectedType.value = 'all'
  selectedStatus.value = '未完成'
  cumulativePage.value = 1
  oneTimePage.value = 1
  closeModal()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

watch(currentExpansionId, () => {
  if (viewMode.value === 'expansion' || (viewMode.value === 'my' && myGroupBy.value === 'expansion')) {
    query.value = ''
    selectedClass.value = 'all'
    selectedDifficulty.value = 'all'
    selectedType.value = 'all'
    selectedStatus.value = viewMode.value === 'my' ? '未完成' : 'all'
    closeModal()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

watch(currentClass, () => {
  if (viewMode.value === 'class' || (viewMode.value === 'my' && myGroupBy.value === 'class')) {
    query.value = ''
    selectedClass.value = 'all'
    selectedDifficulty.value = 'all'
    selectedType.value = 'all'
    selectedStatus.value = viewMode.value === 'my' ? '未完成' : 'all'
    closeModal()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
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

const expansionColor = '#6b5b4f'
const getExpansionStyle = () => ({
  borderColor: expansionColor,
  backgroundColor: `${expansionColor}08`
})
const getExpansionBadgeStyle = () => ({
  backgroundColor: expansionColor,
  color: '#fff'
})

const showEmpty = computed(() => filteredAchievements.value.length === 0)
</script>
