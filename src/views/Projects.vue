<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">工作项目</p>
        <h1>工作项目</h1>
        <p>把项目经验作为索引站里的一个分区，后续可以继续扩展为案例库或文章库。</p>
      </div>
      <div class="project-groups">
        <section v-for="g in projectGroups.filter((x) => x.items.length)" :key="g.name" class="project-group">
          <h2 class="group-title">{{ g.name }}</h2>
          <ProjectGrid v-if="g.items.length" :projects="g.items" />
          <p v-else class="group-empty">（暂无，把简历相关项目设 group: '工作项目' 即可显示在此）</p>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup>
import ProjectGrid from '../components/ProjectGrid.vue'
import { projects } from '../data/projects'

// 来源分组：工作项目（简历中用到的）/ 个人项目（自己做的）
const GROUP_ORDER = ['工作项目', '个人项目']
const projectGroups = GROUP_ORDER.map((name) => ({
  name,
  items: projects.filter((p) => p.group === name)
}))
</script>

<style scoped>
.project-groups {
  display: flex;
  flex-direction: column;
  gap: 44px;
}
.group-title {
  margin: 0 0 18px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--line, #e2e8f0);
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text, #1f2937);
}
.group-empty {
  margin: 0;
  color: var(--text-muted, #9ca3af);
  font-size: 0.9rem;
}
</style>
