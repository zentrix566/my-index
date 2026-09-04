<template>
  <section class="section page-section biography-page">
    <div class="container biography-container">
      <header class="biography-header">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <p class="eyebrow">Biography</p>
        <h1>人物生平 · 纪年查询</h1>
        <p>输入历史人物姓名，输出可直接复制的纯文本年谱：生卒年、主要事迹及当时年纪、死因与终年。</p>
      </header>

      <form class="biography-search" @submit.prevent="onSearch">
        <input
          id="biography-name"
          v-model="name"
          type="text"
          placeholder="例如：苏武、霍成君、苏轼、王阳明"
          autocomplete="off"
          aria-label="历史人物姓名"
          :disabled="loading"
        >
        <button type="submit" class="button" :disabled="loading || !name.trim()">
          {{ loading ? '查询中…' : '查询' }}
        </button>
      </form>

      <div v-if="!loading && recentNames.length" class="biography-recent" aria-label="最近查询">
        <span class="biography-recent-label">最近查询</span>
        <button
          v-for="item in recentNames"
          :key="item.name"
          type="button"
          class="biography-recent-chip"
          @click="searchRecent(item.name)"
        >
          {{ item.name }}
        </button>
      </div>

      <div v-if="loading" class="biography-loading" role="status" aria-live="polite">
        <span class="biography-spinner"></span>
        <p>正在翻检史料，请稍候…</p>
      </div>

      <div v-else-if="error" class="biography-error" role="alert">
        <strong>查询失败</strong>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="result" class="biography-result">
        <div class="biography-result-head">
          <div class="biography-result-meta">
            <span class="biography-result-label">生平年谱（可直接复制）</span>
            <span v-if="fromCache" class="biography-cache-hint">
              本地缓存 · {{ formatDateTime(cachedAt) }}
            </span>
            <button
              v-if="fromCache"
              type="button"
              class="biography-refresh-btn"
              @click="onSearch(true)"
            >
              重新查询
            </button>
          </div>
          <button type="button" class="button biography-copy-btn" @click="copyResult">
            {{ copied ? '已复制 ✓' : '复制全文' }}
          </button>
        </div>
        <textarea
          ref="resultText"
          readonly
          :value="result"
          class="biography-text"
          rows="6"
        ></textarea>
      </div>

      <p class="form-hint biography-hint">
        内容由大模型整理，文字简略，重要史实请以权威史料为准。
      </p>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { formatDateTime } from '../../../utils/date.js'
import { fetchBiography } from '../ark.js'
import { normalizeBiographyName, useBiographyCache } from '../composables/useBiographyCache.js'
import '../biography.css'

const cache = useBiographyCache()

const name = ref('')
const loading = ref(false)
const error = ref('')
const result = ref('')
const copied = ref(false)
const resultText = ref(null)
const fromCache = ref(false)
const cachedAt = ref(null)
const recentNames = ref([])

function refreshRecentNames() {
  recentNames.value = cache.recent(8)
}

function showCachedResult(entry) {
  result.value = entry.result
  cachedAt.value = entry.savedAt
  fromCache.value = true
  error.value = ''
  copied.value = false
}

async function onSearch(forceRefresh = false) {
  const query = normalizeBiographyName(name.value)
  if (!query || loading.value) return

  name.value = query
  if (!forceRefresh) {
    const cachedResult = cache.get(query)
    if (cachedResult?.result) {
      showCachedResult(cachedResult)
      refreshRecentNames()
      return
    }
  }

  loading.value = true
  error.value = ''
  result.value = ''
  fromCache.value = false
  cachedAt.value = null
  copied.value = false
  try {
    result.value = await fetchBiography(query)
    cache.save(query, result.value)
    refreshRecentNames()
  } catch (err) {
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

function searchRecent(recentName) {
  name.value = recentName
  onSearch()
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
  } catch {
    const ta = resultText.value
    if (ta) {
      ta.select()
      document.execCommand('copy')
    }
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

// 结果返回后让文本框自适应内容高度，方便整体阅读与复制
watch(result, async () => {
  await nextTick()
  const ta = resultText.value
  if (ta) {
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }
})

onMounted(() => {
  refreshRecentNames()
  const latest = recentNames.value[0]
  if (!latest) return

  const cachedResult = cache.get(latest.name)
  if (cachedResult?.result) {
    name.value = latest.name
    showCachedResult(cachedResult)
  }
})
</script>
