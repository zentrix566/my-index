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
            <div class="hs-wiki-menu" v-click-outside="closeWikiMenu">
              <button
                type="button"
                class="hs-btn hs-btn-ghost hs-wiki-toggle"
                :class="{ active: wikiMenuOpen }"
                @click="toggleWikiMenu"
                :aria-expanded="wikiMenuOpen"
                title="各版本成就 Wiki（含无经验值成就完整清单）"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>
                </svg>
                更多攻略
                <svg class="hs-wiki-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div v-if="wikiMenuOpen" class="hs-wiki-panel" role="menu">
                <p class="hs-wiki-panel-tip">各版本成就 Wiki（含无经验值成就完整清单）</p>
                <div class="hs-wiki-grid">
                  <a
                    v-for="w in allWikiLinks"
                    :key="w.url"
                    :href="w.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="hs-wiki-item"
                    role="menuitem"
                    @click="closeWikiMenu"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    {{ w.name }}
                  </a>
                </div>
              </div>
            </div>
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
          <!-- 按职业/我的(按职业)：职业选择；冲刺推荐使用视图内的统一筛选器 -->
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
            :class="{ active: myGroupBy === 'sprint' }"
            type="button"
            @click="myGroupBy = 'sprint'"
          >冲刺推荐</button>
        </div>

        <div v-if="progressLoading" class="hs-progress-status" role="status">正在加载成就进度…</div>
        <div v-else-if="progressError" class="hs-progress-status hs-progress-error" role="alert">
          成就进度加载失败，当前显示的数据可能不是最新的。
          <button type="button" @click="reloadProgress">重试</button>
        </div>

        <div class="hs-stats-panel">
          <template v-if="myGroupBy === 'sprint'">
            <div class="hs-stats-info">
              <span class="hs-stats-percent">{{ sprintAllList.length }}</span>
              <span class="hs-stats-detail">
                项冲刺目标 · A {{ sprintGroups.A.length }} · B {{ sprintGroups.B.length }} · C {{ sprintGroups.C.length }} · D {{ sprintGroups.D.length }} · E {{ sprintGroups.E.length }}
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

        <!-- 导出（JSON 导出/导入暂隐藏，待启用） -->
        <div class="hs-export-bar" v-if="viewMode === 'my'">
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
      <div class="hs-batch-bar" v-if="viewMode === 'my' && user">
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

      <FilterBar
        v-if="!(viewMode === 'my' && myGroupBy === 'sprint')"
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
        <span v-else-if="myGroupBy === 'sprint'">按「接近完成 → 低投入 → 中等投入 → 长期目标」分组，始终遵循下方版本和职业筛选</span>
        <span v-else>查看我的成就完成进度</span>
      </section>

      <!-- 按版本浏览/我的-按版本：职业总览（默认收起，点击职业展开明细） -->
      <div v-if="showClassOverview" class="hs-class-overview">
        <div class="hs-class-overview-head">
          <div class="hs-class-overview-stats">
            <span class="hs-class-overview-pct">{{ overviewStats.percentage }}%</span>
            <span class="hs-class-overview-detail">
              已完成 {{ overviewCompletedCount }} / {{ currentExpansionAchievements.length }} 个成就 · 已得 {{ overviewStats.earnedPoints }}/{{ overviewStats.totalPoints }} 点
            </span>
          </div>
          <div class="hs-class-overview-actions">
            <button type="button" class="hs-btn hs-btn-ghost" @click="expandAllClasses">展开全部</button>
            <button type="button" class="hs-btn hs-btn-ghost" @click="collapseAllClasses">收起全部</button>
          </div>
        </div>
        <p class="hs-class-overview-tip">默认按职业收起，点击职业标题即可展开该职业的成就明细。</p>
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
            :summary="classViewSummaries[heroClass]"
            @card-click="openCardModal"
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
            :editable="Boolean(user)"
            :select-mode="batchMode"
            :selected-ids="selectedAchIds"
            @card-click="openCardModal"
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
            :editable="Boolean(user)"
            :select-mode="batchMode"
            :selected-ids="selectedAchIds"
            @card-click="openCardModal"
            @toggle-select="toggleSelect"
          />
        </template>
      </div>

      <!-- 我的成就-冲刺推荐：统一筛选后按投入程度分组 -->
      <div v-else-if="myGroupBy === 'sprint'" class="hs-priority-wrap">
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
        </div>
        <section v-if="sprintGroups.A.length" class="hs-priority-group hs-priority-group-a">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              <span class="hs-priority-rank">A</span> 最接近完成 <small>{{ sprintGroups.A.length }} 个</small>
            </h3>
            <span class="hs-priority-group-tip">优先清掉，完成数涨最快</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.A"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="sprintGroups.B.length" class="hs-priority-group hs-priority-group-b">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              <span class="hs-priority-rank">B</span> 还差 ≤20 次 <small>{{ sprintGroups.B.length }} 个</small>
            </h3>
            <span class="hs-priority-group-tip">A 组清完后顺手做</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.B"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="sprintGroups.C.length" class="hs-priority-group hs-priority-group-c">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              <span class="hs-priority-rank">C</span> 还差 21–50 次 <small>{{ sprintGroups.C.length }} 个</small>
            </h3>
            <span class="hs-priority-group-tip">按兴致推进</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.C"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="sprintGroups.D.length" class="hs-priority-group hs-priority-group-d">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              <span class="hs-priority-rank">D</span> 一次性剩余多阶段 <small>{{ sprintGroups.D.length }} 个</small>
            </h3>
            <span class="hs-priority-group-tip">需要多步推进，放最后</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.D"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
            />
          </div>
        </section>

        <section v-if="sprintGroups.E.length" class="hs-priority-group hs-priority-group-e">
          <div class="hs-priority-group-head">
            <h3 class="hs-priority-group-title">
              <span class="hs-priority-rank">E</span> 累计还差 ≥51 次 <small>{{ sprintGroups.E.length }} 个</small>
            </h3>
            <span class="hs-priority-group-tip">需大量投入，慢慢磨</span>
          </div>
          <div class="hs-achievement-list hs-priority-list">
            <MyAchievementCard
              v-for="ach in sprintGroups.E"
              :key="ach.id"
              :achievement="ach"
              :show-remaining="true"
              :editable="Boolean(user)"
              @click="openCardModal"
            />
          </div>
        </section>

        <p v-if="!sprintAllList.length" class="hs-sprint-empty">
          当前筛选范围内没有未完成的冲刺目标。
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
import { computed, ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { expansions, originalExpansions, addedExpansions } from '../hearthstone-achievements/data/expansions.js'
import { wikiLinks } from '../hearthstone-achievements/data/wikiLinks.js'
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

// ============ 「更多攻略」版本 Wiki 导航（含无经验值成就的完整清单） ============
const wikiMenuOpen = ref(false)
const allWikiLinks = wikiLinks
function toggleWikiMenu() {
  wikiMenuOpen.value = !wikiMenuOpen.value
}
function closeWikiMenu() {
  wikiMenuOpen.value = false
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

async function saveProgress(payload) {
  if (savingProgress.value) return
  savingProgress.value = true
  try {
    const resp = await fetch('/api/achievements/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress: { [payload.id]: { stages: payload.stages, count: payload.count } }
      })
    })
    if (!resp.ok) throw new Error('保存失败')
    await reloadProgress()
    showToast('success', '保存成功')
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
const myGroupBy = ref('expansion') // 'expansion' | 'class' | 'sprint'
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
  currentClass.value = cls
}
const myViewSubLabel = computed(() => {
  const prefix = user.value ? '我的进度' : '全部成就'
  if (myGroupBy.value === 'sprint') return `${prefix} - 冲刺推荐`
  const scope = myGroupBy.value === 'expansion' ? currentExpansion.value?.name : currentClassName.value
  return `${prefix} - ${scope}`
})

