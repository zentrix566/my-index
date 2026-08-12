<template>
  <div class="ui-state" :class="`is-${type}`" :role="type === 'error' ? 'alert' : 'status'">
    <span class="ui-state-icon" aria-hidden="true">
      <AppIcon :name="type === 'error' ? 'terminal' : 'search'" />
    </span>
    <div><strong>{{ title }}</strong><p v-if="message">{{ message }}</p></div>
    <button v-if="actionLabel" type="button" @click="$emit('action')">{{ actionLabel }}</button>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'
defineProps({
  type: { type: String, default: 'empty' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  actionLabel: { type: String, default: '' }
})
defineEmits(['action'])
</script>

