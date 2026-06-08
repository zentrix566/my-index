<template>
  <div class="content-grid">
    <article v-for="project in projects" :key="project.slug" class="content-card">
      <div class="card-kicker">{{ project.category }}</div>
      <h3>{{ project.title }}</h3>
      <p>{{ project.summary }}</p>
      <div class="tag-row">
        <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      </div>
      <RouterLink :to="`/projects/${project.slug}`">查看详情</RouterLink>
    </article>
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
