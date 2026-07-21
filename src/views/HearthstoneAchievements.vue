<template>
  <section class="section page-section hs-page" :data-hs-theme="hsTheme">
    <div class="container">
      <section class="hs-hero" aria-labelledby="hs-page-title">
        <div class="section-heading">
          <p class="eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Hearthstone Tracker</p>
          <h1 id="hs-page-title">炉石传说成就查看器</h1>
          <p>把分散的成就目标整理成清晰的行动清单。按版本与职业筛选、记录完成进度，并快速找到下一项值得冲刺的成就。</p>
        </div>

        <div class="hs-hero-side">
          <div class="hs-intro-actions">
            <template v-if="user">
              <span class="hs-user-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>
                </svg>
                {{ user.username }}
              </span>
              <button type="button" class="hs-btn hs-btn-ghost" @click="logoutAndRefresh">退出登录</button>
            </template>
            <template v-else>
              <button type="button" class="hs-btn hs-btn-primary" @click="router.push('/login')">
                登录或注册
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
                </svg>
              </button>
            </template>
            <button type="button" class="hs-btn hs-btn-ghost" @click="goChangelog">查看更新</button>
            <button
              type="button"
              class="hs-btn hs-btn-ghost hs-theme-toggle"
              @click="toggleTheme"
              :aria-label="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
              :title="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
            >
              <svg v-if="hsTheme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
              <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
              {{ hsTheme === 'dark' ? '明亮' : '暗色' }}
            </button>
            <button
              type="button"
              class="hs-btn hs-btn-ghost hs-contact-btn"
              @click="contactAuthor"
              title="发送邮件给作者"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              联系作者
            </button>
          </div>
          <p class="hs-intro-text">
            {{ user ? '当前进度会自动保存到你的账号。' : '未登录可浏览全部内容；登录后即可记录并同步个人进度。' }}
          </p>
        </div>

        <div class="hs-hero-metrics" aria-label="数据概览">
          <div><strong>{{ allAchievements.length }}</strong><span>收录成就</span></div>
          <div><strong>{{ expansions.length }}</strong><span>游戏版本</span></div>
          <div><strong>{{ allClasses.length }}</strong><span>职业分类</span></div>
        </div>
      </section>

      <!-- 视图模式切换 -->
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
              <template v-if="viewMode === 'expansion'">{{ currentExpansion?.name }}</template>
              <template v-else-if="viewMode === 'class'">{{ currentClassName }}</template>
              <template v-else>{{ myViewSubLabel }}</template>
            </p>
          </div>
        </div>
        <div class="hs-top-actions">
          <!-- 按版本/我的(按版本)：版本选择 -->
          <template v-if="viewMode === 'expansion' || (viewMode === 'my' && myGroupBy === 'expansion')">
            <ExpansionTabs
              :expansions="originalExpansions"
              :current-id="currentExpansionId"
              @switch="currentExpansionId = $event"
            />
            <!-- 本次新增的版本：收进下拉，不与原有 9 个版本混排 -->
            <div class="hs-more-versions" v-click-outside="closeMoreVersions">
              <button
                type="button"
                class="hs-btn hs-btn-ghost hs-more-versions-toggle"
                :class="{ active: moreVersionsOpen || addedExpansions.some((e) => e.id === currentExpansionId) }"
                :title="`本次新增的 ${addedExpansions.length} 个版本`"
                @click="toggleMoreVersions"
              >
                更多版本
                <span class="hs-more-versions-count">{{ addedExpansions.length }}</span>
                <svg class="hs-more-versions-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div v-if="moreVersionsOpen" class="hs-more-versions-panel" role="menu">
                <p class="hs-more-versions-tip">本次新增的版本（已本地化成就数据）</p>
                <div class="hs-more-versions-grid">
                  <button
                    v-for="exp in addedExpansions"
                    :key="exp.id"
                    type="button"
                    class="hs-more-versions-item"
                    :class="{ active: currentExpansionId === exp.id }"
                    @click="selectAdded(exp.id)"
                  >
                    <span>{{ exp.name }}</span>
                    <svg v-if="currentExpansionId === exp.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </template>
          <!-- 按职业/我的(按职业)：职业选择；待完成清单使用视图内的统一筛选器 -->
          <div
            v-else-if="viewMode === 'class' || (viewMode === 'my' && myGroupBy === 'class')"
            class="hs-expansion-tabs"
            role="tablist"
            aria-label="选择职业"
          >
            <button
              v-for="cls in allClasses"
              :key="cls"
              :class="{ active: currentClass === cls }"
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <span>当前展示的是<strong>全部成就</strong>（未记录进度）。</span>
          <button type="button" class="hs-link" @click="router.push('/login')">登录 / 注册</button>
          <span>后即可记录并保存你自己的完成进度。</span>
        </div>
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

        <div v-if="progressLoading" class="hs-progress-status" role="status">正在加载成就进度…</div>
        <div v-else-if="progressError" class="hs-progress-status hs-progress-error" role="alert">
          成就进度加载失败，当前显示的数据可能不是最新的。
          <button type="button" @click="reloadProgress">重试</button>
        </div>

        <!-- 待完成清单：说明（两行、数字高亮），位于筛选栏上方 -->
        <div class="hs-stats-panel hs-sprint-stats" v-if="myGroupBy === 'sprint'">
          <p class="hs-overview-summary-text" v-html="overviewSummaryHtml.line1"></p>
          <p class="hs-overview-summary-text" v-html="overviewSummaryHtml.line2"></p>
        </div>

        <!-- 待完成清单：版本-职业-指标筛选 -->
        <div v-if="viewMode === 'my' && myGroupBy === 'sprint'" class="hs-sprint-toolbar">
          <div class="hs-sprint-filters">
            <label class="hs-filter-field">
              <span class="hs-filter-label">版本</span>
              <select v-model="sprintVersionFilter" class="hs-filter-select">
                <option value="all">全部版本</option>
                <option v-for="v in versionOptions" :key="v.id" :value="v.id">{{ v.name }}</option>
              </select>
            </label>
            <label class="hs-filter-field">
              <span class="hs-filter-label">职业</span>
              <select v-model="sprintClassFilter" class="hs-filter-select">
                <option value="all">全部职业</option>
                <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
            <label class="hs-filter-field">
              <span class="hs-filter-label">指标</span>
              <select v-model="sprintMetricFilter" class="hs-filter-select">
                <option v-for="m in sprintMetricOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </label>
          </div>
        </div>

        <!-- 待完成清单：导出 / 批量完成，置于剩余统计下方 -->
        <div class="hs-export-bar" v-if="viewMode === 'my' && myGroupBy === 'sprint'">
          <span class="hs-export-label">导出：</span>
          <button type="button" class="hs-btn hs-btn-ghost" :disabled="exporting" @click="exportExcel">
            {{ exporting ? '导出中…' : '导出 Excel' }}
          </button>
          <label class="hs-pass">
            通行证加成：
            <select v-model.number="passBonus" class="hs-pass-select">
              <option v-for="o in PASS_BONUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </label>
        </div>

        <div class="hs-batch-bar" v-if="viewMode === 'my' && user && myGroupBy === 'sprint'">
          <template v-if="!batchMode">
            <button type="button" class="hs-btn hs-btn-ghost" @click="startBatch">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              批量完成
            </button>
            <span class="hs-batch-hint">勾选多个成就后一次性标记完成，省去逐个点击</span>
          </template>
          <template v-else>
            <span class="hs-batch-count">已选 <b>{{ selectedAchIds.length }}</b> 个</span>
            <button type="button" class="hs-btn hs-btn-ghost" @click="selectAllVisible">全选当前范围</button>
            <button type="button" class="hs-btn hs-btn-ghost" @click="clearSelection">清除</button>
            <button type="button" class="hs-btn hs-btn-primary" :disabled="selectedAchIds.length === 0 || savingProgress" @click="batchComplete">
              {{ savingProgress ? '保存中…' : '完成选中 (' + selectedAchIds.length + ')' }}
            </button>
            <button type="button" class="hs-btn hs-btn-ghost" @click="cancelBatch">取消</button>
          </template>
        </div>

      </template>

      <!-- 我的成就-按版本/按职业：总览面板（完成度进度条 + 一句话说明，默认展开） -->
      <div v-if="showClassOverview" class="hs-class-overview">
        <div class="hs-class-overview-head">
          <span class="hs-class-overview-head-title">完成进度</span>
          <div class="hs-class-overview-actions">
            <button type="button" class="hs-btn hs-btn-ghost" @click="expandAllSections">展开全部</button>
            <button type="button" class="hs-btn hs-btn-ghost" @click="collapseAllSections">收起全部</button>
          </div>
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

      <!-- 按版本浏览：仅展开/收起控制与成就总数（不含个人进度） -->
      <div v-else-if="viewMode === 'expansion'" class="hs-class-overview hs-class-overview-browse">
        <div class="hs-class-overview-head">
          <span class="hs-class-overview-browse-count">共 <b>{{ currentExpansionAchievements.length }}</b> 个成就</span>
          <div class="hs-class-overview-actions">
            <button type="button" class="hs-btn hs-btn-ghost" @click="expandAllClasses">展开全部</button>
            <button type="button" class="hs-btn hs-btn-ghost" @click="collapseAllClasses">收起全部</button>
          </div>
        </div>
      </div>

      <!-- 进度条下方：版本描述 + 营地攻略链接（按版本浏览 / 我的-按版本 通用） -->
      <section v-if="isExpansionView" class="hs-result-bar">
        <span>
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
      </section>

      <FilterBar
        v-if="!(viewMode === 'my' && myGroupBy === 'sprint')"
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
      />

      <section v-if="viewMode === 'class'" class="hs-result-bar">
        <span>共 {{ filteredAchievements.length.toLocaleString() }} 个成就</span>
      </section>

      <!-- 导出（JSON 导出/导入暂隐藏，待启用） -->
      <div class="hs-export-bar" v-if="viewMode === 'my' && myGroupBy !== 'sprint'">
        <span class="hs-export-label">导出：</span>
        <button type="button" class="hs-btn hs-btn-ghost" :disabled="exporting" @click="exportExcel">
          {{ exporting ? '导出中…' : '导出 Excel' }}
        </button>
        <label class="hs-pass">
          通行证加成：
          <select v-model.number="passBonus" class="hs-pass-select">
            <option v-for="o in PASS_BONUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
      </div>

      <!-- 批量完成工具条（仅登录用户可见） -->
      <div class="hs-batch-bar" v-if="viewMode === 'my' && user && myGroupBy !== 'sprint'">
        <template v-if="!batchMode">
          <button type="button" class="hs-btn hs-btn-ghost" @click="startBatch">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            批量完成
          </button>
          <span class="hs-batch-hint">勾选多个成就后一次性标记完成，省去逐个点击</span>
        </template>
        <template v-else>
          <span class="hs-batch-count">已选 <b>{{ selectedAchIds.length }}</b> 个</span>
          <button type="button" class="hs-btn hs-btn-ghost" @click="selectAllVisible">全选当前范围</button>
          <button type="button" class="hs-btn hs-btn-ghost" @click="clearSelection">清除</button>
          <button type="button" class="hs-btn hs-btn-primary" :disabled="selectedAchIds.length === 0 || savingProgress" @click="batchComplete">
            {{ savingProgress ? '保存中…' : '完成选中 (' + selectedAchIds.length + ')' }}
          </button>
          <button type="button" class="hs-btn hs-btn-ghost" @click="cancelBatch">取消</button>
        </template>
      </div>


      <!-- 按版本浏览：按职业分组 -->
      <div v-if="viewMode === 'expansion'" class="hs-expansion-groups">
        <template v-for="heroClass in classOrder" :key="heroClass">
          <ClassSection
            v-if="filteredByClass[heroClass] && filteredByClass[heroClass].length > 0"
            v-model:collapsed="classViewCollapsed[heroClass]"
            :hero-class="heroClass"
            :achievements="filteredByClass[heroClass]"
            :badge-style="getClassBadgeStyle(heroClass)"
            :class-style="getClassStyle(heroClass)"
            @card-click="openCardModal"
            @deck-click="openDeckDetail"
          />
        </template>
      </div>

      <!-- 按职业浏览：按版本分组 -->
      <div v-else-if="viewMode === 'class'" class="hs-expansion-groups">
        <template v-for="exp in expansions" :key="exp.id">
          <ClassSection
            v-if="filteredByExpansion[exp.id] && filteredByExpansion[exp.id].length > 0"
            v-model:collapsed="expViewCollapsed[exp.id]"
            :hero-class="exp.name"
            :achievements="filteredByExpansion[exp.id]"
            :badge-style="getExpansionBadgeStyle()"
            :class-style="getExpansionStyle()"
            @card-click="openCardModal"
            @deck-click="openDeckDetail"
          />
        </template>
      </div>

      <!-- 我的成就-按版本：按职业分组 -->
      <div v-else-if="myGroupBy === 'expansion'" class="hs-expansion-groups">
        <template v-for="heroClass in classOrder" :key="heroClass">
          <ClassSection
            v-if="myFilteredByClass[heroClass] && myFilteredByClass[heroClass].length > 0"
            v-model:collapsed="classViewCollapsed[heroClass]"
            :hero-class="heroClass"
            :achievements="myFilteredByClass[heroClass]"
            :badge-style="getClassBadgeStyle(heroClass)"
            :class-style="getClassStyle(heroClass)"
            :summary="classViewSummaries[heroClass]"
            :use-my-card="true"
            :show-remaining="true"
            :editable="Boolean(user)"
            :select-mode="batchMode"
            :selected-ids="selectedAchIds"
            @card-click="openCardModal"
            @deck-click="openDeckDetail"
            @toggle-select="toggleSelect"
          />
        </template>
      </div>

      <!-- 我的成就-按职业：按版本分组 -->
      <div v-else-if="myGroupBy === 'class'" class="hs-expansion-groups">
        <template v-for="exp in expansions" :key="exp.id">
          <ClassSection
            v-if="myFilteredByExpansion[exp.id] && myFilteredByExpansion[exp.id].length > 0"
            v-model:collapsed="expViewCollapsed[exp.id]"
            :hero-class="exp.name"
            :achievements="myFilteredByExpansion[exp.id]"
            :badge-style="getExpansionBadgeStyle()"
            :class-style="getExpansionStyle()"
            :use-my-card="true"
            :show-remaining="true"
            :editable="Boolean(user)"
            :select-mode="batchMode"
            :selected-ids="selectedAchIds"
            @card-click="openCardModal"
            @deck-click="openDeckDetail"
            @toggle-select="toggleSelect"
          />
        </template>
      </div>

      <!-- 我的成就-待完成清单：按 一次性 / 累计-次数 / 累计-点数 分组，默认折叠 -->
      <div v-else-if="myGroupBy === 'sprint'" class="hs-priority-wrap">
        <section v-if="sprintGroups.oneTime.length" class="hs-priority-group hs-sprint-cat">
          <button
            type="button"
            class="hs-sprint-cat-head"
            :aria-expanded="!sprintSectionCollapsed.oneTime"
            @click="toggleSprintSection('oneTime')"
          >
            <span class="hs-sprint-cat-caret" :class="{ open: !sprintSectionCollapsed.oneTime }">▶</span>
            <span class="hs-sprint-cat-title">一次性成就</span>
            <span class="hs-sprint-cat-count">{{ sprintGroups.oneTime.length }} 个</span>
          </button>
          <div v-show="!sprintSectionCollapsed.oneTime" class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.oneTime"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
              @deck-click="openDeckDetail"
            />
          </div>
        </section>

        <section v-if="sprintGroups.count.length" class="hs-priority-group hs-sprint-cat">
          <button
            type="button"
            class="hs-sprint-cat-head"
            :aria-expanded="!sprintSectionCollapsed.count"
            @click="toggleSprintSection('count')"
          >
            <span class="hs-sprint-cat-caret" :class="{ open: !sprintSectionCollapsed.count }">▶</span>
            <span class="hs-sprint-cat-title">累计-次数（剩余从低到高）</span>
            <span class="hs-sprint-cat-count">{{ sprintGroups.count.length }} 个</span>
          </button>
          <div v-show="!sprintSectionCollapsed.count" class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.count"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
              @deck-click="openDeckDetail"
            />
          </div>
        </section>

        <section v-if="sprintGroups.points.length" class="hs-priority-group hs-sprint-cat">
          <button
            type="button"
            class="hs-sprint-cat-head"
            :aria-expanded="!sprintSectionCollapsed.points"
            @click="toggleSprintSection('points')"
          >
            <span class="hs-sprint-cat-caret" :class="{ open: !sprintSectionCollapsed.points }">▶</span>
            <span class="hs-sprint-cat-title">累计-点数（剩余从低到高）</span>
            <span class="hs-sprint-cat-count">{{ sprintGroups.points.length }} 个</span>
          </button>
          <div v-show="!sprintSectionCollapsed.points" class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.points"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
              @deck-click="openDeckDetail"
            />
          </div>
        </section>

        <p v-if="!sprintAllList.length" class="hs-sprint-empty">
          当前筛选范围内没有未完成的成就。
        </p>
      </div>

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
        :visible="deckDetailVisible"
        :deck="deckDetailData"
        @close="deckDetailVisible = false"
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
  </section>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { expansions, originalExpansions, addedExpansions } from '../hearthstone-achievements/data/expansions.js'
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
import DeckDetailModal from '../hearthstone-achievements/components/DeckDetailModal.vue'

