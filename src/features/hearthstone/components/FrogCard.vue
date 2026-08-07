<template>
  <button
    class="frog-card"
    :class="stateClass"
    type="button"
    :disabled="revealed || !interactive"
    :aria-label="`选择第 ${index + 1} 张卡牌：${card.name}`"
    @click="emit('select')"
  >
    <span v-if="showNumber" class="frog-card__number">{{ index + 1 }}</span>
    <span class="frog-card__frame">
      <img
        class="frog-card__image"
        :src="card.image"
        :alt="`${card.name}卡牌图片`"
        loading="lazy"
        draggable="false"
      />

      <!-- 贴片：把供体卡同一位置的像素裁出来盖在底图上，制造「被动手脚」的效果 -->
      <img
        v-if="patchClass"
        class="frog-patch"
        :class="patchClass"
        :src="mutation.donor.image"
        alt=""
        aria-hidden="true"
        draggable="false"
      />

      <span
        v-if="patchClass && revealed"
        class="frog-guide"
        :class="`frog-guide--${mutation.type}`"
        aria-hidden="true"
      />

      <span v-if="revealed && isSuspicious" class="frog-card__seal">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
      </span>
      <span
        v-if="revealed && isSelected && !isSuspicious"
        class="frog-card__seal frog-card__seal--wrong"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
      </span>
    </span>
    <span v-if="interactive" class="frog-card__hint">点击选择</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  index: { type: Number, required: true },
  mutation: { type: Object, default: null },
  isSuspicious: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
  revealed: { type: Boolean, default: false },
  interactive: { type: Boolean, default: true },
  showNumber: { type: Boolean, default: true }
})

const emit = defineEmits(['select'])

const stateClass = computed(() => ({
  'frog-card--selected': props.isSelected,
  'frog-card--correct': props.revealed && props.isSuspicious,
  'frog-card--wrong': props.revealed && props.isSelected && !props.isSuspicious,
  'frog-card--muted': props.revealed && !props.isSuspicious && !props.isSelected
}))

const patchClass = computed(() => {
  if (!props.isSuspicious || !props.mutation?.donor) return null
  return `frog-patch--${props.mutation.type}`
})
</script>
