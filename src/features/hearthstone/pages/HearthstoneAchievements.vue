<template>
  <section
    class="section page-section hs-page"
    :class="{ 'hs-compact': compactMode }"
    :data-hs-theme="hsTheme"
  >
    <div class="container">
      <HearthstoneAchievementsHero
        :user="user"
        :hs-theme="hsTheme"
        :achievement-count="allAchievements.length"
        :expansion-count="expansions.length"
        @navigate="router.push"
        @logout="logoutAndRefresh"
        @toggle-theme="toggleTheme"
        @contact="contactAuthor"
      />

      <!-- AI 成就建议：悬浮按钮（仅登录 + 我的成就视图），点击打开弹窗 -->
      <button
        v-if="AI_ADVISOR_ENABLED && user && viewMode === 'my'"
        type="button"
        class="hs-ai-fab"
        title="AI 成就建议（实验）"
        aria-label="打开 AI 成就建议"
        @click="openAi"
      >🤖</button>

      <!-- 视图模式切换 + 版本/职业选择：滚动时固定在顶部 -->
      <div class="hs-sticky-controls" ref="stickyRef">
      <div class="hs-view-switch" role="tablist" aria-label="浏览方式">
        <button
          :class="{ active: viewMode === 'expansion' }"
          type="button"
          role="tab"
          :aria-selected="viewMode === 'expansion'"
          @click="viewMode = 'expansion'"
        >
          按版本浏览
        </button>
        <button
          :class="{ active: viewMode === 'class' }"
          type="button"
          role="tab"
          :aria-selected="viewMode === 'class'"
          @click="viewMode = 'class'"
        >
          按职业浏览
        </button>
        <button
          :class="{ active: viewMode === 'my' }"
          type="button"
          role="tab"
          :aria-selected="viewMode === 'my'"
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
              <template v-if="viewMode === 'expansion'">{{ currentExpansion?.name }} · 共 {{ currentExpansionAchievements.length }} 个成就</template>
              <template v-else-if="viewMode === 'class'">{{ currentClassName }} · 共 {{ filteredAchievements.length.toLocaleString() }} 个成就</template>
              <template v-else>{{ myViewSubLabel }}</template>
            </p>
          </div>
          <div
            v-if="viewMode === 'expansion' && currentExpansion?.referenceLinks && currentExpansion.referenceLinks.length > 0"
            class="hs-guide-dropdown hs-guide-dropdown-inline hs-guide-hover"
          >
            <button type="button" class="hs-guide-btn-inline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              攻略
            </button>
            <div class="hs-guide-menu">
              <a
                v-for="link in currentExpansion.referenceLinks"
                :key="link.url"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="hs-guide-menu-item"
              >{{ link.name }}</a>
            </div>
          </div>
        </div>
        <div class="hs-top-actions">
          <!-- 我的成就：子切换（按版本/按职业/待完成清单）移入顶栏左侧，填充奖杯行空白；展开/收起为独立按钮（同按版本浏览） -->
          <template v-if="viewMode === 'my'">
            <div class="hs-my-sub-switch">
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
                :class="{ active: myGroupBy === 'sprint' }"
                type="button"
                @click="myGroupBy = 'sprint'"
              >待完成清单</button>
            </div>
            <div v-if="showMySectionToggles" class="hs-section-toggles">
              <button type="button" class="hs-tiny-btn" @click="expandAllSections">展开全部</button>
              <button type="button" class="hs-tiny-btn" @click="collapseAllSections">收起全部</button>
              <!-- 硬核模式：ON/OFF 开关（置于展开/收起之后，吸顶始终可见，免去滚动到操作行去开关） -->
              <HardcoreModeToggle
                v-model="hardcore"
                :expansion-count="expansions.length"
                :core-expansion-count="originalExpansions.length"
                action="统计"
              />
            </div>
          </template>
          <!-- 按版本浏览：版本选择（我的成就模式下版本/职业选择移到子切换下方） -->
          <AchievementExpansionSelector
            v-if="viewMode === 'expansion'"
            v-model="currentExpansionId"
            :original-expansions="originalExpansions"
            :added-expansions="addedExpansions"
            :show-more-versions="showMoreVersions"
          />
          <!-- 按职业浏览：职业选择 + 硬核模式开关（与「我的成就」一致，便于直接纳入全部版本） -->
          <div
            v-else-if="viewMode === 'class'"
            class="hs-class-top"
          >
            <AchievementClassTabs v-model="currentClass" :classes="allClasses" />
            <HardcoreModeToggle
              v-model="hardcore"
              :expansion-count="expansions.length"
              :core-expansion-count="originalExpansions.length"
              action="纳入"
            />
          </div>
          <!-- 展开全部 / 收起全部：三视图一致，紧跟版本 / 职业选择之后 -->
          <div v-if="showFabSectionToggles" class="hs-section-toggles">
            <button type="button" class="hs-tiny-btn" @click="expandAllSections">展开全部</button>
            <button type="button" class="hs-tiny-btn" @click="collapseAllSections">收起全部</button>
          </div>
        </div>
      </header>

      <!-- 我的成就模式：分组切换 + 统计面板（子切换/版本选择/操作行并入顶部吸顶块，滚动时整体固定） -->
      <template v-if="viewMode === 'my'">
        <div v-if="!user" class="hs-example-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <span>当前展示的是<strong>全部成就</strong>（未记录进度）。</span>
          <button type="button" class="hs-link" @click="router.push('/login')">登录 / 注册</button>
          <span>后即可记录并保存你自己的完成进度。</span>
        </div>
        <div class="hs-my-controls">
    <!-- 按版本：版本选择（在顶栏子切换下方）；硬核开启时含更多版本下拉 -->
    <AchievementExpansionSelector
      v-if="myGroupBy === 'expansion'"
      v-model="currentExpansionId"
      class="hs-my-selector"
      :original-expansions="originalExpansions"
      :added-expansions="addedExpansions"
      :show-more-versions="showMoreVersions"
    />
    <!-- 按职业：职业选择（在子切换下方） -->
    <AchievementClassTabs
      v-else-if="myGroupBy === 'class'"
      v-model="currentClass"
      class="hs-my-selector"
      :classes="allClasses"
    />

    <!-- 我的成就：搜索框上移到导出 Excel 之上（sprint 待完成清单用 searchOnly 只显示搜索框） -->
    <FilterBar
      v-model:query="query"
      v-model:selected-class="selectedClass"
      v-model:selected-difficulty="selectedDifficulty"
      v-model:selected-metric="selectedMetric"
      v-model:selected-status="selectedStatus"
      :available-classes="filterAvailableClasses"
      :difficulties="difficulties"
      :metrics="metrics"
      :statuses="statuses"
      :hide-class-filter="false"
      :show-status-filter="true"
      v-model:pass-bonus="passBonus"
      :pass-bonus-options="PASS_BONUS_OPTIONS"
      :show-pass-bonus="true"
      :search-only="myGroupBy === 'sprint'"
    />
        </div>
      </template>
      </div>

      <!-- 我的成就：操作行 / 进度状态 / 待完成清单统计 —— 不吸顶，随页面正常滚动，保住内容可视区域 -->
      <template v-if="viewMode === 'my'">
    <!-- 统一操作行：数据备份 / 批量完成 / 攻略 / 硬核模式（ON/OFF 开关） -->
    <div class="hs-my-actions">
      <details class="hs-guide-dropdown">
        <summary class="hs-guide-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
          </svg>
          {{ exporting ? '导出中…' : '导出与备份' }}
        </summary>
        <div class="hs-guide-menu hs-backup-menu">
          <button type="button" class="hs-guide-menu-item" :disabled="exporting" @click="exportExcel">
            导出 Excel
            <small>带摘要、筛选和多行阶段说明</small>
          </button>
          <button type="button" class="hs-guide-menu-item" @click="exportJson">
            导出 JSON
            <small>内容与 Excel 一致，可用于恢复进度</small>
          </button>
          <button v-if="user" type="button" class="hs-guide-menu-item" @click="triggerImport">
            导入 JSON 备份
            <small>合并恢复到当前账号</small>
          </button>
        </div>
      </details>
      <input
        ref="fileInput"
        class="hs-visually-hidden"
        type="file"
        accept="application/json,.json"
        @change="onImportFile"
      />
      <template v-if="user">
        <template v-if="!batchMode">
          <button type="button" class="hs-btn hs-btn-ghost" @click="startBatch">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            批量完成
          </button>
        </template>
        <template v-else>
          <span class="hs-batch-count">已选 <b>{{ selectedAchIds.length }}</b> 个</span>
          <button type="button" class="hs-btn hs-btn-ghost" @click="selectAllVisible">全选</button>
          <button type="button" class="hs-btn hs-btn-ghost" @click="clearSelection">清除</button>
          <button type="button" class="hs-btn hs-btn-primary" :disabled="selectedAchIds.length === 0 || savingProgress" @click="batchComplete">
            {{ savingProgress ? '保存中…' : '完成选中 (' + selectedAchIds.length + ')' }}
          </button>
          <button type="button" class="hs-btn hs-btn-ghost" @click="cancelBatch">取消</button>
        </template>
      </template>
      <!-- 攻略：跟在导出/批量完成之后；下拉展示各攻略标题，点击在新标签打开 -->
      <div
        v-if="myGroupBy === 'expansion' && currentExpansion?.referenceLinks && currentExpansion.referenceLinks.length > 0"
        class="hs-guide-dropdown hs-guide-hover"
      >
        <button type="button" class="hs-guide-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          攻略
        </button>
        <div class="hs-guide-menu">
          <a
            v-for="link in currentExpansion.referenceLinks"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="hs-guide-menu-item"
          >{{ link.name }}</a>
        </div>
      </div>
    </div>

    <div v-if="progressLoading" class="hs-progress-status" role="status">正在加载成就进度…</div>
        <div v-else-if="progressError" class="hs-progress-status hs-progress-error" role="alert">
          成就进度加载失败，当前显示的数据可能不是最新的。
          <button type="button" @click="reloadProgress">重试</button>
        </div>

        <section
          v-if="user && pinnedAchievements.length && !batchMode"
          class="hs-pinned-section"
          aria-labelledby="hs-pinned-title"
        >
          <div class="hs-pinned-section-head">
            <div>
              <p class="hs-pinned-eyebrow">优先追踪</p>
              <h2 id="hs-pinned-title">置顶成就</h2>
            </div>
            <div class="hs-pinned-section-meta">
              <span>{{ pinnedAchievements.length }} / {{ MAX_PINNED_ACHIEVEMENTS }} 项</span>
              <button
                type="button"
                class="hs-pinned-share-btn"
                :disabled="!pinnedAchievements.length"
                @click="openSharePinnedBundle"
                aria-label="一键分享置顶成就合集"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>
                分享合集
              </button>
            </div>
          </div>
          <div class="hs-pinned-list">
            <article
              v-for="achievement in pinnedAchievements"
              :key="achievement.id"
              class="hs-pinned-item"
            >
              <div class="hs-pinned-item-copy">
                <span>{{ achievement._expansionName }} · {{ getClassName(achievement) }}</span>
                <strong>{{ achievement.name }}</strong>
                <small>{{ pinnedProgressText(achievement) }}</small>
              </div>
              <div class="hs-pinned-item-actions">
                <button type="button" @click="openCardModal(achievement)">查看 / 编辑</button>
                <button
                  type="button"
                  class="remove"
                  :disabled="profileSaving"
                  @click="togglePinnedAchievement(achievement)"
                >
                  取消置顶
                </button>
              </div>
            </article>
          </div>
        </section>

        <!-- 待完成清单：说明（两行、数字高亮），置于顶部；筛选栏移至底部内容之后 -->
        <div class="hs-stats-panel hs-sprint-stats" v-if="myGroupBy === 'sprint'">
          <p class="hs-overview-summary-text" v-html="overviewSummaryHtml.line1"></p>
          <p class="hs-overview-summary-text" v-html="overviewSummaryHtml.line2"></p>
        </div>

      </template>

      <!-- 我的成就-按版本/按职业：总览面板（完成度进度条 + 一句话说明，默认展开） -->
      <div v-if="showClassOverview" class="hs-class-overview">
        <div class="hs-class-overview-head">
          <span class="hs-class-overview-head-title">完成进度</span>
        </div>
        <p v-if="isMyAddedVersion" class="hs-overview-note">
          当前浏览的是「更多版本」中的新增版本，仅用于查看成就，<strong>不计入「我的成就」统计</strong>（下方进度始终反映原有 9 个版本）。
        </p>
        <div class="hs-overview-progress">
          <div class="hs-overview-progress-fill" :style="{ width: overviewStats.percentage + '%' }"></div>
          <span class="hs-overview-progress-label">{{ overviewStats.percentage }}%</span>
        </div>
        <div class="hs-overview-summary">
          <p class="hs-overview-summary-text" v-html="overviewSummaryHtml.line1"></p>
          <p class="hs-overview-summary-text" v-html="overviewSummaryHtml.line2"></p>
        </div>
      </div>

      <FilterBar
        v-if="viewMode !== 'my'"
        v-model:query="query"
        v-model:selected-class="selectedClass"
        v-model:selected-difficulty="selectedDifficulty"
        v-model:selected-metric="selectedMetric"
        v-model:selected-status="selectedStatus"
        :available-classes="filterAvailableClasses"
        :difficulties="difficulties"
        :metrics="metrics"
        :statuses="statuses"
        :hide-class-filter="viewMode === 'class'"
        :show-status-filter="viewMode === 'my'"
        v-model:pass-bonus="passBonus"
        :pass-bonus-options="PASS_BONUS_OPTIONS"
        :show-pass-bonus="viewMode === 'my'"
      />

      <!-- 导出 / 批量完成已合并到「我的成就」统一操作行（hs-my-actions） -->


      <HearthstoneAchievementResults
        :view-mode="viewMode"
        :my-group-by="myGroupBy"
        :class-group-order="classGroupOrder"
        :filtered-by-class="filteredByClass"
        :class-view-collapsed="classViewCollapsed"
        :expansions="expansions"
        :filtered-by-expansion="filteredByExpansion"
        :exp-view-collapsed="expViewCollapsed"
        :exp-view-summaries="expViewSummaries"
        :my-filtered-by-class="myFilteredByClass"
        :class-view-summaries="classViewSummaries"
        :my-filtered-by-expansion="myFilteredByExpansion"
        :my-class-expansion-order="myClassExpansionOrder"
        :user="user"
        :batch-mode="batchMode"
        :selected-ach-ids="selectedAchIds"
        :pinned-ids="hearthstoneProfile.pinnedAchievementIds"
        :profile-saving="profileSaving"
        :sprint-groups="sprintGroups"
        :sprint-section-collapsed="sprintSectionCollapsed"
        :sprint-one-time-remain="sprintOneTimeRemain"
        :sprint-all-list="sprintAllList"
        :recommendations="ruleRecommendations"
        :recommendations-collapsed="sprintSectionCollapsed.recommendations"
        @set-class-collapsed="setClassCollapsed"
        @set-expansion-collapsed="setExpansionCollapsed"
        @toggle-sprint-section="toggleSprintSection"
        @card-click="openCardModal"
        @deck-click="openDeckDetail"
        @toggle-select="toggleSelect"
        @toggle-pin="togglePinnedAchievement"
        @share="openShareAchievement"
      />

      <div v-if="showEmpty && !(viewMode === 'my' && myGroupBy === 'sprint')" class="hs-empty-state">
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
        :saving="savingProgress"
        @close="editVisible = false"
        @save="saveProgress"
      />

      <DeckDetailModal
        v-if="deckDetailVisible"
        :visible="deckDetailVisible"
        :deck="deckDetailData"
        @close="deckDetailVisible = false"
      />

      <ShareAchievementModal
        v-if="shareState.visible"
        :visible="shareState.visible"
        :mode="shareState.mode"
        :achievement="shareState.achievement"
        :progress-info="shareState.achievement ? getProgressInfo(shareState.achievement) : null"
        :achievements="shareState.achievements"
        :get-progress-info="getProgressInfo"
        :user="user"
        @close="closeShare"
      />

      <ScrollToTop />

      <transition name="hs-toast-fade">
        <div v-if="toast.show" class="hs-toast" :class="toast.type" role="alert">
          <span class="hs-toast-icon">{{ toast.type === 'success' ? '✓' : '✕' }}</span>
          <span class="hs-toast-msg">{{ toast.message }}</span>
        </div>
      </transition>

      <!-- 成就达成庆祝提示 -->
      <transition name="hs-celebrate-fade">
        <div v-if="celebration.show" class="hs-celebrate" role="status" aria-live="polite">
          <div class="hs-celebrate-confetti">
            <span v-for="n in 10" :key="n" class="hs-confetti" :style="confettiStyle(n)"></span>
          </div>
          <div class="hs-celebrate-card">
            <div class="hs-celebrate-ring"></div>
            <div class="hs-celebrate-icon">🏆</div>
            <p class="hs-celebrate-eyebrow">成就达成</p>
            <h4 class="hs-celebrate-name">{{ celebration.name }}</h4>
            <p class="hs-celebrate-sub">{{ celebration.sub }}</p>
          </div>
        </div>
    </transition>
  </div>

    <!-- AI 成就建议弹窗（实验功能，独立模块，可随时下线） -->
    <Teleport to="body">
      <div v-if="showAi" class="ai-global-modal" @click.self="closeAi">
        <div ref="aiDialogElement" class="ai-global-modal-box" role="dialog" aria-modal="true" aria-label="AI 成就建议" tabindex="-1">
          <div class="ai-global-modal-head">
            <span class="ai-global-modal-title">🤖 AI 成就建议</span>
            <button type="button" class="ai-global-close" aria-label="关闭" @click="closeAi">×</button>
          </div>
          <AiAdvisor v-if="showAi" :hardcore="hardcore" :scope-versions="hardcore ? expansions.length : originalExpansions.length" />
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { expansions, originalExpansions, addedExpansions } from '../data/expansions.js'
import { getClassOrder, matchesClass, getClassName, CORE_EXPANSION_IDS } from '../utils/achievements.js'
import { useAchievementProgress } from '../composables/useAchievementProgress.js'
import { usePersistentRef } from '../composables/usePersistentRef.js'
import { useAchievementBackup } from '../composables/useAchievementBackup.js'
import { useAchievementFeedback } from '../composables/useAchievementFeedback.js'
import { useAchievementSprint } from '../composables/useAchievementSprint.js'
import { useAchievementCatalog } from '../composables/useAchievementCatalog.js'
import { useAchievementFilters } from '../composables/useAchievementFilters.js'
import { useAuth } from '../../../auth/useAuth.js'
import EditProgressModal from '../components/EditProgressModal.vue'

