<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../../../composables/useTheme.js'
import DreamForm from '../components/DreamForm.vue'
import DreamResult from '../components/DreamResult.vue'
import DreamHistory from '../components/DreamHistory.vue'
import { streamDream } from '../api/dreamClient.js'
import SmartBackLink from '../../../components/SmartBackLink.vue'

const { theme } = useTheme()

const HISTORY_KEY = 'huangliang-dreams'
const CURRENT_KEY = 'huangliang-current'
const MAX_HISTORY = 20

const loading = ref(false)
const streaming = ref(false)
const result = ref('')
const error = ref('')
const history = ref([])
const lastPayload = ref(null)

// --- localStorage 读写 ---
function loadHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    history.value = data ? JSON.parse(data) : []
  } catch {
    history.value = []
  }
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(0, MAX_HISTORY)))
  } catch {
    /* 存储满或被禁，忽略 */
  }
}

function loadCurrent() {
  try {
    const data = localStorage.getItem(CURRENT_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      result.value = parsed.text || ''
      lastPayload.value = parsed.payload || null
    }
  } catch {
    /* 忽略 */
  }
}

function saveCurrentToStorage() {
  try {
    if (result.value) {
      localStorage.setItem(
        CURRENT_KEY,
        JSON.stringify({ text: result.value, payload: lastPayload.value })
      )
    } else {
      localStorage.removeItem(CURRENT_KEY)
    }
  } catch {
    /* 忽略 */
  }
}

// --- 生成与历史 ---
async function handleGenerate(payload) {
  loading.value = true
  streaming.value = false
  error.value = ''
  result.value = ''
  lastPayload.value = payload
  try {
    for await (const chunk of streamDream(payload)) {
      streaming.value = true
      result.value += chunk
    }
    if (result.value) {
      const record = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
        currentAge: payload.currentAge,
        targetAge: payload.targetAge,
        achievements: payload.achievements,
        text: result.value
      }
      history.value.unshift(record)
      if (history.value.length > MAX_HISTORY) {
        history.value = history.value.slice(0, MAX_HISTORY)
      }
      saveHistoryToStorage()
    }
  } catch (e) {
    error.value = e?.message || '生成失败，请稍后重试'
  } finally {
    loading.value = false
    setTimeout(() => {
      streaming.value = false
    }, 100)
    saveCurrentToStorage()
  }
}

function handleReset() {
  result.value = ''
  error.value = ''
  streaming.value = false
  saveCurrentToStorage()
}

function handleClearHistory() {
  history.value = []
  saveHistoryToStorage()
}

function handleDeleteHistoryItem(id) {
  history.value = history.value.filter((item) => item.id !== id)
  saveHistoryToStorage()
}

function handleViewHistory(item) {
  result.value = item.text
  error.value = ''
  streaming.value = false
  lastPayload.value = item
  saveCurrentToStorage()
}

// --- 退出警告 ---
function handleBeforeUnload(e) {
  if (result.value || streaming.value) {
    e.preventDefault()
    e.returnValue = '当前梦境内容将在离开后清除，确定离开吗？'
  }
}

onMounted(() => {
  loadHistory()
  loadCurrent()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <section class="section page-section dream-page" :data-theme="theme">
    <div class="hl-page">
      <header class="hl-hero">
        <SmartBackLink fallback="/projects" class="hl-back" label="返回项目索引" />
        <p class="hl-hero__eyebrow">人生模拟器</p>
        <h1 class="hl-hero__title">黄粱一梦</h1>
        <p class="hl-hero__sub">枕上片刻，梦中百年。写下你的年纪与野心，AI 为你烹一锅人间大梦。</p>
      </header>

      <main class="hl-stage">
        <DreamForm :loading="loading" @generate="handleGenerate" />
        <DreamResult :loading="loading" :streaming="streaming" :text="result" :error="error" @reset="handleReset" />
      </main>

      <DreamHistory :history="history" @view="handleViewHistory" @delete="handleDeleteHistoryItem" @clear="handleClearHistory" />

      <footer class="hl-foot">
        <span>黄粱虽熟，梦醒皆空 · 本梦由 AI 即兴编织，仅供消遣</span>
      </footer>
    </div>
  </section>
</template>
