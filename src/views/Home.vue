<template>
  <section class="section hero-section">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="eyebrow">Zentrix · Build, Learn, Iterate</p>
        <h1>把想法做成<br><span>真正可用的工具</span></h1>
        <p class="hero-subtitle">
          一个持续生长的个人产品中心：这里有日常使用的效率工具、炉石数据项目，也有来自 DevOps 与 AIOps 实践的工程复盘。
        </p>
        <div class="hero-actions">
          <RouterLink class="button primary" to="/projects">探索全部项目</RouterLink>
          <RouterLink class="button secondary" to="/changelog">查看最近更新</RouterLink>
        </div>
      </div>
      <div class="hero-panel hero-command" aria-label="站点模块概览">
        <div class="hero-command-top"><span class="status-dot"></span><span>持续构建中</span><small>Last update · {{ latestUpdate.date }}</small></div>
        <div class="hero-command-grid">
          <RouterLink class="signal-card" to="/projects#personal-projects"><span class="signal-label">个人产品</span><span class="signal-figure"><strong>{{ vueApps.length }}</strong><span>个工具与实验</span></span></RouterLink>
          <RouterLink class="signal-card" to="/projects#work-projects"><span class="signal-label">工程案例</span><span class="signal-figure"><strong>{{ projects.length }}</strong><span>份实践复盘</span></span></RouterLink>
        </div>
        <RouterLink class="hero-latest" :to="latestUpdate.route || '/changelog'">
          <span>最新动态</span><strong>{{ latestUpdate.title }}</strong><span aria-hidden="true">→</span>
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="section muted-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Featured Products</p>
        <h2>每天都可能用到的核心产品</h2>
        <p>从数据追踪到日程管理与自我成长，优先展示持续维护的三个核心入口。</p>
      </div>
      <VueAppGrid :apps="featuredApps" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/projects">查看另外 {{ vueApps.length - featuredApps.length }} 个项目 →</RouterLink>
      </div>
    </div>
  </section>

  <section v-if="recentApps.length" class="section compact-section">
    <div class="container">
      <div class="section-heading align-left section-heading-row"><div><p class="eyebrow">Continue</p><h2>继续最近使用</h2></div><RouterLink to="/projects">管理收藏与历史 →</RouterLink></div>
      <VueAppGrid :apps="recentApps" />
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Engineering Practice</p>
        <h2>把工程经验沉淀成可复用方案</h2>
        <p>精选 Linux 智能诊断与 CI/CD 实践，其余案例可在项目索引中继续浏览。</p>
      </div>
      <ProjectGrid :projects="projects.slice(0, 2)" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/projects">查看全部工作项目 →</RouterLink>
      </div>
    </div>
  </section>

  <section class="section muted-section home-updates-section">
    <div class="container updates-layout">
      <div class="section-heading align-left"><p class="eyebrow">What's New</p><h2>最近更新</h2><p>每一次调整都留下记录，方便了解功能是如何持续演进的。</p><RouterLink class="button secondary" to="/changelog">查看完整更新日志</RouterLink></div>
      <div class="update-list">
        <RouterLink v-for="item in latestUpdates" :key="`${item.date}-${item.category}`" :to="item.route || '/changelog'" class="update-item">
          <time>{{ item.date }}</time><strong>{{ item.title }}</strong><span>{{ categoryLabel(item.category) }}</span><b aria-hidden="true">→</b>
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">站外推荐</p>
        <h2>友情链接</h2>
        <p>一些值得收藏的实用站点，也欢迎互换链接。</p>
      </div>
      <FriendLinkGrid :links="friendLinks" />
    </div>
  </section>
</template>

<script setup>
import FriendLinkGrid from '../components/FriendLinkGrid.vue'
import ProjectGrid from '../components/ProjectGrid.vue'
import VueAppGrid from '../components/VueAppGrid.vue'
import { friendLinks } from '../data/friendLinks'
import { projects } from '../data/projects'
import { vueApps } from '../data/vueApps'
import { changelog } from '../data/changelog.js'
import { computed } from 'vue'
import { useProjectPreferences } from '../composables/useProjectPreferences.js'

const featuredPaths = ['/hearthstone', '/todo', '/willpower']
const featuredApps = vueApps.filter((app) => featuredPaths.includes(app.to))
const latestUpdates = changelog.slice(0, 3)
const latestUpdate = latestUpdates[0]
const { recents } = useProjectPreferences()
const recentApps = computed(() => recents.value.map((path) => vueApps.find((app) => app.to === path)).filter(Boolean).slice(0, 3))
const categoryLabel = (category) => ({ site: '站点', todo: '日程', hearthstone: '炉石', willpower: '心魔', other: '其他' }[category] || '项目')
</script>

<style scoped>
.hero-copy h1 span { color: var(--primary); }
.hero-command { padding: 10px; border: 1px solid var(--line); border-radius: var(--radius-xl); background: color-mix(in srgb, var(--surface) 88%, transparent); box-shadow: var(--shadow-lg); }
.hero-command-top { display: flex; align-items: center; gap: 8px; padding: 10px 10px 16px; color: var(--muted); font-size: 13px; }
.hero-command-top small { margin-left: auto; }
.status-dot { width: 9px; height: 9px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 5px rgba(34, 197, 94, .12); }
.hero-command-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.hero-command .signal-card { box-shadow: none; }
.hero-latest { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; margin-top: 10px; padding: 14px; border-radius: var(--radius-md); color: var(--text); background: var(--surface-soft); text-decoration: none; }
.hero-latest span:first-child { color: var(--muted); font-size: 12px; }
.hero-latest strong { font-size: 14px; }
.compact-section { padding-top: 24px; }
.section-heading-row { display: flex; align-items: end; justify-content: space-between; max-width: none; }
.section-heading-row a { color: var(--primary); font-weight: 750; text-decoration: none; }
.updates-layout { display: grid; grid-template-columns: minmax(260px, .75fr) minmax(0, 1.25fr); gap: 64px; align-items: start; }
.update-list { display: grid; gap: 10px; }
.update-item { display: grid; grid-template-columns: 92px minmax(0, 1fr) auto auto; gap: 14px; align-items: center; min-height: 70px; padding: 14px 18px; border: 1px solid var(--line); border-radius: var(--radius-md); color: var(--text); background: var(--surface); text-decoration: none; transition: var(--transition-base); }
.update-item:hover { border-color: var(--primary); transform: translateX(3px); }
.update-item time, .update-item span { color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
.update-item span { padding: 3px 9px; border-radius: 99px; background: var(--surface-soft); }
@media (max-width: 760px) {
  .hero-command-grid, .updates-layout { grid-template-columns: 1fr; }
  .updates-layout { gap: 32px; }
  .hero-command-top small { display: none; }
  .section-heading-row { align-items: flex-start; flex-direction: column; }
  .update-item { grid-template-columns: 1fr auto; }
  .update-item time, .update-item span { grid-row: 2; }
}
</style>
