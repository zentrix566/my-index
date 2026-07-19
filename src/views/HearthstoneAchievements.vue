<template>
  <section class="section page-section hs-page">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Hearthstone</p>
        <h1>炉石传说成就查看器</h1>
        <p>浏览成就数据，或记录自己的成就完成进度。支持按职业/难度/类型筛选，查看关联卡牌图片，一键复制推荐卡组代码。</p>
      </div>

      <!-- 介绍 + 登录态 -->
      <div class="hs-intro">
        <p class="hs-intro-text">
          这是你的炉石成就专属进度本：登录后可保存自己的完成进度、按版本/职业查看、一键编辑并自动统计完成度；未登录也能浏览全部成就定义，并以示例账号预览登录后的效果。
        </p>
        <div class="hs-intro-actions">
          <template v-if="user">
            <span class="hs-user-badge">👤 {{ user.username }}</span>
            <button type="button" class="hs-btn hs-btn-ghost" @click="logoutAndRefresh">退出</button>
          </template>
          <template v-else>
            <button type="button" class="hs-btn hs-btn-primary" @click="router.push('/login')">登录 / 注册</button>
          </template>
          <button type="button" class="hs-btn hs-btn-ghost" @click="goChangelog">更新说明</button>
        </div>
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
              <template v-else>{{ myViewSubLabel }}</template>
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
        <div v-if="!user" class="hs-example-banner">
          <span>🔍 当前展示的是 <strong>示例账号</strong> 的进度（只读预览）。</span>
          <button type="button" class="hs-link" @click="router.push('/login')">登录 / 注册</button>
          <span>后即可查看并保存你自己的进度。</span>
        </div>
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

        <div v-if="progressLoading" class="hs-progress-status" role="status">正在加载成就进度…</div>
        <div v-else-if="progressError" class="hs-progress-status hs-progress-error" role="alert">
          成就进度加载失败，当前显示的数据可能不是最新的。
          <button type="button" @click="reloadProgress">重试</button>
        </div>

        <div class="hs-stats-panel">
          <template v-if="myGroupBy === 'almost'">
            <div class="hs-stats-info">
              <span class="hs-stats-percent">🔥 {{ almostStats.count }}</span>
              <span class="hs-stats-detail">
                接近完成：累计 {{ almostCumulativeList.length }} 个 · 一次性 {{ almostOneTimeList.length }} 个，按"还差最少"排序
              </span>
            </div>
          </template>
          <template v-else-if="myGroupBy === 'priority'">
            <div class="hs-stats-info">
              <span class="hs-stats-percent">🚀 {{ priorityAllList.length }}</span>
              <span class="hs-stats-detail">
                推荐冲刺目标：A 组 {{ priorityGroups.A.length }} · B 组 {{ priorityGroups.B.length }} · C 组 {{ priorityGroups.C.length }} · D 组 {{ priorityGroups.D.length }} · E 组 {{ priorityGroups.E.length }}
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
              <span class="hs-stats-detail hs-xp-line">
                已获经验 <b>{{ myEarnedXpBonus }}</b> / 总经验 {{ myStats.totalXp }}
                <template v-if="passBonus > 0">（基础 {{ myStats.earnedXp }}，通行证 +{{ passBonusPercent }}%）</template>
              </span>
            </div>
            <div class="hs-stats-bar">
              <div class="hs-stats-bar-fill" :style="{ width: myStats.percentage + '%' }"></div>
            </div>
          </template>
        </div>

        <!-- 本地备份：导出 / 导入 -->
        <div class="hs-export-bar" v-if="viewMode === 'my'">
          <span class="hs-export-label">本地备份：</span>
          <button type="button" class="hs-btn hs-btn-ghost" @click="exportJson">导出 JSON</button>
          <button type="button" class="hs-btn hs-btn-ghost" :disabled="exporting" @click="exportExcel">
            {{ exporting ? '导出中…' : '导出 Excel' }}
          </button>
          <button type="button" class="hs-btn hs-btn-ghost" :disabled="!user" @click="triggerImport">导入 JSON</button>
          <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="onImportFile" />
          <span v-if="!user" class="hs-export-hint">导入需先登录</span>
          <label class="hs-pass">
            通行证加成：
            <select v-model.number="passBonus" class="hs-pass-select">
              <option v-for="o in PASS_BONUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
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
        <span v-if="viewMode === 'expansion' || (viewMode === 'my' && myGroupBy === 'expansion')">
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

        <section v-if="priorityGroups.E.length" class="hs-priority-group hs-priority-group-e">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              🐢 E 组 · 累计还差 ≥51 次（长期目标，{{ priorityGroups.E.length }} 个）
            </h3>
            <span class="hs-priority-group-tip">需大量投入，慢慢磨</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in priorityGroups.E"
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

      <EditProgressModal
        :visible="editVisible"
        :achievement="editAchievement"
        @close="editVisible = false"
        @save="saveProgress"
      />

      <ScrollToTop />

      <transition name="hs-toast-fade">
        <div v-if="toast.show" class="hs-toast" :class="toast.type" role="alert">
          <span class="hs-toast-icon">{{ toast.type === 'success' ? '✓' : '✕' }}</span>
          <span class="hs-toast-msg">{{ toast.message }}</span>
        </div>
      </transition>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { expansions } from '../hearthstone-achievements/data/expansions.js'
