<template>
  <div class="content-grid">
    <RouterLink v-for="app in apps" :key="app.to" class="content-card" :to="app.to">
      <div class="card-kicker">{{ app.kicker }}</div>
      <h3>{{ app.title }}</h3>
      <p>{{ app.summary }}</p>
      <div class="tag-row">
        <span v-for="tag in app.tags" :key="tag">{{ tag }}</span>
      </div>
      <span class="card-cta">进入 →</span>
    </RouterLink>
  </div>
</template>

<script setup>
defineProps({
  apps: {
    type: Array,
    required: true
  }
})
</script>
