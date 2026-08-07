<template>
  <button
    type="button"
    class="hs-toggle"
    :class="{ on: modelValue }"
    role="switch"
    :aria-checked="modelValue"
    :title="title"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="hs-toggle-track"><span class="hs-toggle-thumb"></span></span>
    <span class="hs-toggle-label">硬核模式{{ modelValue ? '：开' : '：关' }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  expansionCount: { type: Number, required: true },
  coreExpansionCount: { type: Number, required: true },
  action: { type: String, required: true }
})

defineEmits(['update:modelValue'])

const title = computed(
  () =>
    `硬核模式：${props.action}全部 ${props.expansionCount} 个版本（含无经验的更多版本），` +
    `而非仅核心 ${props.coreExpansionCount} 个有经验版本。`
)
</script>

<style scoped>
.hs-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 4px;
  border: none;
  color: var(--hs-text-soft);
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.hs-toggle-track {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.4);
  transition: background .18s ease;
}

.hs-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform .18s ease;
}

.hs-toggle.on .hs-toggle-track {
  background: #15803d;
}

.hs-toggle.on .hs-toggle-thumb {
  transform: translateX(18px);
}

.hs-toggle-label {
  white-space: nowrap;
}
</style>
