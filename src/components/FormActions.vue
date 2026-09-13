<template>
  <div class="form-actions" role="group" aria-label="表单操作">
    <button class="form-actions__button" type="button" :disabled="busy" @click="$emit('cancel')">取消</button>
    <button class="form-actions__button form-actions__button--primary" :type="submitType" :disabled="busy" @click="$emit('save')">{{ busy ? '保存中…' : '保存' }}</button>
  </div>
</template>

<script setup>
defineProps({
  busy: Boolean,
  submitType: { type: String, default: 'button' }
})
defineEmits(['cancel', 'save'])
</script>

<style scoped>
.form-actions { display: flex; flex-shrink: 0; align-items: center; justify-content: flex-end; gap: 8px; }
.form-actions__button { min-width: 64px; min-height: 44px; padding: 0 14px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--text); font: inherit; font-size: 14px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: filter .15s ease; }
.form-actions__button--primary { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }
.form-actions__button:hover:not(:disabled) { filter: brightness(.94); }
.form-actions__button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.form-actions__button:disabled { opacity: .55; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) { .form-actions__button { transition: none; } }
</style>
