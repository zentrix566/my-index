<template>
  <section class="section hero-section">
    <div class="container hero-layout">
      <div class="hero-copy">
        <p class="eyebrow">个人内容入口</p>
        <h1>Zentrix 的项目、数据与工具索引</h1>
        <p class="hero-subtitle">
          这里不再只是项目经历展示，而是把 AIOps 实践、跑步间歇数据、工具实验和接下来想做的网页统一收纳起来。
        </p>
        <div class="hero-actions">
          <RouterLink class="button primary" to="/projects">看项目</RouterLink>
          <RouterLink class="button secondary" to="/interval-training">打开训练数据</RouterLink>
        </div>
      </div>
      <div class="hero-panel" aria-label="站点模块概览">
        <div class="signal-card">
          <span class="signal-label">AIOps</span>
          <strong>{{ projects.length }}</strong>
          <span>项目沉淀</span>
        </div>
        <div class="signal-card">
          <span class="signal-label">Training</span>
          <strong>{{ trainingStats.sessions }}</strong>
          <span>间歇记录</span>
        </div>
        <div class="signal-card">
          <span class="signal-label">Lab</span>
          <strong>2</strong>
          <span>网页方向</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Projects</p>
        <h2>运维与 AIOps 项目</h2>
        <p>项目经历从首页拆成独立内容模块，后续新增项目只需要维护数据文件。</p>
      </div>
      <ProjectGrid :projects="projects" />
    </div>
  </section>

  <section class="section muted-section">
    <div class="container split-layout">
      <div class="section-heading align-left">
        <p class="eyebrow">Training Data</p>
        <h2>400 米间歇训练数据</h2>
        <p>
          从 zentrix566.github.io 的间歇训练记录迁移为 Vue 页面，保留配速、评级、日历和导入导出能力。
        </p>
        <RouterLink class="button primary" to="/interval-training">进入训练看板</RouterLink>
      </div>
      <div class="metric-list">
        <div class="metric-item">
          <span>训练次数</span>
          <strong>{{ trainingStats.sessions }}</strong>
        </div>
        <div class="metric-item">
          <span>总组数</span>
          <strong>{{ trainingStats.laps }}</strong>
        </div>
        <div class="metric-item">
          <span>平均配速</span>
          <strong>{{ trainingStats.avgPace }}</strong>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import ProjectGrid from '../components/ProjectGrid.vue'
import { projects } from '../data/projects'
import { intervalTrainingSessions, normalizeSessions, secondsToPace } from '../data/intervalTraining'

const sessions = normalizeSessions(intervalTrainingSessions)

const trainingStats = computed(() => {
  const laps = sessions.flatMap((session) => session.laps)
  return {
    sessions: sessions.length,
    laps: laps.length,
    avgPace: laps.length
      ? secondsToPace(laps.reduce((sum, lap) => sum + lap.paceSeconds, 0) / laps.length)
      : '-'
  }
})
</script>