const { user, init: initAuth, logout } = useAuth()
const router = useRouter()

// ============ 主题切换（明亮 / 暗色），默认明亮 ============
const HS_THEME_KEY = 'hs-theme'
const hsTheme = ref(localStorage.getItem(HS_THEME_KEY) === 'dark' ? 'dark' : 'light')
watch(hsTheme, (t) => {
  localStorage.setItem(HS_THEME_KEY, t)
}, { immediate: true })
function toggleTheme() {
  hsTheme.value = hsTheme.value === 'dark' ? 'light' : 'dark'
}
// 作者邮箱
const AUTHOR_EMAIL = '1987247500@qq.com'
function contactAuthor() {
  window.location.href = `mailto:${AUTHOR_EMAIL}?subject=${encodeURIComponent('炉石成就查看器 - 反馈/建议')}`
}

// ============ 「更多版本」下拉：本次新增版本（不与原有 9 个混排） ============
const moreVersionsOpen = ref(false)
function toggleMoreVersions() {
  moreVersionsOpen.value = !moreVersionsOpen.value
}
function closeMoreVersions() {
  moreVersionsOpen.value = false
}
function selectAdded(id) {
  currentExpansionId.value = id
  moreVersionsOpen.value = false
}
// 局部指令：点击元素外部时触发回调（用于关闭下拉）
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value(e)
    }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside, true)
  }
}