import FilterBar from '../components/FilterBar.vue'
import CardModal from '../components/CardModal.vue'
import ScrollToTop from '../components/ScrollToTop.vue'
import AchievementClassTabs from '../components/AchievementClassTabs.vue'
import AchievementExpansionSelector from '../components/AchievementExpansionSelector.vue'
import HardcoreModeToggle from '../components/HardcoreModeToggle.vue'
import HearthstoneAchievementsHero from '../components/HearthstoneAchievementsHero.vue'
import HearthstoneAchievementResults from '../components/HearthstoneAchievementResults.vue'
import { AI_ADVISOR_ENABLED } from '../ai/config.js'
import { rankAchievementRecommendations } from '../utils/achievementRecommendations.js'
import { saveAchievementProgress } from '../api/progress.js'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { useHearthstoneProfile } from '../composables/useHearthstoneProfile.js'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import { MAX_PINNED_ACHIEVEMENTS } from '../utils/constants.js'

const DeckDetailModal = defineAsyncComponent(
  () => import('../components/DeckDetailModal.vue')
)
const AiAdvisor = defineAsyncComponent(
  () => import('../ai/AiAdvisor.vue')
)
// 成就分享弹窗：按需异步加载（Canvas 生成图 + 复制/下载，仅在用户点分享时才拉入）
const ShareAchievementModal = defineAsyncComponent(
  () => import('../components/ShareAchievementModal.vue')
)

