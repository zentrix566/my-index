<template>
  <div v-if="visible && achievement" class="sdm-overlay" @click.self="$emit('close')">
    <div
      ref="dialogEl"
      class="sdm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sdm-title"
    >
      <button class="sdm-close" type="button" aria-label="关闭" @click="$emit('close')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <h3 id="sdm-title" class="sdm-title">分享打法卡组</h3>
      <p class="sdm-sub">成就「{{ achievement.name }}」 · {{ achievement.heroClass }}</p>

      <label class="sdm-label" for="sdm-code">卡组代码</label>
      <textarea
        id="sdm-code"
        v-model="code"
        class="sdm-textarea"
        spellcheck="false"
        autocomplete="off"
        placeholder="游戏中打开卡组点「复制」，把代码粘贴到这里"
      ></textarea>
      <p v-if="parseError" class="sdm-error" role="alert">{{ parseError }}</p>
      <p v-else-if="analyzed" class="sdm-hint">已识别为「{{ analyzed.heroClass }}」卡组，共 {{ analyzed.total }} 张。</p>

      <label class="sdm-label" for="sdm-name">卡组名称</label>
      <input
        id="sdm-name"
        v-model="deckName"
        class="sdm-input"
        type="text"
        maxlength="50"
        placeholder="不填则自动命名为「职业 + 卡组」"
      />

      <label class="sdm-label" for="sdm-desc">描述（可选）</label>
      <textarea
        id="sdm-desc"
        v-model="description"
        class="sdm-input sdm-desc"
        maxlength="200"
        placeholder="简单说说打法思路（200 字以内）"
      ></textarea>

      <div class="sdm-visibility">
        <label class="sdm-radio">
          <input v-model="visibility" type="radio" value="public" />
          <span>公开 · 所有人可见</span>
        </label>
        <label class="sdm-radio">
          <input v-model="visibility" type="radio" value="private" />
          <span>私密 · 仅自己可见</span>
        </label>
      </div>

      <p v-if="saveError" class="sdm-error" role="alert">{{ saveError }}</p>
      <div class="sdm-actions">
        <button type="button" class="sdm-btn sdm-btn-ghost" :disabled="saving" @click="$emit('close')">取消</button>
        <button type="button" class="sdm-btn sdm-btn-primary" :disabled="saving || !analyzed" @click="submit">
          {{ saving ? '分享中...' : '分享卡组' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { decodeDeck } from '../utils/deckstring.js'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import { useAuth } from '../../../auth/useAuth.js'
import { createDeck } from '../api/decks.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 要分享到的成就：{ id, name, heroClass }
  achievement: { type: Object, default: null }
})
const emit = defineEmits(['close', 'saved'])
const router = useRouter()
const { user } = useAuth()

const dialogEl = ref(null)
const code = ref('')
const deckName = ref('')
const description = ref('')
const visibility = ref('public')
const analyzed = ref(null)
const parseError = ref('')
const saving = ref(false)
const saveError = ref('')
useDialogFocus(toRef(props, 'visible'), dialogEl, () => emit('close'))

// 代码变化后自动解析预览（防抖），无需额外点按钮
let parseTimer = null
watch(code, (value) => {
  clearTimeout(parseTimer)
  const raw = (value || '').trim()
  if (!raw) {
    clearTimeout(parseTimer)
    analyzed.value = null
    parseError.value = ''
    return
  }
  parseTimer = setTimeout(() => {
    const decoded = decodeDeck(raw)
    if (decoded.valid) {
      analyzed.value = decoded
      parseError.value = ''
    } else {
      analyzed.value = null
      parseError.value = '卡组代码无法解析，请确认代码完整、未被截断。'
    }
  }, 350)
})

// 每次打开重置表单，名称预填成就名
watch(() => props.visible, (visible) => {
  if (!visible) return
  code.value = ''
  analyzed.value = null
  parseError.value = ''
  saveError.value = ''
  deckName.value = props.achievement?.name || ''
  description.value = ''
  visibility.value = 'public'
})

async function submit() {
  if (saving.value) return
  if (!user.value) {
    router.push({ path: '/login', query: { redirect: '/hearthstone', source: 'hearthstone' } })
    return
  }
  if (!analyzed.value) return
  saving.value = true
  saveError.value = ''
  try {
    await createDeck({
      deckCode: code.value.trim(),
      name: deckName.value,
      description: description.value,
      visibility: visibility.value,
      achievementId: props.achievement.id
    })
    emit('saved')
    emit('close')
  } catch (e) {
    saveError.value = e.message || '分享失败，请稍后重试'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sdm-overlay {
  position: fixed;
  inset: 0;
  z-index: 95;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, .55);
  backdrop-filter: blur(2px);
}
.sdm-dialog {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: min(88vh, 680px);
  overflow-y: auto;
  padding: 22px;
  border-radius: 16px;
  background: var(--hs-surface-raised, #fff);
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-shadow-strong, 0 24px 48px rgba(15, 23, 42, .25));
}
.sdm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--hs-muted);
  cursor: pointer;
}
.sdm-close:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }
.sdm-title {
  margin: 0 0 4px;
  padding-right: 32px;
  font-size: 18px;
  font-weight: 800;
  color: var(--hs-text);
}
.sdm-sub {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-muted);
}
.sdm-label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--hs-text-soft);
}
.sdm-textarea,
.sdm-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  font-size: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.sdm-textarea:focus,
.sdm-input:focus {
  outline: none;
  border-color: var(--hs-focus);
  box-shadow: 0 0 0 3px var(--hs-focus);
}
.sdm-textarea {
  min-height: 96px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace;
  letter-spacing: .02em;
  line-height: 1.6;
}
.sdm-desc {
  min-height: 64px;
  resize: vertical;
  font-family: inherit;
  letter-spacing: normal;
}
.sdm-visibility {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 14px;
}
.sdm-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-text-soft);
  cursor: pointer;
}
.sdm-radio input { accent-color: var(--hs-primary); }
.sdm-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--hs-muted);
}
.sdm-error {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
}
.sdm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.sdm-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .15s;
}
.sdm-btn:disabled { opacity: .55; cursor: not-allowed; }
.sdm-btn-primary {
  color: #fff;
  background: var(--hs-primary);
}
.sdm-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.sdm-btn-ghost {
  color: var(--hs-text);
  background: var(--hs-surface-soft);
  border-color: var(--hs-border);
}
.sdm-btn-ghost:hover { background: var(--hs-surface-overlay); }
</style>
