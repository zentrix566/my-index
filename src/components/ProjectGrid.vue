<template>
  <div class="content-grid">
    <RouterLink
      v-for="project in projects"
      :key="project.slug"
      class="content-card"
      :to="`/projects/${project.slug}`"
    >
      <div class="card-kicker">{{ project.category }}</div>
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
