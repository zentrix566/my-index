<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  cards: { type: Array, default: () => [] }
})

// 关联卡牌图加载失败时回退到 wild 兜底图（_cardFailed 仅在该卡同时拥有两者时置位）
const onCardError = (card) => {
  if (card.image && card.imageFallback) card._cardFailed = true
}
const cardSrc = (card) => (card._cardFailed ? card.imageFallback : (card.image || card.imageFallback))
const hasImage = (card) => Boolean(card.image || card.imageFallback)

// 点击缩略图放大查看大图
const zoomCard = ref(null)
const zoomCloseButton = ref(null)
let previouslyFocused = null
const openZoom = (card) => {
  if (!hasImage(card)) return
  previouslyFocused = document.activeElement
  zoomCard.value = card
}
const closeZoom = () => { zoomCard.value = null }

const onZoomKeydown = (event) => {
  if (!zoomCard.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopImmediatePropagation()
    closeZoom()
  } else if (event.key === 'Tab') {
    event.preventDefault()
    zoomCloseButton.value?.focus()
  }
}

watch(zoomCard, (card) => {
  if (card) {
    window.addEventListener('keydown', onZoomKeydown)
    nextTick(() => zoomCloseButton.value?.focus())
    return
  }
  window.removeEventListener('keydown', onZoomKeydown)
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
  previouslyFocused = null
})

onBeforeUnmount(() => window.removeEventListener('keydown', onZoomKeydown))
</script>

<template>
  <div class="cg-grid">
    <figure v-for="card in cards" :key="card.name" class="cg-item">
      <button
        v-if="hasImage(card)"
        type="button"
        class="cg-img-button"
        :aria-label="`放大查看${card.name}`"
        @click="openZoom(card)"
      >
        <img
          :src="cardSrc(card)"
          :alt="card.name"
          class="cg-img"
          loading="lazy"
          @error="onCardError(card)"
        />
      </button>
      <div v-else class="cg-noimg">暂无「{{ card.name }}」的图片</div>
      <figcaption class="cg-name">{{ card.name }}</figcaption>
    </figure>
  </div>

  <div
    v-if="zoomCard"
    class="cg-zoom"
    role="dialog"
    aria-modal="true"
    :aria-label="`查看${zoomCard.name}大图`"
    data-nested-dialog="true"
    @click="closeZoom"
  >
    <button ref="zoomCloseButton" type="button" class="cg-zoom-close" aria-label="关闭大图" @click.stop="closeZoom">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <img :src="cardSrc(zoomCard)" :alt="zoomCard.name" class="cg-zoom-img" @click.stop />
    <p class="cg-zoom-name">{{ zoomCard.name }}</p>
  </div>
</template>

<style scoped>
/* 关联卡牌网格：浏览成就 / 我的成就两处共用，样式只此一份 */
.cg-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-evenly;
}
.cg-item {
  margin: 0;
  text-align: center;
  flex: 0 1 auto;
}
.cg-img {
  width: 100%;
  max-width: 200px;
  border-radius: 8px;
  display: block;
  border: 1px solid var(--hs-border, rgba(148, 163, 184, 0.25));
}
.cg-img-button {
  display: block;
  max-width: 200px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: zoom-in;
}
.cg-img-button:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 3px;
}
.cg-noimg {
  margin: 0 0 6px;
  padding: 18px 10px;
  font-size: 12px;
  color: var(--hs-text-soft, #64748b);
  background: var(--hs-surface-soft, rgba(2, 6, 23, 0.05));
  border-radius: 8px;
}
.cg-name {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--hs-text-soft, #64748b);
}
/* 点击放大：固定深色遮罩，独立于任何弹窗层级 */
.cg-zoom {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(3, 7, 18, 0.82);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: zoom-out;
}
.cg-zoom-img {
  max-width: 90vw;
  max-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.cg-zoom-name {
  margin: 14px 0 0;
  color: #e2e8f0;
  font-size: 14px;
}
.cg-zoom-close {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 12px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
}
.cg-zoom-close:focus-visible {
  outline: 3px solid #fbbf24;
  outline-offset: 3px;
}
</style>