const { user, init: initAuth, logout } = useAuth()
const router = useRouter()
const route = useRoute()
const {
  profile: hearthstoneProfile,
  loaded: profileLoaded,
  saving: profileSaving,
  load: loadHearthstoneProfile,
  save: saveHearthstoneProfile,
  clear: clearHearthstoneProfile
} = useHearthstoneProfile()

// AI 建议弹窗（实验功能，独立模块，可随时下线）
const showAi = ref(false)
const openAi = () => { showAi.value = true }
const closeAi = () => { showAi.value = false }
const aiDialogElement = ref(null)
useDialogFocus(showAi, aiDialogElement, closeAi)

// 成就分享弹窗：支持三种入口——浏览视图卡片、我的成就卡片、置顶区一键合集
const shareState = reactive({
  visible: false,
  mode: 'single',       // 'single' | 'bundle'
  achievement: null,
  achievements: null
})
function openShareAchievement(achievement) {
  if (!achievement) return
  shareState.mode = 'single'
  shareState.achievement = achievement
  shareState.achievements = null
  shareState.visible = true
}
function openSharePinnedBundle() {
  if (!pinnedAchievements.value.length) return
  shareState.mode = 'bundle'
  shareState.achievement = null
  shareState.achievements = pinnedAchievements.value.slice(0, MAX_PINNED_ACHIEVEMENTS)
  shareState.visible = true
}
function closeShare() {
  shareState.visible = false
}

