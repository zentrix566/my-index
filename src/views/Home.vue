<template>
  <section class="section hero-section">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="eyebrow">个人内容入口</p>
        <h1>Zentrix 的项目与 Vue 项目</h1>
        <p class="hero-subtitle">
          这里放我的运维/AIOps 项目沉淀，以及一些自己用 Vue 写的小页面和小工具，两条线索，一个入口。
        </p>
        <div class="hero-actions">
          <RouterLink class="button primary" to="/projects">看项目</RouterLink>
          <RouterLink class="button secondary" to="/vue-apps">逛 Vue 项目</RouterLink>
        </div>
      </div>
      <div class="hero-panel" aria-label="站点模块概览">
        <RouterLink class="signal-card" to="/projects">
          <span class="signal-label">Projects</span>
          <strong>{{ projects.length }}</strong>
          <span>运维项目</span>
        </RouterLink>
        <RouterLink class="signal-card" to="/vue-apps">
          <span class="signal-label">Vue Apps</span>
          <strong>{{ vueApps.length }}</strong>
          <span>Vue 项目</span>
        </RouterLink>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Projects</p>
        <h2>运维与 AIOps 项目</h2>
        <p>把项目经验整理成一个分区，新增项目只需维护数据文件。</p>
      </div>
      <ProjectGrid :projects="projects" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/projects">查看全部项目 →</RouterLink>
      </div>
    </div>
  </section>

  <section class="section muted-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Vue Apps</p>
        <h2>我的 Vue 项目</h2>
        <p>自己写的小页面和小工具：智能运维控制台、训练数据看板、人生倒计时，还有个发疯小人。</p>
      </div>
      <VueAppGrid :apps="vueApps" />
      <div class="section-more">
        <RouterLink class="button secondary" to="/vue-apps">进入 Vue 项目索引 →</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import ProjectGrid from '../components/ProjectGrid.vue'
import VueAppGrid from '../components/VueAppGrid.vue'
import { projects } from '../data/projects'
import { vueApps } from '../data/vueApps'
</script>
