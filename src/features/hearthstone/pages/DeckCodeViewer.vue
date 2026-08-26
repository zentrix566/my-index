<template>
  <section class="section page-section hs-page" :data-hs-theme="hsTheme">
    <div class="container">
      <div class="dcv-wrap">
        <!-- 头部：返回 + 标题 + 主题切换 -->
        <div class="dcv-head">
          <div class="dcv-title-block">
            <router-link to="/hearthstone" class="dcv-back" aria-label="返回炉石成就查看器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              返回炉石成就
            </router-link>
            <p class="dcv-eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Deck Code Tool</p>
            <h1>炉石卡组代码解析</h1>
            <p class="dcv-sub">粘贴游戏内复制的卡组代码，立即查看卡组构成、法力曲线、合成造价，并可导出卡组图片。</p>
          </div>
          <!--
          <button
            type="button"
            class="dcv-theme"
            @click="toggleTheme"
            :aria-label="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
            :title="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
          >
            <svg v-if="hsTheme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
            </svg>
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
            {{ hsTheme === 'dark' ? '明亮' : '暗色' }}
          </button>
          -->
        </div>

        <!-- 输入卡片 -->
        <div class="dcv-card">
          <label class="dcv-label" for="dcv-name">卡组名称（可选）</label>
          <input
            id="dcv-name"
            v-model="deckName"
            class="dcv-input"
            type="text"
            maxlength="40"
            placeholder="不填则自动命名为「职业 + 卡组」"
            @input="clearError"
          />

          <label class="dcv-label" for="dcv-code">卡组代码</label>
          <textarea
            id="dcv-code"
            ref="codeEl"
            v-model="code"
            class="dcv-textarea"
            spellcheck="false"
            autocomplete="off"
            placeholder="在此粘贴卡组代码，例如：AAECAf7gBgL/lwbO8QYO9eMEh/YEmMQFhY4G/7oGkMsG/eYGwOgGn/EGrPEGwvEG4/EGqPcG//cGAAA="
            @input="clearError"
            @paste="onPaste"
          ></textarea>

          <div class="dcv-actions">
            <button type="button" class="dcv-btn dcv-primary" :disabled="analyzing" @click="analyze">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-4"/><path d="M12 14V4"/><path d="m8 8 4-4 4 4"/></svg>
              {{ analyzing ? '正在加载卡牌数据库...' : '解析卡组代码' }}
            </button>
            <button type="button" class="dcv-btn dcv-ghost" @click="pasteFromClipboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              从剪贴板粘贴
            </button>
            <button type="button" class="dcv-btn dcv-ghost" @click="fillSample">填入示例</button>
          </div>

          <p v-if="error" class="dcv-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            {{ error }}
          </p>
          <p v-else-if="hint" class="dcv-hint">{{ hint }}</p>
        </div>

        <!-- 使用提示 -->
        <div class="dcv-tips">
          <h4>如何获取卡组代码</h4>
          <ol>
            <li>游戏中打开一副卡组，点击「复制」按钮即可获得分享码；</li>
            <li>或在炉石盒子、旅法师营地等站点复制他人分享的卡组代码；</li>
            <li>把整段代码粘贴到上方文本框，点击「解析卡组代码」（直接 Ctrl/⌘+V 粘贴也会自动解析）。</li>
          </ol>
        </div>

        <!-- 复用现成的卡组详情弹窗 -->
        <DeckDetailModal
          v-if="modalVisible"
          :visible="modalVisible"
          :deck="deckData"
          @close="modalVisible = false"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineAsyncComponent, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'

const DeckDetailModal = defineAsyncComponent(
  () => import('../components/DeckDetailModal.vue')
)
const { hsTheme } = useHearthstoneTheme()

const route = useRoute()
const router = useRouter()

const code = ref('')
const deckName = ref('')
const error = ref('')
const hint = ref('')
const analyzing = ref(false)
const modalVisible = ref(false)
const deckData = ref(null)
const codeEl = ref(null)

const SAMPLE = 'AAECAf7gBgL/lwbO8QYO9eMEh/YEmMQFhY4G/7oGkMsG/eYGwOgGn/EGrPEGwvEG4/EGqPcG//cGAAA='

function clearError() {
  error.value = ''
}

let deckDecoderPromise
function getDeckDecoder() {
  if (!deckDecoderPromise) {
    deckDecoderPromise = import('../utils/deckstring.js')
  }
  return deckDecoderPromise
}

