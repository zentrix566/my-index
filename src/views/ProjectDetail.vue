<template>
  <section class="section page-section">
    <div class="container narrow-container" v-if="project">
      <RouterLink class="back-link" to="/projects">返回项目列表</RouterLink>
      <div class="detail-header">
        <p class="eyebrow">{{ project.category }}</p>
        <h1>{{ project.title }}</h1>
        <p>{{ project.summary }}</p>
        <div class="tag-row">
          <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
        </div>
        <div class="detail-actions">
          <a
            v-for="link in primaryLinks"
            :key="link.url"
            class="button"
            :class="link.kind === 'repositories' ? 'primary' : 'secondary'"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ link.kind === 'repositories' ? 'GitHub 源码' : '技术文章' }}
          </a>
        </div>
      </div>

      <section class="dashboard-panel">
        <h2>项目概览</h2>
        <p>{{ project.overview }}</p>
      </section>

      <section class="dashboard-panel">
        <h2>实践重点</h2>
        <ul class="feature-list">
          <li v-for="item in project.highlights" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="dashboard-panel">
        <h2>技术栈</h2>
        <div class="tag-row">
          <span v-for="item in project.stack" :key="item">{{ item }}</span>
        </div>
      </section>

      <section v-if="project.links?.articles?.length" class="dashboard-panel">
        <h2>微信文章目录</h2>
        <div class="link-list">
          <a
            v-for="article in project.links.articles"
            :key="article.url"
            class="link-item"
            :href="article.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="link-icon">文章</span>
            <span class="link-copy">
              <strong>{{ article.title }}</strong>
              <span>{{ article.description }}</span>
            </span>
            <span class="arrow">→</span>
          </a>
        </div>
      </section>

      <section v-if="project.links?.repositories?.length" class="dashboard-panel">
        <h2>GitHub 仓库</h2>
        <div class="link-list">
          <a
            v-for="repo in project.links.repositories"
            :key="repo.url"
            class="link-item"
            :href="repo.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="link-icon">GitHub</span>
            <span class="link-copy">
              <strong>{{ repo.title }}</strong>
              <span>{{ repo.description }}</span>
            </span>
            <span class="arrow">→</span>
          </a>
        </div>
      </section>
    </div>

    <div class="container narrow-container" v-else>
      <div class="dashboard-panel empty-state">
        <h1>项目不存在</h1>
        <p>这个项目入口还没有配置。</p>
        <RouterLink class="button primary" to="/projects">返回项目列表</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { findProject } from '../data/projects'

const route = useRoute()
const project = computed(() => findProject(route.params.slug))
const primaryLinks = computed(() => {
  if (!project.value?.links) return []

  return [
    project.value.links.repositories?.[0] && { ...project.value.links.repositories[0], kind: 'repositories' },
    project.value.links.articles?.[0] && { ...project.value.links.articles[0], kind: 'articles' }
  ].filter(Boolean)
})
</script>