// 吸顶控制栏（视图切换 + 版本/职业选择）的引用：切换视图/版本时滚动到它，
// 既能让内容从控制栏下方开始显示，又不会把页面弹回最顶、重新露出那个巨大的页面标题。
const stickyRef = ref(null)
function scrollToControls() {
  if (!stickyRef.value) return
  const top = stickyRef.value.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top, behavior: 'smooth' })
}

// ============ 主题切换（明亮 / 暗色），默认明亮 ============
const { hsTheme, toggleTheme } = useHearthstoneTheme()
// 作者邮箱
const AUTHOR_EMAIL = '1987247500@qq.com'
function contactAuthor() {
  window.location.href = `mailto:${AUTHOR_EMAIL}?subject=${encodeURIComponent('炉石成就查看器 - 反馈/建议')}`
}

const userAch = useAchievementProgress() // 默认加载当前用户进度到 progressData
userAch.init()
// 进度数据源：登录显示自己的进度；未登录时服务端 /api/achievements/progress 返回空对象，
// 即「全部成就、全部未完成」，用于匿名浏览与导出全部成就（不再展示 owner 示例账号进度）。
const displayProgress = computed(() => userAch.progress.value)
const {
  getStats,
  getAchievementXp,
  isAchievementCompleted,
  getProgressInfo,
  getCount,
  getMetric,
  loading: progressLoading,
  error: progressError,
  reload: reloadProgress,
  clear: clearProgress,
  applyLocalProgress
} = useAchievementProgress(displayProgress)

// 初始化：加载认证态
initAuth()
// 登录态变化：登录后重新拉取「自己的」进度（单例初始以匿名拉取过，需强制刷新）；
// 未登录时服务端返回空进度，页面展示全部成就的未完成状态，无需额外加载。
watch(user, (u) => {
  if (u) {
    reloadProgress()
    loadHearthstoneProfile({ force: true }).catch(() => {})
  }
}, { immediate: true })

