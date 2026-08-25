<template>
  <div class="toast-host" aria-live="polite" aria-atomic="true">
    <button
      v-for="toast in toasts"
      :key="toast.id"
      type="button"
      class="toast-item"
      :class="`toast-item--${toast.type}`"
      @click="dismiss(toast.id)"
    >{{ toast.message }}</button>
  </div>
</template>

<script setup>
import { useToast } from '../composables/useToast.js'

const { toasts, dismiss } = useToast()
</script>
