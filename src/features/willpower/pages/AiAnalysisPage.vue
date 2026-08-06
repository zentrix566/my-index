<template>
  <section class="wp-page">
    <div class="wp-container">
      <header class="wp-header">
        <div>
          <span class="wp-eyebrow">抵御心魔</span>
          <h1>AI 分析</h1>
          <p>让 AI 帮你复盘：今天、上周、本月、指定某天，或任意一段时间。</p>
        </div>
        <RouterLink class="wp-btn ghost" to="/willpower">回到今日心魔</RouterLink>
      </header>

      <WpNav />

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <!-- 缓存的历史报告快捷入口 -->
      <div v-if="cachedReports.length && !aiReport" class="wp-card">
        <div class="wp-card-head">
          <div>
            <h2>历史分析</h2>
            <p>点击可快速查看之前的分析结果（不消耗额度）。</p>
          </div>
        </div>
        <div class="wp-ai-history">
          <button
            v-for="r in cachedReports"
            :key="r.id"
            type="button"
            class="wp-chip"
            :class="{ active: activeCacheId === r.id }"
            @click="loadCachedReport(r)"
          >{{ scopeLabel(r.scope) }} · {{ r.from }}</button>
        </div>
      </div>

      <div class="wp-card">
        <div class="wp-ai-scopes">
          <button
            v-for="s in aiScopes"
            :key="s.value"
            type="button"
            class="wp-chip"
            :class="{ active: aiScope === s.value }"
            @click="aiScope = s.value; activeCacheId = null"
          >{{ s.label }}</button>
        </div>

        <div v-if="aiScope === 'date'" class="wp-ai-dates">
          <label>日期 <input type="date" v-model="aiDate" /></label>
        </div>
        <div v-if="aiScope === 'range'" class="wp-ai-dates">
          <label>起 <input type="date" v-model="aiFrom" /></label>
          <label>止 <input type="date" v-model="aiTo" /></label>
        </div>

        <div class="wp-actions" style="margin-top: 12px">
          <button class="wp-btn primary" type="button" :disabled="aiBusy" @click="generateReport">
            {{ aiBusy ? '分析中…' : '生成分析' }}
          </button>
          <span v-if="aiQuota !== null" class="wp-ai-quota">今日剩余 {{ aiQuota.limit - aiQuota.used }} / {{ aiQuota.limit }} 次</span>
        </div>

        <p v-if="aiError" class="wp-error">{{ aiError }}</p>

        <div v-if="aiReport" class="wp-markdown" v-html="aiHtml"></div>
      </div>
    </div>

    <WpToastHost />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import willpowerApi from '../api/willpower.js'
import { useAuth } from '../../../auth/useAuth.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const router = useRouter()
const { user, init } = useAuth()

const loadError = ref('')

function localDateKey(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

// ========== AI 分析 ==========
const aiScopes = [
  { value: 'today', label: '今天' },
  { value: 'last_week', label: '上周' },
  { value: 'this_month', label: '本月' },
  { value: 'date', label: '指定日期' },
  { value: 'range', label: '时间段' }
]
const aiScope = ref('today')
const aiDate = ref(localDateKey(new Date()))
const aiFrom = ref(localDateKey(new Date(Date.now() - 30 * 86400000)))
const aiTo = ref(localDateKey(new Date()))
const aiBusy = ref(false)
const aiError = ref('')
const aiReport = ref('')
const aiQuota = ref(null)
const aiHtml = computed(() => (aiReport.value ? md.render(aiReport.value) : ''))

// 缓存的历史报告
const cachedReports = ref([])
const activeCacheId = ref(null)

const scopeMap = { today: '今天', last_week: '上周', this_month: '本月', date: '指定日期', range: '时间段' }
function scopeLabel(scope) { return scopeMap[scope] || scope }

/** 加载缓存的历史报告列表 */
async function loadCachedReports() {
  try {
    const res = await willpowerApi.aiReportCache()
    cachedReports.value = res.reports || []
  } catch (err) {
    // 缓存加载失败不阻塞主流程
    console.warn('[willpower] 加载 AI 报告缓存列表失败:', err?.message)
  }
}

/** 点击历史报告时，直接从服务端读取缓存内容 */
async function loadCachedReport(r) {
  activeCacheId.value = r.id
  aiError.value = ''
  aiBusy.value = true
  try {
    const res = await willpowerApi.aiReportCache(r.scope)
    if (res.cached && res.cached.report) {
      aiReport.value = res.cached.report
      aiScope.value = r.scope
      // 匹配 scope 到对应的日期参数（方便用户知道是哪段）
      if (r.from) {
        if (r.scope === 'date') aiDate.value = r.from
        else if (r.scope === 'range') { aiFrom.value = r.from; aiTo.value = r.to }
      }
      aiQuota.value = null // 缓存命中不显示额度
    } else {
      aiReport.value = ''
      aiError.value = '该缓存已过期或不存在'
    }
  } catch (err) {
    aiError.value = err.message || '读取缓存失败'
  } finally {
    aiBusy.value = false
  }
}

async function generateReport() {
  aiBusy.value = true
  aiError.value = ''
  aiReport.value = ''
  activeCacheId.value = null
  try {
    const payload = { scope: aiScope.value }
    if (aiScope.value === 'date') payload.date = aiDate.value
    if (aiScope.value === 'range') {
      payload.from = aiFrom.value
      payload.to = aiTo.value
    }
    const res = await willpowerApi.aiReport(payload)
    aiReport.value = res.report || ''
    aiQuota.value = res.quota || null
    // 刷新缓存列表（新生成的报告会出现在列表中）
    loadCachedReports()
  } catch (err) {
    const data = err.message ? JSON.parse(`{"error":"${err.message}"}`) : {}
    // 如果是 429 且有缓存内容，直接展示缓存
    if (data.error && data.cached && data.cached.report) {
      aiReport.value = data.cached.report
      aiError.value = '今日额度已用完，以上为最近一次的缓存结果'
      aiQuota.value = data.quota || null
    } else {
      aiError.value = err.message || '分析失败，请稍后重试'
    }
  } finally {
    aiBusy.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login')
    return
  }
  // 并行加载：缓存列表 + 尝试加载当前 scope 的缓存
  await Promise.all([loadCachedReports(), loadCurrentScopeCache()])
})

/** 页面加载时自动尝试加载「今天」的缓存报告 */
async function loadCurrentScopeCache() {
  try {
    const res = await willpowerApi.aiReportCache('today')
    if (res.cached && res.cached.report) {
      aiReport.value = res.cached.report
      activeCacheId.value = null // 标记为自动加载的缓存
    }
  } catch {
    // 无缓存时静默，等用户手动点生成
  }
}
</script>
