<script setup>
defineProps({
  history: { type: Array, default: () => [] }
})
defineEmits(['view', 'delete', 'clear'])

function formatPreview(text) {
  const firstLine = text.split('\n').find((line) => line.trim())
  if (!firstLine) return '（空梦一场）'
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine
}

function formatAge(item) {
  if (item.targetAge > 150) return `${item.currentAge} → ${item.targetAge} 岁（超凡）`
  return `${item.currentAge} → ${item.targetAge} 岁`
}
</script>

<template>
  <section v-if="history.length > 0" class="hl-card hl-history-card">
    <div class="hl-history__header">
      <h2 class="hl-card__title">旧梦录</h2>
      <button class="hl-history__clear" @click="$emit('clear')">清空</button>
    </div>
    <div class="hl-history__list">
      <div v-for="item in history" :key="item.id" class="hl-history__item">
        <div class="hl-history__item-main" @click="$emit('view', item)">
          <div class="hl-history__item-meta">
            <span class="hl-history__item-age">{{ formatAge(item) }}</span>
            <span class="hl-history__item-time">{{ item.timestamp }}</span>
          </div>
          <p class="hl-history__item-preview">{{ formatPreview(item.text) }}</p>
        </div>
        <button class="hl-history__item-del" @click.stop="$emit('delete', item.id)" title="删除此梦">×</button>
      </div>
    </div>
  </section>
</template>
