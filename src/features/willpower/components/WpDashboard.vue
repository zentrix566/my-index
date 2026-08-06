<template>
  <div class="wp-dashboard">
    <div class="wp-card">
      <div class="wp-card-head">
        <div>
          <h2>数据看板</h2>
          <p>全局累计战绩，结合正能量一起看。</p>
        </div>
      </div>

      <div class="wp-stat-grid">
        <div class="wp-stat"><strong>{{ overview.totalSuccess }}</strong><span>累计抗住</span></div>
        <div class="wp-stat"><strong>{{ overview.totalFail }}</strong><span>累计破防</span></div>
        <div class="wp-stat wp-stat-accent"><strong>{{ overview.positiveCount }}</strong><span>累计正能量</span></div>
        <div class="wp-stat"><strong>{{ overview.compositeRate }}%</strong><span>综合胜率</span></div>
        <div class="wp-stat"><strong>{{ overview.currentStreak }}</strong><span>当前连胜（天）</span></div>
        <div class="wp-stat"><strong>{{ overview.longestStreak }}</strong><span>最长连胜（天）</span></div>
        <div class="wp-stat"><strong>{{ overview.activeDays }}</strong><span>累计活跃天数</span></div>
      </div>

      <!-- 高大上甜甜圈：抗住 / 破防 / 正能量 -->
      <div class="wp-donut-wrap" style="margin-top: 22px">
        <div class="wp-donut">
          <svg viewBox="0 0 36 36" width="200" height="200" role="img" :aria-label="`综合胜率 ${overview.compositeRate}%`">
            <defs>
              <linearGradient id="wpGradWin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="100%" stop-color="#059669" />
              </linearGradient>
              <linearGradient id="wpGradLose" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fb7185" />
                <stop offset="100%" stop-color="#e11d48" />
              </linearGradient>
              <linearGradient id="wpGradPos" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#f59e0b" />
              </linearGradient>
              <filter id="wpDonutGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#000" flood-opacity="0.35" />
              </filter>
            </defs>

            <circle class="wp-donut-track" cx="18" cy="18" r="15.915" fill="none" />
            <g filter="url(#wpDonutGlow)">
              <circle
                v-if="segments.win > 0"
                class="wp-donut-seg" cx="18" cy="18" r="15.915" fill="none"
                stroke="url(#wpGradWin)"
                :stroke-dasharray="`${segments.win} ${100 - segments.win}`" stroke-dashoffset="25"
              />
              <circle
                v-if="segments.lose > 0"
                class="wp-donut-seg" cx="18" cy="18" r="15.915" fill="none"
                stroke="url(#wpGradLose)"
                :stroke-dasharray="`${segments.lose} ${100 - segments.lose}`" :stroke-dashoffset="25 - segments.win"
              />
              <circle
                v-if="segments.pos > 0"
                class="wp-donut-seg" cx="18" cy="18" r="15.915" fill="none"
                stroke="url(#wpGradPos)"
                :stroke-dasharray="`${segments.pos} ${100 - segments.pos}`" :stroke-dashoffset="25 - segments.win - segments.lose"
              />
            </g>
            <text class="wp-donut-center" x="18" y="17.5">{{ overview.compositeRate }}<tspan class="wp-donut-pct">%</tspan></text>
            <text class="wp-donut-sub" x="18" y="23.5">综合胜率</text>
          </svg>
        </div>

        <div class="wp-donut-legend">
          <div class="wp-donut-item">
            <i class="wp-donut-dot" style="background: linear-gradient(135deg,#34d399,#059669)"></i>
            <span class="wp-donut-name">抗住了</span>
            <span class="wp-donut-value">{{ overview.totalSuccess }} 次</span>
            <span class="wp-donut-pct">{{ pct(overview.totalSuccess) }}%</span>
          </div>
          <div class="wp-donut-item">
            <i class="wp-donut-dot" style="background: linear-gradient(135deg,#fb7185,#e11d48)"></i>
            <span class="wp-donut-name">破防了</span>
            <span class="wp-donut-value">{{ overview.totalFail }} 次</span>
            <span class="wp-donut-pct">{{ pct(overview.totalFail) }}%</span>
          </div>
          <div class="wp-donut-item">
            <i class="wp-donut-dot" style="background: linear-gradient(135deg,#fbbf24,#f59e0b)"></i>
            <span class="wp-donut-name">正能量</span>
            <span class="wp-donut-value">{{ overview.positiveCount }} 次</span>
            <span class="wp-donut-pct">{{ pct(overview.positiveCount) }}%</span>
          </div>
          <p class="wp-donut-note">综合胜率 =（抗住 + 正能量）÷ 全部记录</p>
        </div>
      </div>

      <p class="wp-section-title" style="margin-top: 24px">按心魔分布</p>
      <template v-for="d in overview.byDemon" :key="d.demonKey">
        <div class="wp-bar-row">
          <span>{{ d.emoji }} {{ d.name }}</span>
          <div class="wp-bar-track"><i class="wp-bar-fill" :style="{ width: barWidth(d.count, maxDemon), background: d.color }"></i></div>
          <span>{{ d.count }}</span>
        </div>
      </template>
      <p v-if="!overview.byDemon.length" class="wp-empty">还没有抵御记录。</p>

      <p class="wp-section-title" style="margin-top: 18px">按小时分布</p>
      <div style="display: flex; align-items: flex-end; gap: 3px; height: 96px; overflow-x: auto">
        <div
          v-for="h in overview.byHour"
          :key="h.hour"
          :title="`${h.hour} 点：${h.count} 次`"
          style="flex: 1 0 auto; width: 14px; background: var(--wp); border-radius: 3px 3px 0 0; min-height: 2px"
          :style="{ height: hourHeight(h.count) }"
        ></div>
      </div>
      <div style="display: flex; gap: 3px; overflow-x: auto; color: var(--muted); font-size: 0.7rem; margin-top: 4px">
        <span v-for="h in overview.byHour" :key="'l' + h.hour" style="flex: 1 0 auto; width: 14px; text-align: center">{{ h.hour % 6 === 0 ? h.hour : '' }}</span>
      </div>
    </div>

    <div class="wp-card">
      <div class="wp-card-head"><div><h2>本周小结</h2><p>过去 7 天你的战绩。</p></div></div>
      <div class="wp-weekly">
        <div class="wp-stat"><strong>{{ overview.weekCount }}</strong><span class="wp-stat-sub">本周抗住</span></div>
        <div class="wp-stat"><strong>{{ overview.weekFailCount }}</strong><span class="wp-stat-sub">本周破防</span></div>
        <div class="wp-stat wp-stat-accent"><strong>{{ overview.weekPositiveCount }}</strong><span class="wp-stat-sub">本周正能量</span></div>
        <div class="wp-stat"><strong>{{ overview.currentStreak }}</strong><span class="wp-stat-sub">当前连胜（天）</span></div>
      </div>
      <div class="wp-actions" style="margin-top: 14px">
        <button class="wp-btn primary small" type="button" :disabled="aiBusy" @click="generateAi('last_week')">
          {{ aiBusy && aiScope === 'last_week' ? '生成中…' : '🤖 生成 AI 周报' }}
        </button>
        <button class="wp-btn ghost small" type="button" :disabled="aiBusy" @click="generateAi('this_month')">
          {{ aiBusy && aiScope === 'this_month' ? '生成中…' : '📅 生成 AI 月报' }}
        </button>
        <span v-if="aiQuota" class="wp-ai-quota">今日剩余 {{ aiQuota.limit - aiQuota.used }} / {{ aiQuota.limit }} 次</span>
      </div>
      <p v-if="aiError" class="wp-error" style="margin-top: 10px">{{ aiError }}</p>
      <div v-if="aiReport" class="wp-markdown" v-html="aiHtml" style="margin-top: 14px"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import willpowerApi from '../api/willpower.js'