const userAch = useAchievementProgress() // 默认加载当前用户进度到 progressData
// 进度数据源：登录显示自己的进度；未登录时服务端 /api/achievements/progress 返回空对象，
// 即「全部成就、全部未完成」，用于匿名浏览与导出全部成就（不再展示 owner 示例账号进度）。
const displayProgress = computed(() => userAch.progress.value)
const {
  getStats,
  getAchievementXp,
  isAchievementCompleted,
  getProgressInfo,
  isStageCompleted,
  getCount,
  getUnit,
  getMetric,
  loading: progressLoading,
  error: progressError,
  reload: reloadProgress,
  clear: clearProgress
} = useAchievementProgress(displayProgress)

// 初始化：加载认证态
initAuth()
// 登录态变化：登录后重新拉取「自己的」进度（单例初始以匿名拉取过，需强制刷新）；
// 未登录时服务端返回空进度，页面展示全部成就的未完成状态，无需额外加载。
watch(user, (u) => {
  if (u) reloadProgress()
}, { immediate: true })

// 编辑进度弹窗
const editVisible = ref(false)
const editAchievement = ref(null)
const savingProgress = ref(false)
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

// ============ 成就达成庆祝提示 ============
const celebration = ref({ show: false, name: '', sub: '' })
let celebrationTimer = null
function showAchievementCelebration(ach) {
  if (!ach) return
  let xp = 0
  let pts = 0
  for (const s of ach.stages || []) {
    xp += s.xpReward || 0
    pts += s.points || 0
  }
  const sub = [ach.heroClass, ach.difficulty, xp || pts ? `${xp} XP · ${pts} 点` : '']
    .filter(Boolean)
    .join(' · ')
  celebration.value = { show: true, name: ach.name, sub }
  if (celebrationTimer) clearTimeout(celebrationTimer)
  celebrationTimer = setTimeout(() => {
    celebration.value = { ...celebration.value, show: false }
  }, 3400)
}
// 彩屑爆发：10 个色块沿圆周向外飞散
const confettiColors = ['#fbbf24', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa']
function confettiStyle(n) {
  const angle = (n * 36) * (Math.PI / 180)
  const dist = 96 + (n % 3) * 20
  return {
    '--x': Math.cos(angle) * dist + 'px',
    '--y': Math.sin(angle) * dist + 'px',
    background: confettiColors[n % confettiColors.length]
  }
}

async function saveProgress(payload) {
  if (savingProgress.value) return
  const ach = allAchievements.value.find((a) => a.id === payload.id)
  const wasCompleted = ach ? isAchievementCompleted(ach) : false
  savingProgress.value = true
  try {
    const resp = await fetch('/api/achievements/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: { [payload.id]: { stages: payload.stages, count: payload.count } }
      })
    })
    if (!resp.ok) {
      const result = await resp.json().catch(() => ({}))
      throw new Error(result.error || '保存失败')
    }
    await reloadProgress()
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
    const resp = await fetch('/api/achievements/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress })
    })
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}))
      throw new Error(e.error || '保存失败')
    }
    await reloadProgress()
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
    const unit = getUnit(ach)
    return remain > 0 ? `累计 ${count}/${quota}：${desc}（剩余 ${remain} ${unit}）` : '待完成'
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
      '类型': ach.type === '累计' ? `累计·${getUnit(ach) === '点' ? '点数' : '次数'}` : ach.type,
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
      user: user.value ? user.value.username : '全部成就（未登录）',
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

