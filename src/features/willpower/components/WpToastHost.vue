<template>
  <div class="wp-toast-wrap" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="wp-toast" :class="t.type" @click="dismiss(t.id)">
      {{ t.message }}
    </div>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast.js'
const { toasts, dismiss } = useToast()
</script>
