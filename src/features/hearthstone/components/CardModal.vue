<script setup>
import { ref, toRef } from 'vue'
import CardGallery from './CardGallery.vue'
import { useDialogFocus } from '../composables/useDialogFocus.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  cards: { type: Array, default: () => [] }
})
const emit = defineEmits(['close'])
const dialogElement = ref(null)
useDialogFocus(toRef(props, 'visible'), dialogElement, () => emit('close'))
</script>

<template>
  <Teleport to="body">
  <div v-if="visible" class="hs-modal-overlay" @click.self="emit('close')">
    <div ref="dialogElement" class="hs-modal hs-card-modal" role="dialog" aria-modal="true" aria-labelledby="hs-card-modal-title" tabindex="-1">
      <button class="hs-modal-close" type="button" @click="emit('close')" aria-label="关闭">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <h3 id="hs-card-modal-title" class="hs-modal-title">{{ title }}</h3>
      <CardGallery :cards="cards" />
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
/* 弹窗宽度跟随卡图网格：单卡时只包住卡图，多卡时封顶两列自动换行，
   避免弹窗无固定宽度时被卡图 max-width 反向压成窄条、图被缩小。 */
.hs-card-modal {
  width: fit-content;
  min-width: min(308px, 92vw);
  max-width: min(600px, 92vw);
}
</style>