// 编辑进度弹窗
const editVisible = ref(false)
const editAchievement = ref(null)
const savingProgress = ref(false)
function openEditModal(achievement) {
  editAchievement.value = achievement
  editVisible.value = true
}
const {
  toast,
  celebration,
  showToast,
  showAchievementCelebration,
  confettiStyle
} = useAchievementFeedback()

async function saveProgress(payload) {
  if (savingProgress.value) return
  const ach = allAchievements.value.find((a) => a.id === payload.id)
  const wasCompleted = ach ? isAchievementCompleted(ach) : false
  savingProgress.value = true
  try {
    await saveAchievementProgress({
      [payload.id]: { stages: payload.stages, count: payload.count }
    })
    // 乐观更新：本次保存已成功落库，合并进本地状态即可，无需再整份拉取服务端进度（避免大体积回拉 + 全量重算卡顿）
    applyLocalProgress({ [payload.id]: { stages: payload.stages, count: payload.count } })
    const nowCompleted = ach ? isAchievementCompleted(ach) : false
    // 仅在「从未完成 → 完成」这一刻弹出庆祝，避免重复保存已完成的成就时打扰
    if (!wasCompleted && nowCompleted) showAchievementCelebration(ach)
    else showToast('success', '保存成功')
    editVisible.value = false
  } catch (e) {
    showToast('error', e.message || '保存失败，请重试')
  } finally {
    savingProgress.value = false
  }
}

// ============ 批量完成 ============
const batchMode = ref(false)
const selectedAchIds = ref([])

const startBatch = () => { batchMode.value = true }
const cancelBatch = () => {
  batchMode.value = false
  selectedAchIds.value = []
}
const toggleSelect = (ach) => {
  const i = selectedAchIds.value.indexOf(ach.id)
  if (i >= 0) selectedAchIds.value = selectedAchIds.value.filter((x) => x !== ach.id)
  else selectedAchIds.value = [...selectedAchIds.value, ach.id]
}
const clearSelection = () => { selectedAchIds.value = [] }

// 当前「我的成就」可见范围（受版本/职业/状态筛选影响），用于「全选当前范围」
const batchScopeAchievements = computed(() => {
  if (viewMode.value !== 'my') return []
  if (myGroupBy.value === 'expansion') {
    const list = []
    for (const c in myFilteredByClass.value) list.push(...myFilteredByClass.value[c])
    return list
  }
  if (myGroupBy.value === 'class') {
    const list = []
    for (const id in myFilteredByExpansion.value) list.push(...myFilteredByExpansion.value[id])
    return list
  }
  if (myGroupBy.value === 'sprint') return sprintAllList.value
  return []
})

const selectAllVisible = () => {
  const set = new Set(selectedAchIds.value)
  for (const a of batchScopeAchievements.value) set.add(a.id)
  selectedAchIds.value = [...set]
}

// 批量把选中成就标记为「全部阶段完成」并一次性写回（后端 PUT 支持多 key）
async function batchComplete() {
  const ids = selectedAchIds.value
  if (!ids.length) return
  savingProgress.value = true
  try {
    const progress = {}
    for (const id of ids) {
      const ach = allAchievements.value.find((a) => a.id === id)
      if (!ach || !ach.stages || ach.stages.length === 0) continue
      const stages = {}
      ach.stages.forEach((_, i) => (stages[i] = true))
      const count = ach.stages[ach.stages.length - 1].quota
      progress[id] = { stages, count }
    }
    if (Object.keys(progress).length === 0) {
      showToast('error', '没有可完成的成就')
      return
    }
    await saveAchievementProgress(progress)
    // 乐观更新：批量完成已成功落库，合并进本地状态即可，无需再整份拉取服务端进度
    applyLocalProgress(progress)
    showToast('success', `已完成 ${Object.keys(progress).length} 个成就`)
    selectedAchIds.value = []
    batchMode.value = false
  } catch (e) {
    showToast('error', e.message || '保存失败，请重试')
  } finally {
    savingProgress.value = false
  }
}

async function logoutAndRefresh() {
  await logout()
  clearProgress()
  clearHearthstoneProfile()
  hardcore.value = false
  compactMode.value = false
}
const hardcore = usePersistentRef('hs:hardcore', false, { boolean: true })
const compactMode = ref(false)
const viewMode = usePersistentRef(
  'hs:viewMode',
  route.query.view === 'my' ? 'my' : 'expansion'
)
const myGroupBy = usePersistentRef('hs:myGroupBy', 'expansion')
const currentExpansionId = usePersistentRef(
  'hs:currentExpansionId',
  expansions[0].id
)
if (!expansions.some((expansion) => expansion.id === currentExpansionId.value)) {
  currentExpansionId.value = expansions[0].id
}
const currentClass = usePersistentRef('hs:currentClass', '圣骑士')
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedClass = usePersistentRef('hs:selectedClass', 'all')
const selectedDifficulty = ref('all')
const selectedMetric = ref('all')
const selectedStatus = ref(query.value ? 'all' : '未完成')
let suppressNextExpansionScroll = false

const {
  addedExpansionIdSet,
  allAchievements,
  coreAchievements: classSprintAchievements,
  pinnedAchievements,
  scopeAchievements,
  currentExpansion,
  currentExpansionAchievements,
  currentClassAchievements,
  showMoreVersions
} = useAchievementCatalog({
  profile: hearthstoneProfile,
  hardcore,
  viewMode,
  myGroupBy,
  currentExpansionId,
  currentClass
})

function pinnedProgressText(achievement) {
  const info = getProgressInfo(achievement)
  return info.completed ? '已完成' : `${info.percent}% · ${info.remainingText || '待完成'}`
}

