<template>
  <div class="hs-selector-row">
    <ExpansionTabs
      :expansions="originalExpansions"
      :current-id="modelValue"
      @switch="$emit('update:modelValue', $event)"
    />
    <div v-if="showMoreVersions" ref="moreVersionsElement" class="hs-more-versions">
      <button
        type="button"
        class="hs-btn hs-btn-ghost hs-more-versions-toggle"
        :class="{ active: open || addedExpansions.some((expansion) => expansion.id === modelValue) }"
        :title="`本次新增的 ${addedExpansions.length} 个版本`"
        @click="open = !open"
      >
        更多版本
        <span class="hs-more-versions-count">{{ addedExpansions.length }}</span>
        <svg class="hs-more-versions-caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div v-if="open" class="hs-more-versions-panel" role="menu">
        <p class="hs-more-versions-tip">本次新增的版本（已本地化成就数据）</p>
        <div class="hs-more-versions-grid">
          <button
            v-for="expansion in addedExpansions"
            :key="expansion.id"
            type="button"
            class="hs-more-versions-item"
            :class="{ active: modelValue === expansion.id }"
            @click="selectExpansion(expansion.id)"
          >
            <span>{{ expansion.name }}</span>
            <svg v-if="modelValue === expansion.id" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import ExpansionTabs from './ExpansionTabs.vue'

defineProps({
  modelValue: { type: String, required: true },
  originalExpansions: { type: Array, required: true },
  addedExpansions: { type: Array, required: true },
  showMoreVersions: { type: Boolean, required: true }
})

const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const moreVersionsElement = ref(null)

function selectExpansion(id) {
  emit('update:modelValue', id)
  open.value = false
}

function closeOnOutsideClick(event) {
  if (!moreVersionsElement.value?.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('click', closeOnOutsideClick, true))
onUnmounted(() => document.removeEventListener('click', closeOnOutsideClick, true))
</script>

<style scoped>
.hs-selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
