<script setup>
import { ref, toRef, watch, computed } from 'vue'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import {
  generateAchievementShareImage,
  generateBundleShareImage,
  downloadDataUrl,
  copyDataUrlToClipboard
} from '../utils/achievementShareImage.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 单条模式
  achievement: { type: Object, default: null },
  progressInfo: { type: Object, default: null },
  // 合集模式（多条置顶）
  achievements: { type: Array, default: null },
  getProgressInfo: { type: Function, default: null },
  // 通用
  user: { type: Object, default: null },
  mode: { type: String, default: 'single' } // 'single' | 'bundle'
})
const emit = defineEmits(['close'])

const dialogElement = ref(null)
useDialogFocus(toRef(props, 'visible'), dialogElement, () => emit('close'))

const loading = ref(false)
const error = ref('')
const dataUrl = ref('')
const filename = ref('')
const copyState = ref('idle') // 'idle' | 'ok' | 'fail'

const heading = computed(() => {
  if (props.mode === 'bundle') return '分享我的置顶成就'
  if (props.progressInfo?.completed) return '分享已完成的成就'
  return '分享冲刺中的成就'
})

const subheading = computed(() => {
  if (props.mode === 'bundle') {
    const n = Array.isArray(props.achievements) ? props.achievements.length : 0
    return `合集中包含 ${n} 项置顶成就`
  }
  return props.achievement?.name || ''
})

async function regenerate() {
  if (!props.visible) return
  loading.value = true
  error.value = ''
  dataUrl.value = ''
  copyState.value = 'idle'
  try {
    if (props.mode === 'bundle') {
      if (!Array.isArray(props.achievements) || !props.achievements.length) {
        throw new Error('没有可分享的成就')
      }
      if (typeof props.getProgressInfo !== 'function') {
        throw new Error('缺少进度信息函数')
      }
      const result = await generateBundleShareImage({
        achievements: props.achievements,
        getProgressInfo: props.getProgressInfo,
        user: props.user
      })
      dataUrl.value = result.dataUrl
      filename.value = result.filename
    } else {
      if (!props.achievement) throw new Error('缺少成就数据')
      const result = await generateAchievementShareImage({
        achievement: props.achievement,
        progressInfo: props.progressInfo,
        user: props.user
      })
      dataUrl.value = result.dataUrl
      filename.value = result.filename
    }
  } catch (cause) {
    error.value = cause?.message || '生成分享图失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (v) => { if (v) regenerate() },
  { immediate: true }
)

function onDownload() {
  if (!dataUrl.value) return
  downloadDataUrl(dataUrl.value, filename.value)
}

async function onCopy() {
  if (!dataUrl.value) return
  try {
    await copyDataUrlToClipboard(dataUrl.value)
    copyState.value = 'ok'
    setTimeout(() => { if (copyState.value === 'ok') copyState.value = 'idle' }, 2000)
  } catch {
    copyState.value = 'fail'
  }
}
</script>

<template>
  <div v-if="visible" class="hs-share-overlay" @click.self="emit('close')">
    <div
      ref="dialogElement"
      class="hs-share-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hs-share-title"
      tabindex="-1"
    >
      <button class="hs-share-close" type="button" @click="emit('close')" aria-label="关闭">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <div class="hs-share-head">
        <p class="hs-share-eyebrow">Share</p>
        <h3 id="hs-share-title">{{ heading }}</h3>
        <p v-if="subheading" class="hs-share-sub">{{ subheading }}</p>
      </div>

      <div class="hs-share-preview">
        <div v-if="loading" class="hs-share-state">正在生成分享图…</div>
        <div v-else-if="error" class="hs-share-state hs-share-error">{{ error }}</div>
        <img v-else-if="dataUrl" :src="dataUrl" alt="成就分享图预览" class="hs-share-image" />
      </div>

      <div class="hs-share-actions">
        <button
          type="button"
          class="hs-share-btn hs-share-primary"
          :disabled="!dataUrl || loading"
          @click="onDownload"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
          下载 PNG
        </button>
        <button
          type="button"
          class="hs-share-btn"
          :class="{ 'hs-share-copied': copyState === 'ok' }"
          :disabled="!dataUrl || loading"
          @click="onCopy"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <template v-if="copyState === 'ok'">已复制到剪贴板</template>
          <template v-else-if="copyState === 'fail'">复制失败，请手动下载</template>
          <template v-else>复制图片</template>
        </button>
        <button
          type="button"
          class="hs-share-btn hs-share-ghost"
          @click="regenerate"
          :disabled="loading"
        >重新生成</button>
      </div>

      <p class="hs-share-hint">
        图片保存在本机，未上传任何服务；带上「zentrix566.top/hearthstone」水印，方便回链。
      </p>
    </div>
  </div>
</template>

<style scoped>
.hs-share-overlay {
  position: fixed;
  inset: 0;
  z-index: 1150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(10px);
}
.hs-share-modal {
  position: relative;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 26px 28px 22px;
  border: 1px solid var(--hs-border);
  border-radius: 20px;
  background: var(--hs-surface-raised);
  color: var(--hs-text);
  box-shadow: var(--hs-shadow-strong);
}
.hs-share-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-surface-soft);
  color: var(--hs-muted);
  cursor: pointer;
}
.hs-share-close:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }

.hs-share-head { margin-bottom: 18px; }
.hs-share-eyebrow {
  margin: 0 0 4px;
  color: var(--hs-text-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.hs-share-head h3 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
.hs-share-sub { margin: 0; color: var(--hs-muted); font-size: 13px; }

.hs-share-preview {
  padding: 12px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.35);
  border: 1px solid var(--hs-border);
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hs-share-state {
  padding: 60px 20px;
  color: var(--hs-muted);
  text-align: center;
  font-size: 13px;
}
.hs-share-error { color: #dc2626; }
.hs-share-image {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}

.hs-share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.hs-share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid var(--hs-border);
  background: var(--hs-surface-soft);
  color: var(--hs-text);
}
.hs-share-btn:hover:not(:disabled) { background: var(--hs-surface-overlay); }
.hs-share-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hs-share-primary {
  border-color: rgba(59, 130, 246, 0.5);
  color: #2563eb;
  background: rgba(59, 130, 246, 0.1);
}
.hs-share-primary:hover:not(:disabled) { background: rgba(59, 130, 246, 0.18); }
.hs-share-ghost { border-style: dashed; }
.hs-share-copied { color: #16a34a; border-color: rgba(74, 222, 128, 0.5); background: rgba(74, 222, 128, 0.12); }

.hs-share-hint {
  margin: 12px 0 0;
  color: var(--hs-muted);
  font-size: 12px;
  line-height: 1.6;
}

.hs-share-btn:focus-visible,
.hs-share-close:focus-visible {
  outline: 3px solid var(--hs-focus);
  outline-offset: 2px;
}
</style>
