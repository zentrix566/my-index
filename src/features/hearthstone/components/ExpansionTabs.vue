<script setup>
defineProps({
  expansions: { type: Array, required: true },
  currentId: { type: String, required: true }
})

const emit = defineEmits(['switch'])

const switchExp = (id) => emit('switch', id)
</script>

<template>
  <div class="hs-expansion-tabs" role="tablist" aria-label="选择扩展包">
    <button
      v-for="exp in expansions"
      :key="exp.id"
      :class="{ active: currentId === exp.id }"
      type="button"
      role="tab"
      @click="switchExp(exp.id)"
    >
      {{ exp.name }}
    </button>
  </div>
</template>
