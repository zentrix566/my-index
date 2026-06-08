<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Projects</p>
        <h1>运维与 AIOps 项目</h1>
        <p>把项目经验作为索引站里的一个分区，后续可以继续扩展为案例库或文章库。</p>
      </div>
      <ProjectGrid :projects="projects" />
    </div>
  </section>
</template>

<script setup>
import ProjectGrid from '../components/ProjectGrid.vue'
import { projects } from '../data/projects'
</script>