// 当前版本的成就
const currentExpansionAchievements = computed(() => {
  const exp = currentExpansion.value
  if (!exp) return []
  return exp.achievements.map(ach => attachCards(ach, exp))
})

// 职业总览：按版本浏览/我的-按版本 默认收起各职业，点击展开明细
const classViewCollapsed = reactive({})
for (const c of classOrder) classViewCollapsed[c] = true
// 按职业浏览/我的-按职业：按版本分组，默认展开
const expViewCollapsed = reactive({})
for (const exp of expansions) expViewCollapsed[exp.id] = false

const resetClassViews = () => {
  for (const c of classOrder) classViewCollapsed[c] = true
  for (const exp of expansions) expViewCollapsed[exp.id] = false
}

const expandAllClasses = () => {
  for (const c of classOrder) classViewCollapsed[c] = false
}
const collapseAllClasses = () => {
  for (const c of classOrder) classViewCollapsed[c] = true
}

// 仅在「按版本浏览 / 我的-按版本」时展示职业总览面板
const showClassOverview = computed(
  () => viewMode.value === 'expansion' || (viewMode.value === 'my' && myGroupBy.value === 'expansion')
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

// 当前版本整体完成度（总览面板用）
const overviewStats = computed(() => getStats(currentExpansionAchievements.value))
const overviewCompletedCount = computed(() =>
  currentExpansionAchievements.value.filter((a) => isAchievementCompleted(a)).length
)

// 当前职业的成就（按职业浏览模式）
const currentClassAchievements = computed(() => {
  return allAchievements.value.filter((ach) => ach.heroClass === currentClass.value)
})

// 我的成就模式 - 当前范围的成就列表
const myAchievementsList = computed(() => {
  if (myGroupBy.value === 'sprint') return sprintAllList.value
  if (myGroupBy.value === 'expansion') {
    return currentExpansionAchievements.value
  } else {
    return allAchievements.value.filter((ach) => ach.heroClass === currentClass.value)
  }
})

// 冲刺推荐视图只有这一套筛选状态，避免顶部标签和下拉框产生范围冲突。
const sprintVersionFilter = ref('all')
const sprintClassFilter = ref('all')
const versionOptions = computed(() => expansions.map((e) => ({ id: e.id, name: e.name })))

// 冲刺推荐分组：统一应用版本和职业范围，再按剩余投入分档。
const sprintGroups = computed(() => {
  const A = [] // 一次即成（零成本）
  const B = [] // 累计还差 ≤20（做几把就满）
  const C = [] // 累计还差 21~50（中等投入）
  const D = [] // 一次性剩多阶段（优先级最低）
  const E = [] // 累计还差 ≥51（长期目标，最大投入）

  for (const ach of allAchievements.value) {
    if (sprintVersionFilter.value !== 'all' && ach._expansionId !== sprintVersionFilter.value) continue
    if (sprintClassFilter.value !== 'all' && ach.heroClass !== sprintClassFilter.value) continue
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
const sprintAllList = computed(() => [
  ...sprintGroups.value.A,
  ...sprintGroups.value.B,
  ...sprintGroups.value.C,
  ...sprintGroups.value.D,
  ...sprintGroups.value.E
])

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
const openCardModal = async (achievement) => {
  // 我的成就 + 已登录：打开进度编辑
  if (viewMode.value === 'my' && user.value) {
    openEditModal(achievement)
    return
  }
  // 浏览模式 / 我的成就（未登录仅查看）：展示关联卡牌图片，编辑需登录
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
.hs-export-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 4px;
  padding: 12px 14px;
  background: rgba(15, 31, 43, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.hs-export-label {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}
.hs-export-hint {
  font-size: 12px;
  color: #94a3b8;
}
.hs-pass {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}
.hs-pass-select {
  min-height: 44px;
  padding: 6px 30px 6px 10px;
  font-size: 13px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 9px;
  background: rgba(2, 6, 23, 0.3);
  color: #f8fafc;
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
</style>
