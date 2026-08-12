<template>
  <div class="content-grid">
    <article v-for="app in apps" :key="app.to" class="content-card-shell" :data-tone="visualOf(app).tone">
      <RouterLink class="content-card" :to="app.to" @click="recordVisit(app.to)">
        <div class="card-heading-row">
          <span class="card-icon"><AppIcon :name="visualOf(app).icon" /></span>
          <div><div class="card-kicker">{{ app.kicker }}</div><h3>{{ app.title }}</h3></div>
        </div>
        <p>{{ app.summary }}</p>
        <div class="tag-row">
          <span v-for="tag in app.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
        </div>
        <span class="card-cta">进入项目 <span aria-hidden="true">→</span></span>
      </RouterLink>
      <button
        v-if="showFavorite"
        class="card-favorite"
        type="button"
        :class="{ active: favoriteSet.has(app.to) }"
        :aria-label="favoriteSet.has(app.to) ? `取消收藏 ${app.title}` : `收藏 ${app.title}`"
        :aria-pressed="favoriteSet.has(app.to)"
        @click="toggleFavorite(app.to)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" :fill="favoriteSet.has(app.to) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      </button>
    </article>
  </div>
</template>

<script setup>
import { useProjectPreferences } from '../composables/useProjectPreferences.js'
import AppIcon from './AppIcon.vue'
import { projectVisual } from '../utils/projectVisuals.js'

defineProps({
  apps: {
    type: Array,
    required: true
  },
  showFavorite: { type: Boolean, default: false }
})

const { favoriteSet, toggleFavorite, recordVisit } = useProjectPreferences()
const visualOf = (app) => projectVisual(app.to)
</script>

<style scoped>
.content-card-shell { position: relative; min-width: 0; }
.content-card-shell .content-card { height: 100%; }
.card-heading-row { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 14px; align-items: start; }
.card-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; color: var(--card-accent); background: color-mix(in srgb, var(--card-accent) 12%, var(--surface)); }
.card-icon :deep(svg) { width: 24px; height: 24px; }
.content-card-shell[data-tone="violet"] { --card-accent: #7c3aed; }
.content-card-shell[data-tone="green"] { --card-accent: #15803d; }
.content-card-shell[data-tone="amber"] { --card-accent: #b45309; }
.content-card-shell[data-tone="rose"] { --card-accent: #be123c; }
.content-card-shell[data-tone="cyan"] { --card-accent: #0e7490; }
.content-card-shell[data-tone="blue"] { --card-accent: #2563eb; }
.card-favorite {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 14px;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  cursor: pointer;
}
.card-favorite:hover, .card-favorite.active { color: #d97706; border-color: #f59e0b; transform: scale(1.05); }
</style>