// 卡牌图片：构建期即解析出 URL（eager glob），点击卡片时同步可用，消除打开弹窗的等待。
const cardImageMap = import.meta.glob('../hearthstone-achievements/assets/cards/**/*.png', { eager: true, import: 'default' })

const getCardImageUrl = (cardName, imageDir) => {
  const path = `../hearthstone-achievements/assets/cards/${imageDir}/${cardName}.png`
  return cardImageMap[path] || null
}

// 给成就附加卡牌图片和版本信息（图片 URL 同步可用）
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

// 「更多版本」（本次新增、无经验值）的成就：只在「按版本浏览 / 我的-按版本」中出现，
// 不进入「按职业浏览 / 我的-按职业 / 待完成清单」，以免干扰推荐与按职业统计。
const addedExpansionIdSet = new Set(addedExpansions.map((e) => e.id))
const classSprintAchievements = computed(() =>
  allAchievements.value.filter((a) => !addedExpansionIdSet.has(a._expansionId))
)

// 状态
const viewMode = ref('expansion')
const myGroupBy = ref('expansion') // 'expansion' | 'class' | 'sprint'
const currentExpansionId = ref(expansions[0].id)
const currentClass = ref('圣骑士')
const query = ref('')
const selectedClass = ref('all')
const selectedDifficulty = ref('all')
const selectedMetric = ref('all')
const selectedStatus = ref('未完成')

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

