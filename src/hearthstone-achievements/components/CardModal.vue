<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  cards: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div v-if="visible" class="hs-modal-overlay" @click.self="emit('close')">
    <div class="hs-modal">
      <button class="hs-modal-close" type="button" @click="emit('close')" aria-label="关闭">×</button>
      <h3 class="hs-modal-title">{{ title }}</h3>
      <div class="hs-modal-cards">
        <div v-for="card in cards" :key="card.name" class="hs-modal-card-item">
          <img v-if="card.image" :src="card.image" :alt="card.name" />
          <p v-else class="hs-no-image">暂无「{{ card.name }}」的图片</p>
          <p class="hs-card-name-label">{{ card.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