import { classColors, getClassOrder, groupByClass } from '../hearthstone-achievements/utils/achievements.js'
import { useAchievementProgress } from '../hearthstone-achievements/composables/useAchievementProgress.js'
import { useAuth } from '../auth/useAuth.js'
import EditProgressModal from '../hearthstone-achievements/components/EditProgressModal.vue'

import ExpansionTabs from '../hearthstone-achievements/components/ExpansionTabs.vue'
import FilterBar from '../hearthstone-achievements/components/FilterBar.vue'
import ClassSection from '../hearthstone-achievements/components/ClassSection.vue'
import CardModal from '../hearthstone-achievements/components/CardModal.vue'
import ScrollToTop from '../hearthstone-achievements/components/ScrollToTop.vue'
import MyAchievementCard from '../hearthstone-achievements/components/MyAchievementCard.vue'

const { user, init: initAuth, logout } = useAuth()
const router = useRouter()
const userAch = useAchievementProgress() // 默认加载当前用户进度到 progressData
const exampleProgress = ref({})
// 未登录展示所有者示例进度；登录展示自己的进度
// 注意：必须取 .value（解包一层 ref），否则 displayProgress.value 仍是 ref 套 ref，
// useAchievementProgress 里 progress.value[achId] 会访问到 ref 对象而非数据，导致全部判定未完成。
const displayProgress = computed(() => (user.value ? userAch.progress.value : exampleProgress.value))
const {
  getStats,
  getAchievementXp,
  isAchievementCompleted,
  getProgressInfo,
  isStageCompleted,
  getCount,
  isAlmostDone,
  loading: progressLoading,
  error: progressError,
  reload: reloadProgress
} = useAchievementProgress(displayProgress)

// 初始化：加载认证态；未登录时加载示例进度
initAuth()
const loadExample = async () => {
  if (Object.keys(exampleProgress.value).length > 0) return
  try {
    const resp = await fetch('/api/achievements/example')
    if (resp.ok) exampleProgress.value = await resp.json()
  } catch {
    /* 静默失败 */
  }
}
// 登录态变化：登录后重新拉取「自己的」进度（单例初始以匿名拉取过，需强制刷新）；
// 未登录时加载示例账号进度用于只读预览。
watch(user, (u) => {
  if (u) reloadProgress()
  else loadExample()
}, { immediate: true })

// 编辑进度弹窗
const editVisible = ref(false)
const editAchievement = ref(null)
function openEditModal(achievement) {
  editAchievement.value = achievement
  editVisible.value = true
}
// 轻量提示（成功/失败），替代原生 alert
const toast = ref({ show: false, type: '', message: '' })
let toastTimer = null
function showToast(type, message) {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = { ...toast.value, show: false } }, 2600)
}

async function saveProgress(payload) {
  try {
    const resp = await fetch('/api/achievements/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: { [payload.id]: { stages: payload.stages, count: payload.count } }
      })
    })
    if (!resp.ok) throw new Error('保存失败')
    await reloadProgress() // 重新拉取自己的进度
    editVisible.value = false
    showToast('success', '保存成功')
  } catch (e) {
    showToast('error', e.message || '保存失败，请重试')
  }
}
function logoutAndRefresh() {
  logout()
  reloadProgress()
}
function goChangelog() {
  router.push('/changelog')
}

// ============ 本地备份：导出 / 导入 ============
const exporting = ref(false)
const fileInput = ref(null)

// 生成「下一步要做的事」文字描述（用于导出的可读性进度）
function nextTodoText(ach) {
  if (isAchievementCompleted(ach)) return '已完成'
  const stages = ach.stages || []
  if (ach.type === '累计') {
    const count = getCount(ach) ?? 0
    const next = stages.find(s => count < (s.quota || 0))
    const quota = next ? next.quota : (stages[stages.length - 1]?.quota || 0)
    const remain = Math.max(0, quota - count)
    const desc = (next && next.description) || '累计目标'
    return remain > 0 ? `累计 ${count}/${quota}：${desc}（还差 ${remain} 次）` : '待完成'
  }
  for (let i = 0; i < stages.length; i++) {
    if (!isStageCompleted(ach, i)) {
      const desc = stages[i].description || `阶段${i + 1}`
      return `下一步：阶段${i + 1} ${desc}`.replace(/\s+$/, '')
    }
  }
  return '待完成'
}