// 所有职业列表（保持炉石原顺序）
const allClasses = getClassOrder().filter(c => c !== '双职业' && c !== '中立').concat(['双职业', '中立'])
const classOrder = getClassOrder()

// 当前版本
const currentExpansion = computed(() =>
  expansions.find((exp) => exp.id === currentExpansionId.value)
)

const currentClassName = computed(() => currentClass.value)
const onClassTabClick = (cls) => {
  currentClass.value = cls
}
const myViewSubLabel = computed(() => {
  const prefix = user.value ? '我的进度' : '全部成就'
  if (myGroupBy.value === 'sprint') return `${prefix} - 待完成清单`
  const scope = myGroupBy.value === 'expansion' ? currentExpansion.value?.name : currentClassName.value
  return `${prefix} - ${scope}`
})

// 当前版本的成就
const currentExpansionAchievements = computed(() => {
  const exp = currentExpansion.value
  if (!exp) return []
  return exp.achievements.map(ach => attachCards(ach, exp))
})

// 职业总览：按版本浏览/我的-按版本 默认展开各职业（用户嫌长可自行收起）
const classViewCollapsed = reactive({})
for (const c of classOrder) classViewCollapsed[c] = false
// 按职业浏览/我的-按职业：按版本分组，默认展开
const expViewCollapsed = reactive({})
for (const exp of expansions) expViewCollapsed[exp.id] = false

const resetClassViews = () => {
  for (const c of classOrder) classViewCollapsed[c] = false
  for (const exp of expansions) expViewCollapsed[exp.id] = false
}

const expandAllClasses = () => {
  for (const c of classOrder) classViewCollapsed[c] = false
}
const collapseAllClasses = () => {
  for (const c of classOrder) classViewCollapsed[c] = true
}
// 总览面板「展开/收起全部」：按当前视图切换 职业分组 或 版本分组 的折叠态
const expandAllSections = () => {
  if (viewMode.value === 'my' && myGroupBy.value === 'class') {
    for (const exp of expansions) expViewCollapsed[exp.id] = false
  } else {
    for (const c of classOrder) classViewCollapsed[c] = false
  }
}
const collapseAllSections = () => {
  if (viewMode.value === 'my' && myGroupBy.value === 'class') {
    for (const exp of expansions) expViewCollapsed[exp.id] = true
  } else {
    for (const c of classOrder) classViewCollapsed[c] = true
  }
}

