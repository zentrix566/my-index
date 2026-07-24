<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  cards: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

// related 图加载失败时回退到 wild 兜底图（_cardFailed 仅在该卡同时拥有两者时置位）
const onCardError = (card) => {
  if (card.image && card.imageFallback) card._cardFailed = true
}
const cardSrc = (card) => (card._cardFailed ? card.imageFallback : (card.image || card.imageFallback))
const hasImage = (card) => Boolean(card.image || card.imageFallback)
</script>

<template>
  <div v-if="visible" class="hs-modal-overlay" @click.self="emit('close')">
    <div class="hs-modal" role="dialog" aria-modal="true" aria-labelledby="hs-card-modal-title">
      <button class="hs-modal-close" type="button" @click="emit('close')" aria-label="关闭">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
      <h3 id="hs-card-modal-title" class="hs-modal-title">{{ title }}</h3>
      <div class="hs-modal-cards">
        <div v-for="card in cards" :key="card.name" class="hs-modal-card-item">
          <img v-if="hasImage(card)" :src="cardSrc(card)" :alt="card.name" @error="onCardError(card)" />
          <p v-else class="hs-no-image">暂无「{{ card.name }}」的图片</p>
          <p class="hs-card-name-label">{{ card.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
