<template>
  <article class="content-card-shell" :data-tone="tone">
    <RouterLink class="content-card" :to="to" @click="$emit('visit')">
      <div class="card-heading-row">
        <span class="card-icon"><AppIcon :name="icon" /></span>
        <div>
          <div class="card-kicker-row">
            <span class="card-kicker">{{ kicker }}</span>
            <span v-if="group" class="card-group-tag">{{ group }}</span>
          </div>
          <h3>{{ title }}</h3>
        </div>
      </div>
      <p>{{ summary }}</p>
      <div class="tag-row">
        <span v-for="tag in tags.slice(0, 3)" :key="tag">{{ tag }}</span>
      </div>
      <span class="card-cta">{{ cta }} <span aria-hidden="true">→</span></span>
    </RouterLink>
    <button
      v-if="showFavorite"
      class="card-favorite"
      type="button"
      :class="{ active: favorite }"
      :aria-label="favorite ? `取消收藏 ${title}` : `收藏 ${title}`"
      :aria-pressed="favorite"
      @click="$emit('toggle-favorite')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" :fill="favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      </svg>
    </button>
  </article>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

defineEmits(['visit', 'toggle-favorite'])
defineProps({
  to: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  icon: { type: String, default: 'spark' },
  tone: { type: String, default: 'blue' },
  kicker: { type: String, default: '' },
  group: { type: String, default: '' },
  cta: { type: String, default: '查看详情' },
  showFavorite: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false }
})
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
.card-kicker-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.card-group-tag { font-size: 0.72rem; font-weight: 700; color: var(--text-muted, #6b7280); background: var(--surface-soft, #f1f5f9); border: 1px solid var(--line, #e2e8f0); border-radius: 999px; padding: 2px 10px; }
.card-favorite { position: absolute; z-index: 2; top: 14px; right: 14px; display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--text-muted); background: color-mix(in srgb, var(--surface) 92%, transparent); cursor: pointer; }
.card-favorite:hover, .card-favorite.active { color: #d97706; border-color: #f59e0b; transform: scale(1.05); }
</style>