// 是否为「按版本」视图（按版本浏览 / 我的-按版本），用于展示版本描述等通用信息
const isExpansionView = computed(
  () => viewMode.value === 'expansion' || (viewMode.value === 'my' && myGroupBy.value === 'expansion')
)
// 仅在「我的-按版本 / 我的-按职业」时展示总览面板（含完成度进度条与剩余统计一句话说明）
const showClassOverview = computed(
  () => viewMode.value === 'my' && (myGroupBy.value === 'expansion' || myGroupBy.value === 'class')
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
      remaining,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }
  return map
})

// 我的成就 - 按版本：若选中的是「更多版本」里的新增版本，仅作浏览，不计入统计
// （统计始终反映原有 9 个版本，避免新增版本污染「我的成就」完成度）。
const isMyAddedVersion = computed(
  () => viewMode.value === 'my' && myGroupBy.value === 'expansion' && addedExpansionIdSet.has(currentExpansionId.value)
)
// 总览面板作用范围：按版本=当前版本；按职业=当前职业；待完成清单=全部 9 版本成就
const overviewScope = computed(() => {
  if (viewMode.value === 'my' && myGroupBy.value === 'expansion')
    return isMyAddedVersion.value ? classSprintAchievements.value : currentExpansionAchievements.value
  if (viewMode.value === 'my' && myGroupBy.value === 'class') return currentClassAchievements.value
  if (viewMode.value === 'my' && myGroupBy.value === 'sprint') return classSprintAchievements.value
  return []
})
// 总览面板统计（完成度、点数、经验）
const overviewStats = computed(() => getStats(overviewScope.value))
const overviewCompletedCount = computed(() =>
  overviewScope.value.filter((a) => isAchievementCompleted(a)).length
)

// 当前职业的成就（按职业浏览模式）
const currentClassAchievements = computed(() => {
  return classSprintAchievements.value.filter((ach) => ach.heroClass === currentClass.value)
})

// 我的成就模式 - 当前范围的成就列表
const myAchievementsList = computed(() => {
  if (myGroupBy.value === 'sprint') return sprintAllList.value
  if (myGroupBy.value === 'expansion') {
    return currentExpansionAchievements.value
  } else {
    return classSprintAchievements.value.filter((ach) => ach.heroClass === currentClass.value)
  }
})

// 待完成清单视图只有这一套筛选状态，避免顶部标签和下拉框产生范围冲突。
const sprintVersionFilter = ref('all')
const sprintClassFilter = ref('all')
// 指标筛选：按剩余的「一次性 / 累计-次数 / 累计-点数」过滤未完成成就。
const sprintMetricFilter = ref('all')
const sprintMetricOptions = [
  { value: 'all', label: '全部指标' },
  { value: '一次性', label: '剩余一次性' },
  { value: '次数', label: '累计-次数 剩余' },
  { value: '点数', label: '累计-点数 剩余' }
]
const versionOptions = computed(() =>
  expansions.filter((e) => !addedExpansionIdSet.has(e.id)).map((e) => ({ id: e.id, name: e.name }))
)

// 判断一条成就是否命中当前的指标筛选（一次性 / 次数 / 点数）。
const matchSprintMetric = (ach) => {
  if (sprintMetricFilter.value === 'all') return true
  if (sprintMetricFilter.value === '一次性') return ach.type !== '累计'
  if (sprintMetricFilter.value === '次数') return ach.type === '累计' && getMetric(ach) === 'count'
  if (sprintMetricFilter.value === '点数') return ach.type === '累计' && getMetric(ach) === 'points'
  return true
}

// 待完成清单分组折叠状态：三类默认折叠，点击标题展开。
const sprintSectionCollapsed = reactive({ oneTime: true, count: true, points: true })
const toggleSprintSection = (key) => {
  sprintSectionCollapsed[key] = !sprintSectionCollapsed[key]
}

// 待完成清单分组：统一应用版本/职业/指标范围，再按 一次性 / 累计-次数 / 累计-点数 分类。
// 累计两类按剩余从低到高排序（越接近完成越靠前）。
const sprintGroups = computed(() => {
  const oneTime = [] // 一次性成就
  const count = [] // 累计-次数
  const points = [] // 累计-点数

  for (const ach of classSprintAchievements.value) {
    if (sprintVersionFilter.value !== 'all' && ach._expansionId !== sprintVersionFilter.value) continue
    if (sprintClassFilter.value !== 'all' && ach.heroClass !== sprintClassFilter.value) continue
    if (!matchSprintMetric(ach)) continue
    const info = getProgressInfo(ach)
    if (info.completed) continue
    if (ach.type !== '累计') oneTime.push(ach)
    else if (getMetric(ach) === 'points') points.push(ach)
    else count.push(ach)
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
    oneTime: sortByRemaining(oneTime),
    count: sortByRemaining(count),
    points: sortByRemaining(points)
  }
})
const sprintAllList = computed(() => [
  ...sprintGroups.value.oneTime,
  ...sprintGroups.value.count,
  ...sprintGroups.value.points
])

