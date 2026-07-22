<script setup>
import { ref, computed, onMounted } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  // 是否开启硬核模式：true 纳入全部版本，false 仅核心 9 个有经验版本
  hardcore: { type: Boolean, default: false }
})

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

// 每日额度（来自服务端，前端只读）
const quota = ref({ fixedUsed: 0, fixedLimit: 5, freeUsed: 0, freeLimit: 1 })
const messages = ref([]) // { role: 'user' | 'assistant', text }
const input = ref('')
const loading = ref(false)
const error = ref('')
// 服务端返回的实际作用域（用于向用户展示「当前 AI 读取了哪些版本」，验证硬核开关是否生效）
const lastScope = ref(null)

const fixedRemaining = computed(() => Math.max(0, quota.value.fixedLimit - quota.value.fixedUsed))
const freeRemaining = computed(() => Math.max(0, quota.value.freeLimit - quota.value.freeUsed))

const canSendFixed = computed(() => !loading.value && fixedRemaining.value > 0)
const canSendFree = computed(() => !loading.value && freeRemaining.value > 0 && input.value.trim().length > 0)
const quotaReached = computed(() => fixedRemaining.value <= 0 && freeRemaining.value <= 0)

// 预设（固定）问题
const fixedQuestions = [
  '我目前最该优先冲刺哪一类成就？',
  '哪些成就最容易快速完成（性价比最高）？',
  '累计-次数类里，哪个最不耗时？',
  '有没有可以顺手一起做的成就？',
  '按剩余经验/点数，你推荐先刷哪个方向？'
]

onMounted(async () => {
  try {
    const resp = await fetch('/api/ai-advisor/quota', { credentials: 'include' })
    if (resp.ok) quota.value = await resp.json()
  } catch { /* 额度获取失败不阻断使用，后续请求会刷新 */ }
})

function renderMd(text) {
  try {
    return md.render(text || '')
  } catch {
    return (text || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  }
}

async function ask(question, type) {
  const q = (question || '').trim()
  if (!q) return
  // 额度/并发校验：基于「剩余额度」而非输入框内容，避免 onSend 先清空输入框导致校验误判。
  if (loading.value) return
  if (type === 'fixed' && fixedRemaining.value <= 0) return
  if (type === 'free' && freeRemaining.value <= 0) return
  error.value = ''
  messages.value.push({ role: 'user', text: q })
  loading.value = true
  try {
    const resp = await fetch('/api/ai-advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type,
        question: q,
        hardcore: props.hardcore
      })
    })
    const data = await resp.json().catch(() => ({}))
    // 无论成功失败都尝试用最新额度刷新显示
    if (data.quota) quota.value = data.quota
    // 记录实际作用域，向用户展示 AI 究竟读取了哪些版本（验证硬核开关）
    if (data.scope) lastScope.value = data.scope
    if (!resp.ok) {
      messages.value.pop()
      throw new Error(data.error || `请求失败（${resp.status}）`)
    }
    messages.value.push({ role: 'assistant', text: data.reply || '（无返回内容）' })
  } catch (e) {
    if (messages.value.length && messages.value[messages.value.length - 1].role === 'user') {
      // 出错时移除刚加入的用户消息，避免脏对话
      messages.value.pop()
    }
    error.value = e.message || '请求出错'
  } finally {
    loading.value = false
  }
}

function onSend() {
  const q = input.value
  input.value = ''
  ask(q, 'free')
}
function onFixed(q) {
  ask(q, 'fixed')
}
function clearChat() {
  messages.value = []
}
</script>

<template>
  <div class="ai-advisor">
    <!-- 实验性功能提示横幅 -->
    <div class="ai-banner">
      <span>🧪 实验性功能（AI 建议）</span>
      <span class="ai-banner-sub">服务端运行 · 每天 5 次固定 + 1 次自由 · 可能随时下线</span>
    </div>

    <!-- 作用域提示：明确 AI 当前读取的是「核心版本」还是「全部版本」，验证硬核开关是否生效 -->
    <div class="ai-scope" :class="lastScope && lastScope.hardcore ? 'ai-scope-all' : 'ai-scope-core'">
      <span class="ai-scope-dot"></span>
      <template v-if="lastScope">
        <b>范围：{{ lastScope.hardcore ? '全部版本' : '核心版本' }}</b>
        （{{ lastScope.versions }} 个版本 · {{ lastScope.remaining }} 项未完成）
      </template>
      <template v-else>
        <b>范围：{{ props.hardcore ? '全部版本' : '核心版本' }}</b>
        （将依据上方「硬核模式」开关决定）
      </template>
    </div>

    <!-- 额度 -->
    <div class="ai-bar">
      <span class="ai-quota">
        固定剩余 <b>{{ fixedRemaining }}</b>/{{ quota.fixedLimit }} ·
        自由剩余 <b>{{ freeRemaining }}</b>/{{ quota.freeLimit }}
      </span>
      <button type="button" class="ai-link" @click="clearChat">清空对话</button>
    </div>

    <p v-if="quotaReached" class="ai-warn">今日额度已用完（固定 {{ quota.fixedLimit }} 次 + 自由 {{ quota.freeLimit }} 次），明天刷新。</p>
    <p v-if="error" class="ai-error">{{ error }}</p>

    <!-- 固定问答 -->
    <div class="ai-fixed">
      <button
        v-for="q in fixedQuestions"
        :key="q"
        type="button"
        class="ai-fixed-btn"
        :disabled="!canSendFixed"
        @click="onFixed(q)"
      >{{ q }}</button>
    </div>

    <!-- 对话记录 -->
    <div class="ai-messages">
      <div v-for="(m, i) in messages" :key="i" class="ai-msg" :class="'ai-msg-' + m.role">
        <div class="ai-msg-role">{{ m.role === 'user' ? '你' : 'AI' }}</div>
        <div class="ai-msg-text" :class="{ 'ai-md': m.role === 'assistant' }" v-html="m.role === 'assistant' ? renderMd(m.text) : m.text"></div>
      </div>
      <div v-if="loading" class="ai-msg ai-msg-assistant">
        <div class="ai-msg-role">AI</div>
        <div class="ai-msg-text ai-loading">思考中…</div>
      </div>
    </div>

    <!-- 自由提问 -->
    <div class="ai-input-row">
      <textarea
        v-model="input"
        class="ai-input"
        rows="2"
        placeholder="输入你自己的问题…（回车发送，Shift+Enter 换行）"
        :disabled="loading || freeRemaining <= 0"
        @keydown.enter.exact.prevent="onSend"
      ></textarea>
      <button type="button" class="ai-send" :disabled="!canSendFree" @click="onSend">发送</button>
    </div>
  </div>
