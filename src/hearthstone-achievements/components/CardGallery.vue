<script setup>
import { ref } from 'vue'

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
const openZoom = (card) => { if (hasImage(card)) zoomCard.value = card }
const closeZoom = () => { zoomCard.value = null }
</script>

<template>
  <div class="cg-grid">
    <figure v-for="card in cards" :key="card.name" class="cg-item">
      <img
        v-if="hasImage(card)"
        :src="cardSrc(card)"
        :alt="card.name"
        class="cg-img"
        loading="lazy"
        @error="onCardError(card)"
        @click="openZoom(card)"
      />
      <div v-else class="cg-noimg">暂无「{{ card.name }}」的图片</div>
      <figcaption class="cg-name">{{ card.name }}</figcaption>
    </figure>
  </div>

  <div v-if="zoomCard" class="cg-zoom" @click="closeZoom">
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
  cursor: zoom-in;
  border: 1px solid var(--hs-border, rgba(148, 163, 184, 0.25));
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
</style>
