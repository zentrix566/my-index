<template>
  <div class="content-grid">
    <RouterLink
      v-for="project in projects"
      :key="project.slug"
      class="content-card"
      :to="`/projects/${project.slug}`"
    >
      <div class="card-kicker-row">
        <span class="card-kicker">{{ project.category }}</span>
        <span v-if="project.group" class="card-group-tag">{{ project.group }}</span>
      </div>
      <h3>{{ project.title }}</h3>
      <p>{{ project.summary }}</p>
      <div class="tag-row">
        <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      </div>
      <span class="card-cta">查看详情 →</span>
    </RouterLink>
  </div>
</template>

<script setup>
defineProps({
  projects: {
    type: Array,
    required: true
  }
})
</script>

<style scoped>
.card-kicker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
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
