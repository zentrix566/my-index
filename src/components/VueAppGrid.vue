<template>
  <div class="content-grid">
    <ContentCard
      v-for="app in apps"
      :key="app.to"
      :to="app.to"
      :title="app.title"
      :summary="app.summary"
      :tags="app.tags"
      :icon="visualOf(app).icon"
      :tone="visualOf(app).tone"
      :kicker="app.kicker"
      cta="进入项目"
      :show-favorite="showFavorite"
      :favorite="favoriteSet.has(app.to)"
      @visit="recordVisit(app.to)"
      @toggle-favorite="toggleFavorite(app.to)"
    />
  </div>
</template>

<script setup>
import ContentCard from './ContentCard.vue'
import { useProjectPreferences } from '../composables/useProjectPreferences.js'
import { projectVisual } from '../utils/projectVisuals.js'

defineProps({
  apps: { type: Array, required: true },
  showFavorite: { type: Boolean, default: false }
})

const { favoriteSet, toggleFavorite, recordVisit } = useProjectPreferences()
const visualOf = (item) => projectVisual(item.to)
</script>
