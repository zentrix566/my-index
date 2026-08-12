<template>
  <button class="smart-back-link" type="button" @click="goBack">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  fallback: { type: String, default: '/projects' },
  label: { type: String, default: '返回上一页' }
})
const router = useRouter()

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push(props.fallback)
}
</script>

