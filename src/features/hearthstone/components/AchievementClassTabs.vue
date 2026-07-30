<template>
  <div class="hs-expansion-tabs" role="tablist" aria-label="选择职业">
    <button
      v-for="heroClass in classes"
      :key="heroClass"
      :class="{ active: modelValue === heroClass }"
      type="button"
      role="tab"
      @click="$emit('update:modelValue', heroClass)"
    >
      {{ heroClass }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
  classes: { type: Array, required: true }
})

defineEmits(['update:modelValue'])
</script>
