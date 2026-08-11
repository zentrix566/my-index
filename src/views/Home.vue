<template>
  <section class="section hero-section">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="eyebrow">Zentrix 的个人索引站</p>
        <h1>项目与工具集</h1>
        <p class="hero-subtitle">
          这里既沉淀运维、DevOps 与 AIOps 项目经验，也持续打磨炉石工具、抵御心魔和一些有趣的小实验。
        </p>
        <div class="hero-actions">
          <RouterLink class="button primary" to="/projects">浏览全部项目</RouterLink>
        </div>
      </div>
      <div class="hero-panel" aria-label="站点模块概览">
        <RouterLink class="signal-card" to="/projects">
          <span class="signal-label">个人作品</span>
          <span class="signal-figure"><strong>{{ vueApps.length }}</strong> 个页面与工具</span>
        </RouterLink>
        <RouterLink class="signal-card" to="/projects">
          <span class="signal-label">工程实践</span>
          <span class="signal-figure"><strong>{{ projects.length }}</strong> 个项目案例</span>
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="section muted-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">游戏 · 自律 · 小工具</p>
        <h2>持续打磨的个人作品</h2>
        <p>以炉石成就与卡组工具、抵御心魔为核心，也收录训练看板、人生倒计时和发疯小人等小实验。</p>
      </div>
      <VueAppGrid :apps="vueApps" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/projects">进入项目索引 →</RouterLink>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">运维 · DevOps · AIOps</p>
        <h2>工程实践与项目复盘</h2>
        <p>从 Linux 智能诊断、CI/CD 发布到上云迁移，记录可以复用的工程方案与实践经验。</p>
      </div>
      <ProjectGrid :projects="projects" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/projects">查看全部工作项目 →</RouterLink>
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
</script>