async function togglePinnedAchievement(achievement) {
  if (!user.value || profileSaving.value) return
  const currentIds = hearthstoneProfile.value.pinnedAchievementIds
  const removing = currentIds.includes(achievement.id)
  if (!removing && currentIds.length >= MAX_PINNED_ACHIEVEMENTS) {
    showToast('error', `最多置顶 ${MAX_PINNED_ACHIEVEMENTS} 项成就，请先取消一项`)
    return
  }
  const pinnedAchievementIds = removing
    ? currentIds.filter((id) => id !== achievement.id)
    : [...currentIds, achievement.id]
  try {
    await saveHearthstoneProfile({
      ...hearthstoneProfile.value,
      pinnedAchievementIds
    })
    showToast('success', removing ? '已取消置顶' : `已置顶「${achievement.name}」`)
  } catch (error) {
    showToast('error', error.message || '置顶保存失败，请重试')
  }
}

const ruleRecommendations = computed(() =>
  rankAchievementRecommendations(scopeAchievements.value, {
    getProgressInfo,
    getAchievementXp,
    pinnedIds: hearthstoneProfile.value.pinnedAchievementIds,
    limit: 6
  })
)
watch(
  [hearthstoneProfile, profileLoaded],
  ([currentProfile, isLoaded]) => {
    if (!isLoaded) return
    const preferences = currentProfile.preferences || {}
    // 仅当用户在账号里显式设置过，才覆盖本地（localStorage）偏好；未设置则保留本地值
    if (preferences.hardcore !== undefined) hardcore.value = preferences.hardcore === true
    if (preferences.compactMode !== undefined) compactMode.value = preferences.compactMode === true
    if (preferences.defaultExpansionId && expansions.some((expansion) => expansion.id === preferences.defaultExpansionId)) {
      suppressNextExpansionScroll =
        currentExpansionId.value !== preferences.defaultExpansionId
      currentExpansionId.value = preferences.defaultExpansionId
    }
  },
  { immediate: true, deep: true }
)

const modalCards = ref([])
const modalTitle = ref('')
const modalVisible = ref(false)

const difficulties = ['易', '中等', '难']
const metrics = [
  { value: '一次性', label: '一次性' },
  { value: '次数', label: '累计-次数' },
  { value: '点数', label: '累计-点数' }
]
const statuses = ['未完成', '已完成']

// 职业筛选与分组顺序随当前版本变化（部分版本如贫瘠之地在游戏内有专属职业顺序）
const allClasses = computed(() => getClassOrder(currentExpansionId.value).filter(c => c !== '双职业' && c !== '中立').concat(['中立']))
const classOrder = computed(() => getClassOrder(currentExpansionId.value))
// 「游戏-综合」成就按 5 大分类展示（用户指定顺序），而非按职业（多为「中立」）平铺
const ZONGHE_CATEGORIES = ['职业', '中立关键字', '随从类型', '法术派系', '特殊']
const isZongheView = computed(() => currentExpansionId.value === 'zonghe')
// 按职业分组视图（按版本浏览 / 我的-按版本）的渲染顺序：
// - 含 category 字段的扩展包（游戏-综合 / 5 个旧扩展包）按 category 聚合展示，
//   不受职业筛选影响（职业筛选仍作用于组内成就）；游戏-综合用固定的 5 大分类顺序。
// - 核心系列（独狼年/多头蛇年/狮鹫年）：合并为「职业」「中立」两大栏，不拆成具体职业；
//   只有「按职业浏览 / 我的-按职业」才按真实职业区分。
// - 其余版本：选中具体职业筛选时只渲染该职业分组（+中立/双职业），否则按职业原顺序。
const classGroupOrder = computed(() => {
  const exp = currentExpansion.value
  if (exp && exp.achievements.some((a) => a.category)) {
    if (isZongheView.value) return ZONGHE_CATEGORIES
    // 5 个旧扩展包（通灵学院/外域的灰烬/巨龙降临/奥丹姆骑兵/暗影崛起）：
    // 按版本浏览统一归入「光辉事迹」单一分组（数据已给所有成就打 category=光辉事迹）。
    const seen = []
    for (const a of exp.achievements) {
      if (a.category && !seen.includes(a.category)) seen.push(a.category)
    }
    return seen
  }
  // 核心系列按版本视图：合并为「职业」「中立」两大栏
  if (exp && CORE_EXPANSION_IDS.has(exp.id)) {
    return ['职业', '中立']
  }
  if (selectedClass.value !== 'all') {
    // 选中具体职业时，除该职业自身外，再补「中立」「双职业」两个分组：
    // 「中立」承载游戏内归中立、但该职业同样可做的成就（如万物终结等）；
    // 「双职业」承载该职业参与的双职业成就（按版本浏览默认它们不进各职业分组）。
    // 与游戏内「按职业筛选才显示同样可做的」一致。selectedClass 本身为中立时不重复。
    return selectedClass.value === '中立' ? ['中立', '双职业'] : [selectedClass.value, '中立', '双职业']
  }
  return classOrder.value
})

const currentClassName = computed(() => currentClass.value)
const myViewSubLabel = computed(() => user.value ? '我的进度' : '全部成就')

// 职业总览：按版本浏览/我的-按版本 默认展开各职业（用户嫌长可自行收起）
const classViewCollapsed = reactive({})
for (const c of classGroupOrder.value) classViewCollapsed[c] = false
// 按职业浏览/我的-按职业：按版本分组，默认展开
const expViewCollapsed = reactive({})
for (const exp of expansions) expViewCollapsed[exp.id] = false

const setClassCollapsed = (heroClass, collapsed) => {
  classViewCollapsed[heroClass] = collapsed
}
const setExpansionCollapsed = (expansionId, collapsed) => {
  expViewCollapsed[expansionId] = collapsed
}

const resetClassViews = () => {
  for (const c of classGroupOrder.value) classViewCollapsed[c] = false
  for (const exp of expansions) expViewCollapsed[exp.id] = false
}

