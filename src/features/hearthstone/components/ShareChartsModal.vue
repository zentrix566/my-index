<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  dataUrl: { type: String, default: '' },
  title: { type: String, default: '我的炉石成就图' }
})
const emit = defineEmits(['close'])

const copied = ref(false)
const copyError = ref(false)

function close() {
  emit('close')
}

function download() {
  if (!props.dataUrl) return
  const a = document.createElement('a')
  a.href = props.dataUrl
  a.download = (props.title || '炉石成就图') + '.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function copy() {
  if (!props.dataUrl) return
  copied.value = false
  copyError.value = false
  try {
    const blob = await (await fetch(props.dataUrl)).blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch (e) {
    copyError.value = true
    setTimeout(() => { copyError.value = false }, 2600)
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="sc-modal" @click.self="close">
      <div class="sc-box" role="dialog" aria-modal="true" aria-label="分享成就图">
        <div class="sc-head">
          <span class="sc-title">{{ title }}</span>
          <button type="button" class="sc-close" aria-label="关闭" @click="close">×</button>
        </div>
        <div class="sc-preview">
          <img v-if="dataUrl" :src="dataUrl" alt="成就数据分享图" />
          <p v-else class="sc-empty">暂无可分享的图片</p>
        </div>
        <div class="sc-actions">
          <button type="button" class="sc-btn sc-btn-primary" :disabled="!dataUrl" @click="download">下载图片</button>
          <button type="button" class="sc-btn" :disabled="!dataUrl" @click="copy">
            {{ copied ? '已复制 ✓' : copyError ? '复制失败' : '复制图片' }}
          </button>
          <button type="button" class="sc-btn sc-btn-ghost" @click="close">关闭</button>
        </div>
        <p class="sc-tip">图片为本地合成，可直接粘贴到微信 / 朋友圈 / 社交平台。</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sc-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}
.sc-box {
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(2, 6, 23, 0.6);
  overflow: hidden;
}
.sc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}
.sc-title { font-size: 15px; font-weight: 700; color: #e2e8f0; }
.sc-close {
  border: none; background: none; font-size: 24px; line-height: 1;
  color: #94a3b8; cursor: pointer; padding: 0 6px;
}
.sc-close:hover { color: #e2e8f0; }
.sc-preview {
  flex: 1 1 auto;
  overflow: auto;
  padding: 14px;
  background: #0b1220;
}
.sc-preview img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 10px;
}
.sc-empty { color: #94a3b8; text-align: center; padding: 40px 0; }
.sc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}
.sc-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  cursor: pointer;
}
.sc-btn:hover:not(:disabled) { background: rgba(148, 163, 184, 0.28); }
.sc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sc-btn-primary {
  color: #052e16;
  background: #22c55e;
  border-color: #22c55e;
}
.sc-btn-primary:hover:not(:disabled) { background: #16a34a; }
.sc-btn-ghost { background: none; border-color: transparent; color: #94a3b8; }
.sc-tip { margin: 0; padding: 0 16px 12px; font-size: 11.5px; color: #64748b; }
</style>
