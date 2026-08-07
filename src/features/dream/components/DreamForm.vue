<script setup>
import { ref, computed } from 'vue'
import { getRangeWarning } from '../api/dreamClient.js'

const props = defineProps({
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['generate'])

const currentAge = ref('')
const targetAge = ref('')
const achievements = ref('')

const errorMsg = computed(() => {
  const cur = Number(currentAge.value)
  const tar = Number(targetAge.value)
  if (currentAge.value === '' || targetAge.value === '') return ''
  if (!Number.isFinite(cur) || !Number.isFinite(tar)) return '请输入有效的数字'
  if (cur <= 0 || tar <= 0) return '年龄需大于 0'
  if (cur >= tar) return '期望寿命需大于当前年龄'
  if (tar > 10000) return '期望寿命请控制在 10000 岁以内'
  return ''
})

const rangeWarning = computed(() => {
  const cur = Number(currentAge.value)
  const tar = Number(targetAge.value)
  if (!Number.isFinite(cur) || !Number.isFinite(tar) || cur <= 0 || tar <= 0 || cur >= tar) return ''
  return getRangeWarning(cur, tar)
})

const canSubmit = computed(
  () => !props.loading && errorMsg.value === '' && currentAge.value !== '' && targetAge.value !== ''
)

function onSubmit() {
  if (!canSubmit.value) return
  emit('generate', {
    currentAge: Number(currentAge.value),
    targetAge: Number(targetAge.value),
    achievements: achievements.value.trim()
  })
}
</script>

<template>
  <section class="hl-card hl-form-card">
    <h2 class="hl-card__title">填一填你的命数</h2>

    <label class="hl-field">
      <span class="hl-field__label">当前年纪</span>
      <input v-model="currentAge" class="hl-field__input" type="number" min="1" max="9999" placeholder="例如 22" />
      <span class="hl-field__hint">你今年几岁</span>
    </label>

    <label class="hl-field">
      <span class="hl-field__label">想活到什么时候</span>
      <input v-model="targetAge" class="hl-field__input" type="number" min="2" max="10000" placeholder="例如 88 或 10000" />
      <span class="hl-field__hint">你希望梦做到多少岁（最大 10000）</span>
    </label>

    <label class="hl-field">
      <span class="hl-field__label">想达到什么成就</span>
      <textarea
        v-model="achievements"
        class="hl-field__input hl-field__textarea"
        rows="4"
        placeholder="例如：考上北大，进选调生，当市长，当主席"
      ></textarea>
      <span class="hl-field__hint">用逗号分隔，留空则由 AI 自由发挥</span>
    </label>

    <p v-if="errorMsg" class="hl-field__error">{{ errorMsg }}</p>
    <p v-else-if="rangeWarning" class="hl-field__warning">{{ rangeWarning }}</p>

    <button class="hl-btn" :disabled="!canSubmit" @click="onSubmit">
      {{ loading ? '烹梦中…' : '入梦' }}
    </button>
  </section>
</template>
