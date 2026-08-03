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

      <div class="wp-card">
        <div class="wp-ai-scopes">
          <button
            v-for="s in aiScopes"
            :key="s.value"
            type="button"
            class="wp-chip"
            :class="{ active: aiScope === s.value }"
            @click="aiScope = s.value"
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
          <span v-if="aiQuota" class="wp-ai-quota">今日剩余 {{ aiQuota.limit - aiQuota.used }} / {{ aiQuota.limit }} 次</span>
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
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const router = useRouter()
const { user, init } = useWillpowerAuth()

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

async function generateReport() {
  aiBusy.value = true
  aiError.value = ''
  aiReport.value = ''
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
  } catch (err) {
    aiError.value = err.message || '分析失败，请稍后重试'
  } finally {
    aiBusy.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/willpower/login')
    return
  }
})
</script>