import { useAuth } from '../../../auth/useAuth.js'
import { useToast } from '../composables/useToast.js'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
const { init } = useAuth()
const { push: toast } = useToast()

const overview = ref({
  totalSuccess: 0,
  totalFail: 0,
  positiveCount: 0,
  totalAll: 0,
  compositeRate: 0,
  successRate: 0,
  currentStreak: 0,
  longestStreak: 0,
  activeDays: 0,
  weekCount: 0,
  weekFailCount: 0,
  weekPositiveCount: 0,
  byDemon: [],
  byHour: []
})

const maxDemon = computed(() => overview.value.byDemon.reduce((m, d) => Math.max(m, d.count), 0))
const maxHour = computed(() => overview.value.byHour.reduce((m, d) => Math.max(m, d.count), 0))

const segments = computed(() => {
  const total = overview.value.totalAll || 0
  const pctOf = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0)
  return {
    win: pctOf(overview.value.totalSuccess),
    lose: pctOf(overview.value.totalFail),
    pos: pctOf(overview.value.positiveCount)
  }
})

function pct(n) {
  const total = overview.value.totalAll || 0
  return total ? Math.round((n / total) * 100) : 0
}

function barWidth(count, max) {
  if (!max) return '0%'
  return `${Math.round((count / max) * 100)}%`
}
function hourHeight(count) {
  if (!maxHour.value) return '2px'
  return `${Math.max(2, Math.round((count / maxHour.value) * 90))}px`
}

async function loadOverview() {
  const ov = await willpowerApi.overview()
  overview.value = { ...overview.value, ...ov.overview }
}

// ===== AI 周报/月报 =====
const aiBusy = ref(false)
const aiError = ref('')
const aiReport = ref('')
const aiScope = ref('')
const aiQuota = ref(null)
const aiHtml = computed(() => (aiReport.value ? md.render(aiReport.value) : ''))

async function generateAi(scope) {
  aiBusy.value = true
  aiError.value = ''
  aiReport.value = ''
  aiScope.value = scope
  try {
    const res = await willpowerApi.aiReport({ scope })
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
  try {
    await loadOverview()
  } catch (err) {
    toast(err.message || '数据加载失败', { type: 'error' })
  }
})
</script>
