<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  streaming: { type: Boolean, default: false },
  text: { type: String, default: '' },
  error: { type: String, default: '' }
})
defineEmits(['reset'])

const copied = ref(false)

// 预处理：拆行并提取年份前缀，模板中不再重复调用函数
const formattedLines = computed(() => {
  if (!props.text) return []
  return props.text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      // 匹配 "YYYY年……：" 格式，把冒号前的部分高亮为年份标签
      if (/^\d{4}年/.test(line)) {
        const idx = line.search(/[：:]/)
        if (idx > 0) {
          return { year: line.slice(0, idx + 1), rest: line.slice(idx + 1) }
        }
      }
      return { year: '', rest: line }
    })
})

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.text)
  } catch {
    // 兜底方案（旧版浏览器 / 非 HTTPS 环境）
    const textarea = document.createElement('textarea')
    textarea.value = props.text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
    } catch {
      /* ignore */
    }
    document.body.removeChild(textarea)
  }
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <section class="hl-card hl-result-card">
    <h2 class="hl-card__title">梦中光景</h2>

    <!-- 调用中，尚未返回任何内容 -->
    <div v-if="loading && !streaming" class="hl-loading">
      <div class="hl-loading__dots">
        <span class="hl-loading__dot"></span>
        <span class="hl-loading__dot"></span>
        <span class="hl-loading__dot"></span>
      </div>
      <p class="hl-loading__text">黄粱正熟，梦境渐成…</p>
    </div>

    <!-- 流式输出中：实时打字效果 -->
    <div v-else-if="streaming" class="hl-dream">
      <div class="hl-dream__streaming">
        {{ text }}<span class="hl-dream__cursor">|</span>
      </div>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="hl-error">
      <p class="hl-error__text">{{ error }}</p>
    </div>

    <!-- 结果展示 -->
    <div v-else-if="text" class="hl-dream">
      <div class="hl-dream__content">
        <p v-for="(item, index) in formattedLines" :key="index" class="hl-dream__line">
          <span v-if="item.year" class="hl-dream__year">{{ item.year }}</span>
          <span>{{ item.rest }}</span>
        </p>
      </div>
      <div class="hl-dream__actions">
        <button class="hl-btn hl-btn--ghost" @click="handleCopy">
          {{ copied ? '已复制 ✓' : '复制梦境' }}
        </button>
        <button class="hl-btn hl-btn--ghost" @click="$emit('reset')">再做一梦</button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="hl-placeholder">
      <p>梦尚未开始。</p>
      <p class="hl-placeholder__sub">在左侧写下你的年纪与野心，点「入梦」即可。</p>
    </div>
  </section>
</template>
