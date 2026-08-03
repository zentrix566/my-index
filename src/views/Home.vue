<template>
  <section class="section hero-section">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="eyebrow">个人内容入口</p>
        <h1>Zentrix 的工作项目与个人项目</h1>
        <p class="hero-subtitle">
          这里分两条线：一边是放进简历的运维/AIOps 工作项目，一边是自己折腾的小页面和小工具，一个入口。
        </p>
        <div class="hero-actions">
          <RouterLink class="button primary" to="/projects">看工作项目</RouterLink>
          <RouterLink class="button secondary" to="/vue-apps">逛个人项目</RouterLink>
        </div>
      </div>
      <div class="hero-panel" aria-label="站点模块概览">
        <RouterLink class="signal-card" to="/projects">
          <span class="signal-label">工作项目</span>
          <strong>{{ projects.length }}</strong>
          <span>工作项目</span>
        </RouterLink>
        <RouterLink class="signal-card" to="/vue-apps">
          <span class="signal-label">个人项目</span>
          <strong>{{ vueApps.length }}</strong>
          <span>个人项目</span>
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">工作项目</p>
        <h2>工作项目</h2>
        <p>把项目经验整理成一个分区，新增项目只需维护数据文件。</p>
      </div>
      <ProjectGrid :projects="projects" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/projects">查看全部工作项目 →</RouterLink>
      </div>
    </div>
  </section>

  <section class="section muted-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">个人项目</p>
        <h2>个人项目</h2>
        <p>自己写的小页面和小工具：智能运维控制台、训练数据看板、人生倒计时，还有个发疯小人。</p>
      </div>
      <VueAppGrid :apps="vueApps" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/vue-apps">进入个人项目索引 →</RouterLink>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">友情链接</p>
        <h2>友情链接</h2>
        <p>顺手收藏的站点，也欢迎互换链接。</p>
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