// 总览面板「展开/收起全部」：按当前视图切换 职业分组 或 版本分组 的折叠态
const expandAllSections = () => {
  if (viewMode.value === 'my' && myGroupBy.value === 'sprint') {
    for (const k of Object.keys(sprintSectionCollapsed)) sprintSectionCollapsed[k] = false
  } else if (viewMode.value === 'class' || (viewMode.value === 'my' && myGroupBy.value === 'class')) {
    for (const exp of expansions) expViewCollapsed[exp.id] = false
  } else {
    for (const c of classGroupOrder.value) classViewCollapsed[c] = false
  }
}
const collapseAllSections = () => {
  if (viewMode.value === 'my' && myGroupBy.value === 'sprint') {
    for (const k of Object.keys(sprintSectionCollapsed)) sprintSectionCollapsed[k] = true
  } else if (viewMode.value === 'class' || (viewMode.value === 'my' && myGroupBy.value === 'class')) {
    for (const exp of expansions) expViewCollapsed[exp.id] = true
  } else {
    for (const c of classGroupOrder.value) classViewCollapsed[c] = true
  }
}

// 仅在「我的-按版本 / 我的-按职业」时展示总览面板（含完成度进度条与剩余统计一句话说明）
const showClassOverview = computed(
  () => viewMode.value === 'my' && (myGroupBy.value === 'expansion' || myGroupBy.value === 'class')
)
// 悬浮「展开全部 / 收起全部」按钮的显示条件：按版本浏览、按职业浏览（我的成就由 showMySectionToggles 独立控制）
const showFabSectionToggles = computed(
  () => viewMode.value === 'expansion' || viewMode.value === 'class'
)
// 我的成就-按版本/按职业/待完成清单：展开全部/收起全部显示在子切换行后面
const showMySectionToggles = computed(
  () => viewMode.value === 'my' && (myGroupBy.value === 'expansion' || myGroupBy.value === 'class' || myGroupBy.value === 'sprint')
)

// 每个职业的完成度总览（基于当前筛选结果）
const classViewSummaries = computed(() => {
  const groups = viewMode.value === 'my' && myGroupBy.value === 'expansion' ? myFilteredByClass.value : filteredByClass.value
  const map = {}
  for (const c in groups) {
    const achievements = groups[c]
    const completed = achievements.filter((achievement) => isAchievementCompleted(achievement)).length
    const total = achievements.length
    const remaining = total - completed
    map[c] = {
      total,
      completed,
      remaining
    }
  }
  return map
})

// 我的成就 - 按职业：按版本分组的总览数据（与 classViewSummaries 结构一致，去掉冗余的百分比）
const expViewSummaries = computed(() => {
  const groups = viewMode.value === 'my' && myGroupBy.value === 'class' ? myFilteredByExpansion.value : filteredByExpansion.value
  const map = {}
  for (const id in groups) {
    const achievements = groups[id]
    const completed = achievements.filter((achievement) => isAchievementCompleted(achievement)).length
    const total = achievements.length
    const remaining = total - completed
    map[id] = { total, completed, remaining }
  }
  return map
})

// 我的成就 - 按版本：若选中的是「更多版本」里的新增版本，仅作浏览，不计入统计
// （统计始终反映原有 9 个版本，避免新增版本污染「我的成就」完成度）。
const isMyAddedVersion = computed(
  () => viewMode.value === 'my' && myGroupBy.value === 'expansion' && !hardcore.value && addedExpansionIdSet.has(currentExpansionId.value)
)
// 总览面板作用范围：按版本=当前版本；按职业=当前职业；待完成清单=全部 9 版本成就
const overviewScope = computed(() => {
  if (viewMode.value === 'my' && myGroupBy.value === 'expansion')
    return isMyAddedVersion.value ? classSprintAchievements.value : currentExpansionAchievements.value
  if (viewMode.value === 'my' && myGroupBy.value === 'class') return currentClassAchievements.value
  if (viewMode.value === 'my' && myGroupBy.value === 'sprint') return scopeAchievements.value
  return []
})
// 总览面板统计（完成度、点数、经验）
const overviewStats = computed(() => getStats(overviewScope.value))

// 我的成就模式 - 当前范围的成就列表
const myAchievementsList = computed(() => {
  if (myGroupBy.value === 'sprint') return sprintAllList.value
  if (myGroupBy.value === 'expansion') {
    return currentExpansionAchievements.value
  } else {
    return scopeAchievements.value.filter((ach) => matchesClass(ach, currentClass.value))
  }
})

const {
  groups: sprintGroups,
  all: sprintAllList,
  oneTimeRemaining: sprintOneTimeRemain,
  sectionCollapsed: sprintSectionCollapsed,
  toggleSection: toggleSprintSection
} = useAchievementSprint({
  achievements: scopeAchievements,
  query,
  getProgressInfo,
  getMetric
})

const {
  availableClasses: filterAvailableClasses,
  filteredAchievements,
  filteredByClass,
  myFilteredByClass,
  filteredByExpansion,
  myFilteredByExpansion,
  myClassExpansionOrder
} = useAchievementFilters({
  allAchievements,
  currentExpansionAchievements,
  currentClassAchievements,
  myAchievements: myAchievementsList,
  viewMode,
  query,
  selectedClass,
  selectedDifficulty,
  selectedMetric,
  selectedStatus,
  currentExpansionId,
  getMetric,
  isAchievementCompleted
})