async function analyze() {
  if (analyzing.value) return
  const raw = (code.value || '').trim()
  if (!raw) {
    error.value = '请先粘贴卡组代码。'
    hint.value = ''
    return
  }
  analyzing.value = true
  try {
    const { decodeDeck } = await getDeckDecoder()
    const decoded = decodeDeck(raw)
    if (!decoded.valid) {
      error.value = '卡组代码无法解析，请确认代码完整、未被截断，且不含多余空格或换行。'
      hint.value = ''
      return
    }
    error.value = ''
    hint.value = `已识别为「${decoded.heroClass}」卡组，共 ${decoded.total} 张，点击下方卡片可查看大图。`
    const name = deckName.value.trim() || `${decoded.heroClass}卡组`
    deckData.value = { code: raw, name, heroClass: decoded.heroClass, deckIntro: '' }
    modalVisible.value = true
    // 把当前卡组代码写进 URL，便于分享/深链（不新增历史记录）
    if (route.query.code !== raw) {
      router.replace({ query: { ...route.query, code: raw } }).catch(() => {})
    }
  } catch {
    error.value = '卡牌数据库加载失败，请刷新页面后重试。'
    hint.value = ''
  } finally {
    analyzing.value = false
  }
}

// 在文本框内粘贴：拦截默认插入，直接取剪贴板文本并解析（体验更顺）
function onPaste(e) {
  const text = e.clipboardData?.getData('text')
  if (!text) return
  e.preventDefault()
  code.value = text.trim()
  analyze()
}

// 主动读取系统剪贴板（需用户手势 + 安全上下文）
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text && text.trim()) {
      code.value = text.trim()
      analyze()
    } else {
      error.value = '剪贴板为空，请手动粘贴（Ctrl/⌘+V）。'
    }
  } catch {
    error.value = '浏览器阻止了剪贴板读取，请直接把卡组代码粘贴到文本框（Ctrl/⌘+V）。'
  }
}

function fillSample() {
  code.value = SAMPLE
  deckName.value = ''
  error.value = ''
  analyze()
}

onMounted(() => {
  const c = route.query.code
  if (typeof c === 'string' && c.trim()) {
    code.value = c.trim()
    analyze()
  }
})
</script>

<style scoped>
.dcv-wrap {
  max-width: 880px;
  margin: 0 auto;
  padding-bottom: 64px;
}

/* 头部 */
.dcv-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.dcv-title-block { min-width: 0; }
.dcv-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: var(--hs-muted);
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  transition: all .15s;
}
.dcv-back:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }
.dcv-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #a7472f;
}
.hs-live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #15803d; box-shadow: 0 0 0 3px rgba(21,128,61,.18);
}
.dcv-title-block h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 800;
  color: var(--hs-text);
}
.dcv-sub {
  margin: 0;
  max-width: 560px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--hs-muted);
}
.dcv-theme {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--hs-text);
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  transition: all .15s;
}
.dcv-theme:hover { background: var(--hs-surface-overlay); }

/* 输入卡片 */
.dcv-card {
  padding: 22px;
  border-radius: 16px;
  background: var(--hs-surface-raised);
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-shadow-strong);
}
.dcv-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--hs-text-soft);
}
.dcv-label:first-child { margin-top: 0; }
.dcv-input,
.dcv-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  font-size: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.dcv-input:focus,
.dcv-textarea:focus {
  outline: none;
  border-color: var(--hs-focus);
  box-shadow: 0 0 0 3px var(--hs-focus);
}
.dcv-textarea {
  min-height: 112px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace;
  letter-spacing: .02em;
  line-height: 1.6;
}

/* 操作按钮 */
.dcv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.dcv-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .15s;
}
.dcv-primary {
  color: #fff;
  background: var(--hs-primary);
}
.dcv-primary:hover { filter: brightness(1.08); }
.dcv-ghost {
  color: var(--hs-text);
  background: var(--hs-surface-soft);
  border-color: var(--hs-border);
}
.dcv-ghost:hover { background: var(--hs-surface-overlay); }

/* 提示 */
.dcv-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 14px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
}
.dcv-hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--hs-muted);
}

/* 使用提示 */
.dcv-tips {
  margin-top: 22px;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  color: var(--hs-muted);
}
.dcv-tips h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--hs-text-soft);
}
.dcv-tips ol {
  margin: 0;
  padding-left: 20px;
  line-height: 1.9;
  font-size: 13px;
}

@media (max-width: 640px) {
  .dcv-head { flex-direction: column; }
  .dcv-theme { align-self: flex-start; }
  .dcv-title-block h1 { font-size: 24px; }
}
</style>
