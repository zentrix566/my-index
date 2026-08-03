<template>
  <div class="friend-grid">
    <a
      v-for="link in links"
      :key="link.url"
      class="friend-card"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="friend-kicker">{{ link.kicker }}</span>
      <strong>{{ link.name }}</strong>
      <p>{{ link.summary }}</p>
      <span class="friend-host">{{ hostOf(link.url) }} ↗</span>
    </a>
  </div>
</template>

<script setup>
defineProps({
  links: {
    type: Array,
    required: true
  }
})

function hostOf(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
</script>
