<template>
  <section class="section page-section">
    <div class="container narrow-container" v-if="project">
      <RouterLink class="back-link" to="/projects">返回项目列表</RouterLink>
      <div class="detail-header">
        <p class="eyebrow">
          <span class="eyebrow-group" v-if="project.group">{{ project.group }}</span>
          <span class="eyebrow-sep" v-if="project.group">·</span>{{ project.category }}
        </p>
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
            :class="link.kind === 'demos' || link.kind === 'repositories' ? 'primary' : 'secondary'"
            :href="link.url"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
          >
            {{ link.kind === 'demos' ? '在线演示' : link.kind === 'repositories' ? 'GitHub 源码' : '技术文章' }}
          </a>
        </div>
      </div>

      <section class="dashboard-panel">
        <h2>项目概览</h2>
        <p>{{ project.overview }}</p>
      </section>

      <section v-if="project.flow?.length" class="dashboard-panel">
        <h2>交付流程</h2>
        <p>边缘节点从创建到纳管、上线、监控的完整生命周期，每一步都可重复执行、可验证。</p>
        <div class="flow-timeline">
          <div class="flow-step" v-for="stage in project.flow" :key="stage.step">
            <div class="flow-node">{{ stage.step }}</div>
            <div class="flow-body">
              <div class="flow-title-row">
                <h3>{{ stage.title }}</h3>
                <span class="flow-tool">{{ stage.tool }}</span>
              </div>
              <p class="flow-desc">{{ stage.desc }}</p>
              <ul class="flow-points" v-if="stage.points?.length">
                <li v-for="point in stage.points" :key="point">{{ point }}</li>
              </ul>
            </div>
          </div>
        </div>
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

      <section v-if="project.recovery?.steps?.length" class="dashboard-panel">
        <h2>{{ project.recovery.title || '故障恢复闭环' }}</h2>
        <p v-if="project.recovery.desc">{{ project.recovery.desc }}</p>
        <div class="recovery-chain">
          <template v-for="(step, idx) in project.recovery.steps" :key="step.title">
            <div class="recovery-step">
              <span class="r-index">STEP {{ idx + 1 }}</span>
              <h4>{{ step.title }}</h4>
              <p>{{ step.desc }}</p>
            </div>
            <span v-if="idx < project.recovery.steps.length - 1" class="recovery-connector">→</span>
          </template>
        </div>
        <p class="recovery-loop-note">↻ 演练可重复执行，从"故障注入"到"验证闭环"形成持续验证的运维闭环。</p>
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

      <section v-if="project.links?.demos?.length" class="dashboard-panel">
        <h2>演示页面</h2>
        <div class="link-list">
          <a
            v-for="demo in project.links.demos"
            :key="demo.url"
            class="link-item"
            :href="demo.url"
            :target="demo.external ? '_blank' : undefined"
            :rel="demo.external ? 'noopener noreferrer' : undefined"
          >
            <span class="link-icon">Demo</span>
            <span class="link-copy">
              <strong>{{ demo.title }}</strong>
              <span>{{ demo.description }}</span>
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
    project.value.links.demos?.[0] && { ...project.value.links.demos[0], kind: 'demos' },
    project.value.links.repositories?.[0] && { ...project.value.links.repositories[0], kind: 'repositories' },
    project.value.links.articles?.[0] && { ...project.value.links.articles[0], kind: 'articles' }
  ].filter(Boolean)
})
</script>

<style scoped>
.eyebrow-group {
  color: var(--primary, #2563eb);
  font-weight: 800;
}
.eyebrow-sep {
  margin: 0 6px;
  opacity: 0.45;
}
</style>