</template>

<style scoped>
.ai-advisor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--hs-surface-overlay, #fff);
  border: 1px solid var(--hs-border, #e2e8f0);
  border-radius: 12px;
}
.ai-banner {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
}
.ai-banner-sub {
  font-size: 11px;
  font-weight: 500;
  color: #8b5cf6;
}
.ai-scope {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 12.5px;
  border-radius: 8px;
  line-height: 1.4;
}
.ai-scope-core {
  color: #0f766e;
  background: #ecfdf5;
  border: 1px solid #99f6e4;
}
.ai-scope-all {
  color: #9a3412;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}
.ai-scope b { font-weight: 700; }
.ai-scope-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.ai-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12.5px;
}
.ai-quota {
  font-weight: 600;
  color: var(--hs-text-soft, #475569);
}
.ai-quota b { color: #7c3aed; }
.ai-link {
  border: none;
  background: none;
  color: var(--hs-link, #2563eb);
  font-size: 12.5px;
  cursor: pointer;
  padding: 2px 4px;
  text-decoration: underline;
}
.ai-link:hover { color: #1d4ed8; }
.ai-warn {
  margin: 0;
  padding: 8px 12px;
  font-size: 12.5px;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}
.ai-error {
  margin: 0;
  padding: 8px 12px;
  font-size: 12.5px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}
.ai-fixed {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ai-fixed-btn {
  padding: 7px 11px;
  font-size: 12.5px;
  font-weight: 600;
  color: #6d28d9;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  cursor: pointer;
  transition: background .15s ease;
}
.ai-fixed-btn:hover:not(:disabled) { background: #ede9fe; }
.ai-fixed-btn:disabled { opacity: .5; cursor: not-allowed; }
.ai-messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px;
}
.ai-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.ai-msg-role {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  color: #fff;
}
.ai-msg-user .ai-msg-role { background: #64748b; }
.ai-msg-assistant .ai-msg-role { background: #7c3aed; }
.ai-msg-text {
  flex: 1 1 auto;
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: 10px;
  background: var(--hs-inset-bg, #f1f5f9);
  color: var(--hs-text, #0f172a);
}
.ai-msg-user .ai-msg-text { background: #eef2ff; }
.ai-msg-text.ai-md { white-space: normal; }
.ai-msg-text.ai-md :deep(p) { margin: 0 0 8px; }
.ai-msg-text.ai-md :deep(p:last-child) { margin-bottom: 0; }
.ai-msg-text.ai-md :deep(ul),
.ai-msg-text.ai-md :deep(ol) { margin: 0 0 8px; padding-left: 20px; }
.ai-msg-text.ai-md :deep(li) { margin: 2px 0; }
.ai-msg-text.ai-md :deep(code) {
  background: #ede9fe;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}
.ai-msg-text.ai-md :deep(strong) { color: #6d28d9; }
.ai-msg-text.ai-md :deep(a) { color: var(--hs-link, #2563eb); }
.ai-loading { color: var(--hs-muted, #94a3b8); font-style: italic; }
.ai-input-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.ai-input {
  flex: 1 1 auto;
  resize: vertical;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  border: 1px solid var(--hs-border, #e2e8f0);
  border-radius: 10px;
  background: #fff;
  color: var(--hs-text, #0f172a);
}
.ai-input:focus {
  outline: 3px solid rgba(124, 58, 237, 0.3);
  outline-offset: 1px;
  border-color: #7c3aed;
}
.ai-input:disabled { background: #f8fafc; cursor: not-allowed; }
.ai-send {
  flex: 0 0 auto;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: #7c3aed;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}
.ai-send:hover:not(:disabled) { background: #6d28d9; }
.ai-send:disabled { opacity: .5; cursor: not-allowed; }
</style>