// 总览面板剩余统计（基于 overviewScope，保证 已完成 + 剩余 = 总数）
const overviewRemaining = computed(() => {
  let achievements = 0
  let countRemain = 0 // 累计-次数：还差的总次数
  let pointRemain = 0 // 累计-点数：还差的总点数
  let oneTimeRemain = 0 // 一次性：还差的总阶段数（“次”）
  let cumCountAch = 0 // 累计-次数：还差的成就个数
  let cumPointsAch = 0 // 累计-点数：还差的成就个数
  for (const ach of overviewScope.value) {
    if (isAchievementCompleted(ach)) continue
    achievements += 1
    if (ach.type === '累计') {
      const count = getCount(ach) ?? 0
      const lastQuota = ach.stages[ach.stages.length - 1].quota
      const remaining = Math.max(0, lastQuota - count)
      if (getMetric(ach) === 'points') {
        pointRemain += remaining
        cumPointsAch += 1
      } else {
        countRemain += remaining
        cumCountAch += 1
      }
    } else {
      // 一次性成就：剩余 = 未勾选的阶段数（即还差几个子目标）
      const info = getProgressInfo(ach)
      oneTimeRemain += info.remainingCount
    }
  }
  return { achievements, countRemain, pointRemain, oneTimeRemain, cumCountAch, cumPointsAch }
})
// 总览面板说明：拆成两行、数字高亮（成就/累计 一行，经验/成就值 一行）
// 数值均来源于本地统计（安全整数），故用 v-html 包裹 .hs-num 高亮
const overviewSummaryHtml = computed(() => {
  const stats = overviewStats.value
  // 「个成就」行用成就单位（totalAchievements / completedAchievements），
  // 不能用 stats.total（那是阶段数），否则会出现「15/31 个成就」这类单位错配。
  const totalAch = stats.totalAchievements
  const completedAch = stats.completedAchievements
  const remaining = totalAch - completedAch
  const { countRemain, pointRemain, oneTimeRemain, cumCountAch, cumPointsAch } = overviewRemaining.value
  // 通行证经验加成：已获得/总经验均按 (1+加成) 放大（成就值不受加成影响）
  const earnedXp = Math.round(stats.earnedXp * (1 + passBonus.value))
  const totalXp = Math.round(stats.totalXp * (1 + passBonus.value))
  const remainXp = Math.max(0, totalXp - earnedXp)
  const remainPts = Math.max(0, stats.totalPoints - stats.earnedPoints)
  const n = (v) => `<b class="hs-num">${v}</b>`
  // 剩余说明：各指标仅在 >0 时显示；先列「成就个数」再列「还差 次/点」
  const remParts = []
  if (oneTimeRemain > 0) remParts.push(`一次性成就还剩 ${n(oneTimeRemain)} 次`)
  if (cumCountAch > 0) remParts.push(`累计-次数类成就个数还剩 ${n(cumCountAch)} 个`)
  if (cumPointsAch > 0) remParts.push(`累计-点数类成就个数还剩 ${n(cumPointsAch)} 个`)
  if (countRemain > 0) remParts.push(`累计-次数还差 ${n(countRemain)} 次`)
  if (pointRemain > 0) remParts.push(`累计-点数还差 ${n(pointRemain)} 点`)
  const cumClause = remParts.length ? `剩余成就中，${remParts.join('，')}。` : ''
  const line1 =
    `已完成 ${n(`${completedAch}/${totalAch}`)} 个成就，剩余 ${n(remaining)} 个成就；` + cumClause
  const line2 =
    `已获得经验值 ${n(`${earnedXp}/${totalXp}`)}，剩余可获得经验值 ${n(remainXp)}；` +
    `已获得成就值 ${n(`${stats.earnedPoints}/${stats.totalPoints}`)}，剩余可获得成就值 ${n(remainPts)} 点。`
  return { line1, line2 }
})
// 通行证经验加成：默认不加成；可选 10% / 15% / 20%
const PASS_BONUS_OPTIONS = [
  { label: '无加成', value: 0 },
  { label: '通行证 +10%', value: 0.1 },
  { label: '通行证 +15%', value: 0.15 },
  { label: '通行证 +20%', value: 0.2 }
]
const passBonus = ref(0)
const {
  exporting,
  fileInput,
  exportJson,
  exportExcel,
  triggerImport,
  onImportFile
} = useAchievementBackup({
  achievements: allAchievements,
  passBonus,
  user,
  progress: displayProgress,
  applyLocalProgress,
  showToast
})

const resetFilters = () => {
  query.value = ''
  selectedClass.value = 'all'
  selectedDifficulty.value = 'all'
  selectedMetric.value = 'all'
  selectedStatus.value = viewMode.value === 'my' ? '未完成' : 'all'
}

const resetViewState = ({ scroll = false } = {}) => {
  resetFilters()
  closeModal()
  // 滚动到吸顶控制栏下方（而非页面最顶），避免大标题重新占满屏幕、内容被挤下去
  if (scroll) scrollToControls()
}

// 切换视图时重置筛选
watch(viewMode, () => {
  resetViewState()
  resetClassViews()
})

watch(myGroupBy, () => {
  resetViewState({ scroll: true })
  resetClassViews()
})

watch(currentExpansionId, () => {
  if (viewMode.value === 'expansion' || (viewMode.value === 'my' && myGroupBy.value === 'expansion')) {
    if (!suppressNextExpansionScroll) resetViewState({ scroll: true })
  }
  suppressNextExpansionScroll = false
  resetClassViews()
})

watch(currentClass, () => {
  if (viewMode.value === 'class' || (viewMode.value === 'my' && myGroupBy.value === 'class')) {
    resetViewState({ scroll: true })
  }
})

// 弹窗
const openCardModal = (achievement) => {
  // 我的成就 + 已登录：打开进度编辑
  if (viewMode.value === 'my' && user.value) {
    openEditModal(achievement)
    return
  }
  // 浏览模式 / 我的成就（未登录仅查看）：展示关联卡牌图片，编辑需登录。
  // 有 related 图或 wild 兜底图即可弹窗。
  if (!achievement.cards || !achievement.cards.some((card) => card.image || card.imageFallback)) return
  modalTitle.value = achievement.name
  modalCards.value = achievement.cards.map((card) => ({ ...card }))
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  modalCards.value = []
  modalTitle.value = ''
}

// 推荐卡组详情弹窗
const deckDetailVisible = ref(false)
const deckDetailData = ref(null)
const openDeckDetail = (deck) => {
  if (!deck) return
  deckDetailData.value = deck
  deckDetailVisible.value = true
}
const showEmpty = computed(() => filteredAchievements.value.length === 0)
</script>

<style scoped src="../styles/hearthstone-achievements-page.css"></style>
