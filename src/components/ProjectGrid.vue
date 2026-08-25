<template>
  <div class="content-grid">
    <ContentCard
      v-for="project in projects"
      :key="project.slug"
      :to="`/projects/${project.slug}`"
      :title="project.title"
      :summary="project.summary"
      :tags="project.tags"
      :icon="visualOf(project).icon"
      :tone="visualOf(project).tone"
      :kicker="project.category"
      :group="project.group"
      cta="查看详情"
      @visit="recordVisit(`/projects/${project.slug}`)"
    />
  </div>
</template>

<script setup>
import ContentCard from './ContentCard.vue'
import { useProjectPreferences } from '../composables/useProjectPreferences.js'
import { projectVisual } from '../utils/projectVisuals.js'

defineProps({ projects: { type: Array, required: true } })
const { recordVisit } = useProjectPreferences()
const visualOf = (item) => projectVisual(item.slug)
</script>