// 构建导出用的「每行一个成就」表格数据（面向游戏爱好者精简版）
function buildExportRows() {
  const rows = []
  for (const ach of allAchievements.value) {
    const completed = isAchievementCompleted(ach)
    rows.push({
      '版本': ach._expansionName,
      '职业': ach.heroClass,
      '成就名称': ach.name,
      '成就详情': (ach.stages || []).map((s, i) => `阶段${i + 1}：${s.description || ''}`).join(' | '),
      '目前进度': completed ? '已完成' : nextTodoText(ach),
      '类型': ach.type,
      '难度': ach.difficulty,
      '经验值': Math.round(getAchievementXp(ach) * (1 + passBonus.value)),
      '成就值': (ach.stages || []).reduce((s, st) => s + (st.points || 0), 0)
    })
  }
  return rows
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 导出 JSON：含可再导入的 progress 与统计摘要
function exportJson() {
  const data = {
    meta: {
      app: '炉石传说成就查看器',
      exportedAt: new Date().toISOString(),
      user: user.value ? user.value.username : '示例账号',
      scope: viewMode.value === 'my' ? myGroupBy.value : viewMode.value
    },
    progress: displayProgress.value || {},
    todoList: allAchievements.value.map(ach => ({
      id: ach.id,
      name: ach.name,
      type: ach.type,
      completed: isAchievementCompleted(ach),
      nextTodo: nextTodoText(ach)
    })),
    summary: {
      total: allAchievements.value.length,
      completed: myCompletedCount.value,
      stats: myStats.value,
      passBonus: passBonus.value,
      passBonusPercent: passBonusPercent.value,
      earnedXp: myStats.value.earnedXp,
      earnedXpWithBonus: myEarnedXpBonus.value,
      totalXp: myStats.value.totalXp
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `hearthstone-progress-${Date.now()}.json`)
}

// 导出 Excel：生成真正的 .xlsx，每行一个成就
async function exportExcel() {
  exporting.value = true
  try {
    const rows = buildExportRows()
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 16 }, { wch: 10 }, { wch: 28 }, { wch: 50 }, { wch: 40 },
      { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, '成就进度')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, `hearthstone-progress-${Date.now()}.xlsx`)
    } catch (e) {
      showToast('error', '导出 Excel 失败：' + (e.message || e))
    } finally {
    exporting.value = false
  }
}

// 触发文件选择（导入需登录）
function triggerImport() {
  if (!user.value) {
    showToast('error', '请先登录后再导入进度')
    return
  }
  fileInput.value?.click()
}

// 从 JSON 文件导入进度（复用后端 PUT 接口保存）
async function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result)
      const progress = parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : parsed
      if (!progress || typeof progress !== 'object') throw new Error('文件格式不正确')
      const resp = await fetch('/api/achievements/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      })
      if (!resp.ok) throw new Error('导入失败（' + resp.status + '）')
      await reloadProgress()
      showToast('success', '进度导入成功')
    } catch (err) {
      showToast('error', '导入失败：' + (err.message || err))
    } finally {
      e.target.value = '' // 允许重复选择同一文件
    }
  }
  reader.readAsText(file)
}

// 动态加载所有卡牌图片
const cardImageLoaders = import.meta.glob('../hearthstone-achievements/assets/cards/**/*.png', { import: 'default' })

const getCardImageLoader = (cardName, imageDir) => {
  const path = `../hearthstone-achievements/assets/cards/${imageDir}/${cardName}.png`
  return cardImageLoaders[path] || null
}