// 当前冲刺筛选范围内的剩余汇总：未完成成就总数 + 各类型成就个数。
const sprintRemainingTotals = computed(() => ({
  total: sprintAllList.value.length,
  oneTime: sprintGroups.value.oneTime.length,
  countAch: sprintGroups.value.count.length,
  pointAch: sprintGroups.value.points.length
}))

// 展示的成就列表
// 有搜索关键词时，跨所有版本与职业全局搜索；否则只看当前范围
const displayAchievements = computed(() => {
  if (query.value.trim()) return allAchievements.value
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
    // 指标筛选：一次性 / 累计·次数 / 累计·点数
    if (selectedMetric.value !== 'all') {
      if (selectedMetric.value === '一次性') {
        if (ach.type !== '一次性') return false
      } else {
        if (ach.type !== '累计') return false
        if (getMetric(ach) !== selectedMetric.value) return false
      }
    }
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

// 按职业筛选时，顶部展示该职业还剩多少个未完成成就（按版本浏览 / 我的-按职业均适用）
const classRemaining = computed(() => {
  const list =
    viewMode.value === 'class'
      ? currentClassAchievements.value
      : viewMode.value === 'my' && myGroupBy.value === 'class'
        ? myAchievementsList.value
        : []
  const remaining = list.filter((a) => !isAchievementCompleted(a)).length
  return { remaining, total: list.length }
})

// 当前范围累计成就「还剩多少次 / 多少点」总计（不含已完成），用于顶部总计横幅
const metricTotals = computed(() => {
  let countRemain = 0
  let pointRemain = 0
  for (const ach of filteredAchievements.value) {
    if (ach.type !== '累计') continue
    if (isAchievementCompleted(ach)) continue
    const count = getCount(ach) ?? 0
    const lastQuota = ach.stages[ach.stages.length - 1].quota
    const remaining = Math.max(0, lastQuota - count)
    if (getMetric(ach) === 'points') pointRemain += remaining
    else countRemain += remaining
  }
  return { countRemain, pointRemain }
})
// 总览面板剩余统计（基于 overviewScope，保证 已完成 + 剩余 = 总数）
const overviewRemaining = computed(() => {
  let achievements = 0
  let countRemain = 0
  let pointRemain = 0
  for (const ach of overviewScope.value) {
    if (isAchievementCompleted(ach)) continue
    achievements += 1
    if (ach.type !== '累计') continue
    const count = getCount(ach) ?? 0
    const lastQuota = ach.stages[ach.stages.length - 1].quota
    const remaining = Math.max(0, lastQuota - count)
    if (getMetric(ach) === 'points') pointRemain += remaining
    else countRemain += remaining
  }
  return { achievements, countRemain, pointRemain }
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
  const { countRemain, pointRemain } = overviewRemaining.value
  // 通行证经验加成：已获得/总经验均按 (1+加成) 放大（成就值不受加成影响）
  const earnedXp = Math.round(stats.earnedXp * (1 + passBonus.value))
  const totalXp = Math.round(stats.totalXp * (1 + passBonus.value))
  const remainXp = Math.max(0, totalXp - earnedXp)
  const remainPts = Math.max(0, stats.totalPoints - stats.earnedPoints)
  const n = (v) => `<b class="hs-num">${v}</b>`
  // 累计剩余：次数为 0 / 点数为 0 时各自不显示
  const cumParts = []
  if (countRemain > 0) cumParts.push(`累计-次数还差 ${n(countRemain)} 次`)
  if (pointRemain > 0) cumParts.push(`累计-点数还差 ${n(pointRemain)} 点`)
  const cumClause = cumParts.length ? `剩余成就中，${cumParts.join('，')}。` : ''
  const line1 =
    `已完成 ${n(`${completedAch}/${totalAch}`)} 个成就，剩余 ${n(remaining)} 个成就；` + cumClause
  const line2 =
    `已获得经验值 ${n(`${earnedXp}/${totalXp}`)}，剩余可获得经验值 ${n(remainXp)}；` +
    `已获得成就值 ${n(`${stats.earnedPoints}/${stats.totalPoints}`)}，剩余可获得成就值 ${n(remainPts)} 点。`
  return { line1, line2 }
})
const metricTotalRemain = computed(() => metricTotals.value.countRemain + metricTotals.value.pointRemain)

// 当前筛选范围内「一次性」成就个数（用于指标=一次性 时的总计横幅）
const oneTimeCount = computed(() =>
  filteredAchievements.value.filter((a) => a.type === '一次性').length
)
// 是否为「按职业」视图（按职业浏览 / 我的-按职业）
const isClassView = computed(
  () => viewMode.value === 'class' || (viewMode.value === 'my' && myGroupBy.value === 'class')
)

// 当前指标筛选下是否有总计次数/点数（或一次性个数）可展示
const hasMetricTotals = computed(() => {
  if (selectedMetric.value === '一次性') return oneTimeCount.value > 0
  return metricTotalRemain.value > 0
})

// 独立总计横幅：仅在非「按职业」视图显示（按职业视图已并入职业剩余横幅）
const showMetricBanner = computed(() => {
  if (viewMode.value === 'my' && myGroupBy.value === 'sprint') return false
  if (isClassView.value) return false
  return hasMetricTotals.value
})

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
  selectedMetric.value = 'all'
  selectedStatus.value = viewMode.value === 'my' ? '未完成' : 'all'
}

const resetViewState = ({ scroll = false } = {}) => {
  resetFilters()
  closeModal()
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' })
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
    resetViewState({ scroll: true })
  }
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
  // 图片 URL 已在构建期解析（eager glob），点击即同步可用，弹窗立即出现。
  if (!achievement.cards || !achievement.cards.some((card) => card.image)) return
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

const getClassStyle = (heroClass) => ({
  '--hs-class-color': classColors[heroClass] || '#8b7355'
})

const getClassBadgeStyle = (heroClass) => ({
  backgroundColor: classColors[heroClass] || '#8b7355',
  color: '#fff'
})

const expansionColor = '#6b5b4f'
const getExpansionStyle = () => ({
  '--hs-class-color': expansionColor
})
const getExpansionBadgeStyle = () => ({
  backgroundColor: expansionColor,
  color: '#fff'
})

const showEmpty = computed(() => filteredAchievements.value.length === 0)
</script>

<style scoped>
.hs-class-overview-browse-count {
  font-size: 15px;
  font-weight: 600;
  color: var(--hs-text-soft);
}
.hs-class-overview-browse-count b {
  color: var(--hs-text);
  font-size: 17px;
  font-weight: 700;
}

.hs-overview-note {
  margin: 0 0 10px;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #8a6d3b;
  background: #fff8e6;
  border: 1px solid #f0d9a8;
  border-radius: 10px;
}
.hs-overview-note strong {
  color: #a9791f;
}

.hs-export-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 4px;
  padding: 12px 14px;
  background: var(--hs-surface-overlay);
  border: 1px solid var(--hs-border);
  border-radius: 12px;
}
.hs-export-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-text-soft);
}
.hs-export-hint {
  font-size: 12px;
  color: var(--hs-muted);
}
.hs-pass {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-text-soft);
}
.hs-pass-select {
  min-height: 44px;
  padding: 6px 30px 6px 10px;
  font-size: 13px;
  border: 1px solid var(--hs-border);
  border-radius: 9px;
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  cursor: pointer;
}
.hs-pass-select option {
  color: #0f172a;
  background: #fff;
}
.hs-pass-select:focus {
  outline: 3px solid rgba(251, 191, 36, 0.45);
  outline-offset: 2px;
  border-color: #fbbf24;
}
.hs-xp-line {
  margin-top: 2px;
}
.hs-xp-line b {
  color: #fbbf24;
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

/* ============ 成就达成庆祝提示 ============ */
.hs-celebrate {
  position: fixed;
  top: 92px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  pointer-events: none;
}
.hs-celebrate-card {
  position: relative;
  width: min(360px, 86vw);
  padding: 24px 26px 20px;
  text-align: center;
  border-radius: 18px;
  background: linear-gradient(158deg, #1e3a2f 0%, #0f1f2b 100%);
  border: 1px solid rgba(74, 222, 128, 0.4);
  box-shadow: 0 22px 64px rgba(2, 6, 23, 0.6), 0 0 0 1px rgba(251, 191, 36, 0.14) inset;
  color: #e2e8f0;
  overflow: hidden;
}
.hs-celebrate-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 50%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.14), transparent);
  transform: skewX(-18deg);
  animation: hs-celebrate-shimmer 2.2s ease-in-out 0.2s infinite;
}
.hs-celebrate-ring {
  position: absolute;
  top: 30px;
  left: 50%;
  width: 72px;
  height: 72px;
  margin-left: -36px;
  border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.6);
  animation: hs-celebrate-ring 1.1s ease-out forwards;
}
.hs-celebrate-icon {
  position: relative;
  font-size: 46px;
  line-height: 1;
  margin: 4px 0 10px;
  animation: hs-celebrate-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.5) both;
  filter: drop-shadow(0 4px 10px rgba(251, 191, 36, 0.4));
}
.hs-celebrate-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
  color: #fbbf24;
  text-transform: uppercase;
}
.hs-celebrate-name {
  margin: 0 0 6px;
  font-size: 19px;
  font-weight: 700;
  color: #f8fafc;
}
.hs-celebrate-sub {
  margin: 0;
  font-size: 12.5px;
  color: #94a3b8;
}
/* 彩屑爆发 */
.hs-celebrate-confetti {
  position: absolute;
  top: 50px;
  left: 50%;
  width: 0;
  height: 0;
}
.hs-confetti {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  opacity: 0;
  transform: translate(-50%, -50%);
  animation: hs-confetti-burst 0.9s ease-out forwards;
}
@keyframes hs-celebrate-pop {
  0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.18) rotate(6deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes hs-celebrate-ring {
  0% { transform: scale(0.5); opacity: 0.85; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes hs-celebrate-shimmer {
  0% { left: -60%; }
  60%, 100% { left: 130%; }
}
@keyframes hs-confetti-burst {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(0.4) rotate(180deg); }
}
.hs-celebrate-fade-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}
.hs-celebrate-fade-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.hs-celebrate-fade-enter-from,
.hs-celebrate-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-18px);
}
</style>
