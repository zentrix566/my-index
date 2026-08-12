<template>
  <div class="content-grid">
    <RouterLink
      v-for="project in projects"
      :key="project.slug"
      class="content-card"
      :data-tone="visualOf(project).tone"
      :to="`/projects/${project.slug}`"
      @click="recordVisit(`/projects/${project.slug}`)"
    >
      <div class="card-heading-row">
        <span class="card-icon"><AppIcon :name="visualOf(project).icon" /></span>
        <div>
          <div class="card-kicker-row"><span class="card-kicker">{{ project.category }}</span><span v-if="project.group" class="card-group-tag">{{ project.group }}</span></div>
          <h3>{{ project.title }}</h3>
        </div>
      </div>
      <p>{{ project.summary }}</p>
      <div class="tag-row">
        <span v-for="tag in project.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
      </div>
      <span class="card-cta">查看详情 →</span>
    </RouterLink>
  </div>
</template>

<script setup>
import { useProjectPreferences } from '../composables/useProjectPreferences.js'
import AppIcon from './AppIcon.vue'
import { projectVisual } from '../utils/projectVisuals.js'

defineProps({
  projects: {
    type: Array,
    required: true
  }
})

const { recordVisit } = useProjectPreferences()
const visualOf = (project) => projectVisual(project.slug)
</script>

<style scoped>
.card-kicker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.card-heading-row { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 14px; align-items: start; }
.card-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: var(--card-accent); background: color-mix(in srgb, var(--card-accent) 12%, var(--surface)); }
.card-icon :deep(svg) { width: 24px; height: 24px; }
.content-card[data-tone="violet"] { --card-accent: #7c3aed; }
.content-card[data-tone="cyan"] { --card-accent: #0e7490; }
.content-card[data-tone="blue"] { --card-accent: #2563eb; }
.card-group-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-muted, #6b7280);
  background: var(--surface-soft, #f1f5f9);
  border: 1px solid var(--line, #e2e8f0);
  border-radius: 999px;
  padding: 2px 10px;
}
</style>