// 给成就附加卡牌图片和版本信息
const attachCards = (ach, exp) => ({
  ...ach,
  cards: (ach.relatedCards || []).map((name) => ({
    name,
    imageLoader: getCardImageLoader(name, exp.cardImageDir)
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
  const prefix = user.value ? '我的进度' : '示例进度'
  if (myGroupBy.value === 'almost') return `${prefix} - 快完成`
  if (myGroupBy.value === 'priority') return `${prefix} - 推荐冲刺`
  const scope = myGroupBy.value === 'expansion' ? currentExpansion.value?.name : currentClassName.value
  return `${prefix} - ${scope}`
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
  const E = [] // 累计还差 ≥51（长期目标，最大投入）

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
      else E.push(ach)
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
    D: sortByRemaining(D),
    E: sortByRemaining(E)
  }
})
const priorityAllList = computed(() => [
  ...priorityGroups.value.A,
  ...priorityGroups.value.B,
  ...priorityGroups.value.C,
  ...priorityGroups.value.D,
  ...priorityGroups.value.E
])

// 累计成就"快完成"：所有未完成(含 0% 未启动)的累计成就，按"还差最少"排序（展示全部，前端分页）
const almostCumulativeList = computed(() => {
  return allAchievements.value
    .filter((ach) => {
      if (ach.type !== '累计') return false
      const info = getProgressInfo(ach)
      if (info.completed) return false
      if (!isAlmostDone(ach)) return false
      if (almostVersionFilter.value !== 'all' && ach._expansionId !== almostVersionFilter.value) return false
      if (almostClassFilter.value !== 'all' && ach.heroClass !== almostClassFilter.value) return false
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
      if (!isAlmostDone(ach)) return false
      if (almostVersionFilter.value !== 'all' && ach._expansionId !== almostVersionFilter.value) return false
      if (almostClassFilter.value !== 'all' && ach.heroClass !== almostClassFilter.value) return false
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

// 通行证经验加成：默认不加成；可选 10% / 15% / 20%
const PASS_BONUS_OPTIONS = [
  { label: '无加成', value: 0 },
  { label: '通行证 +10%', value: 0.1 },
  { label: '通行证 +15%', value: 0.15 },
  { label: '通行证 +20%', value: 0.2 }
]
const passBonus = ref(0)
const passBonusPercent = computed(() => Math.round(passBonus.value * 100))
// 已获得经验（受通行证加成影响，网页显示与导出都用它）
const myEarnedXpBonus = computed(() =>
  Math.round((myStats.value.earnedXp || 0) * (1 + passBonus.value))
)
// 总经验（受加成，仅作参考）
const myTotalXpBonus = computed(() =>
  Math.round((myStats.value.totalXp || 0) * (1 + passBonus.value))
)

const resetFilters = () => {
  query.value = ''
  selectedClass.value = 'all'
  selectedDifficulty.value = 'all'
  selectedType.value = 'all'
  selectedStatus.value = viewMode.value === 'my' ? '未完成' : 'all'
}

const resetViewState = ({ resetPages = false, scroll = false } = {}) => {
  resetFilters()
  closeModal()
  if (resetPages) {
    cumulativePage.value = 1
    oneTimePage.value = 1
  }
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 切换视图时重置筛选
watch(viewMode, () => {
  resetViewState()
})

watch(myGroupBy, () => {
  resetViewState({ resetPages: true, scroll: true })
})

watch(currentExpansionId, () => {
  if (viewMode.value === 'expansion' || (viewMode.value === 'my' && myGroupBy.value === 'expansion')) {
    resetViewState({ scroll: true })
  }
})

watch(currentClass, () => {
  if (viewMode.value === 'class' || (viewMode.value === 'my' && myGroupBy.value === 'class')) {
    resetViewState({ scroll: true })
  }
})

// 弹窗
const openCardModal = async (achievement) => {
  // 我的成就 + 已登录：打开进度编辑
  if (viewMode.value === 'my' && user.value) {
    openEditModal(achievement)
    return
  }
  // 我的成就 + 未登录：示例数据仅供预览，引导登录
  if (viewMode.value === 'my' && !user.value) {
    router.push('/login')
    return
  }
  // 浏览模式：查看关联卡牌图片
  if (!achievement.cards || !achievement.cards.some((card) => card.imageLoader)) return
  modalTitle.value = achievement.name
  modalCards.value = await Promise.all(achievement.cards.map(async (card) => {
    if (!card.imageLoader) return { ...card, image: null }
    try {
      return { ...card, image: await card.imageLoader() }
    } catch {
      return { ...card, image: null }
    }
  }))
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

<style scoped>
.hs-export-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 4px;
  padding: 10px 12px;
  background: #faf7f2;
  border: 1px solid #efe7da;
  border-radius: 10px;
}
.hs-export-label {
  font-size: 13px;
  font-weight: 600;
  color: #6b5b4f;
}
.hs-export-hint {
  font-size: 12px;
  color: #b08968;
}
.hs-pass {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: #6b5b4f;
}
.hs-pass-select {
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid #e3d8c7;
  border-radius: 8px;
  background: #fff;
  color: #4a3f37;
  cursor: pointer;
}
.hs-pass-select:focus {
  outline: none;
  border-color: #c9a86a;
}
.hs-xp-line {
  margin-top: 2px;
}
.hs-xp-line b {
  color: #c9881f;
}
.hs-btn[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}
.hs-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 90vw;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}
.hs-toast.success {
  background: #2e9e5b;
}
.hs-toast.error {
  background: #d64545;
}
.hs-toast-icon {
  font-weight: 700;
}
.hs-toast-fade-enter-active,
.hs-toast-fade-leave-active {
  transition: opacity .25s ease, transform .25s ease;
}
.hs-toast-fade-enter-from,
.hs-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
