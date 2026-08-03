<template>
  <section class="wp-page">
    <div class="wp-container">
      <header class="wp-header">
        <div>
          <span class="wp-eyebrow">抵御心魔</span>
          <h1>抵御日历</h1>
          <p>按自然日回看：哪天扛住了，哪天破防了，一眼看完。</p>
        </div>
        <RouterLink class="wp-btn ghost" to="/willpower">回到今日</RouterLink>
      </header>

      <WpNav />

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <div class="wp-card">
        <div class="wp-cal-head">
          <button class="wp-btn ghost small" type="button" @click="shiftMonth(-1)">← 上月</button>
          <span class="wp-cal-title">{{ cursor.year }} 年 {{ cursor.month + 1 }} 月</span>
          <div class="wp-actions">
            <button class="wp-btn ghost small" type="button" @click="goToday">回到本月</button>
            <button class="wp-btn ghost small" type="button" :disabled="!canGoNext" @click="shiftMonth(1)">下月 →</button>
          </div>
        </div>

        <div class="wp-cal-week">
          <span v-for="w in weekLabels" :key="w">{{ w }}</span>
        </div>

        <div class="wp-cal-grid">
          <template v-for="(cell, i) in cells" :key="i">
            <div v-if="!cell.date" class="wp-cal-cell blank"></div>
            <button
              v-else
              type="button"
              class="wp-cal-cell"
              :class="{
                today: cell.date === todayKey,
                selected: cell.date === selectedDate,
                future: cell.date > todayKey
              }"
              @click="selectDay(cell.date)"
            >
              <span class="wp-cal-day">{{ cell.dayNum }}</span>
              <span class="wp-cal-marks">
                <span v-if="cell.success" class="wp-mark win">✓{{ cell.success }}</span>
                <span v-if="cell.fail" class="wp-mark lose">✗{{ cell.fail }}</span>
              </span>
            </button>
          </template>
        </div>

        <div class="wp-legend">
          <span><i class="wp-mark win">✓</i> 成功抵御</span>
          <span><i class="wp-mark lose">✗</i> 破防</span>
          <span>本月成功 {{ monthTotal.success }} 次 · 破防 {{ monthTotal.fail }} 次</span>
        </div>
      </div>

      <!-- 选中某天的明细 -->
      <div class="wp-card">
        <div class="wp-card-head">
          <div>
            <h2>{{ selectedDate }} 的记录</h2>
            <p v-if="dayLoading">读取中…</p>
            <p v-else>
              扛住 {{ daySummary.success }} 次 · 破防 {{ daySummary.fail }} 次 ·
              进行中 {{ daySummary.pending }} 个 · 正能量 {{ daySummary.positive }} 条
            </p>
          </div>
        </div>

        <div v-if="dayResistances.length" class="wp-record-list">
          <div
            v-for="r in dayResistances"
            :key="r.id"
            class="wp-record"
            :class="{ 'is-failed': r.status === 'failed' }"
          >
            <span class="wp-record-emoji">{{ demonOf(r.demonKey).emoji }}</span>
            <div class="wp-record-main">
              <strong>{{ demonOf(r.demonKey).name }}</strong>
              <span>
                {{ r.mode === 'timer' ? `计时挑战 ${Math.round(r.durationSec / 60)} 分钟` : '快速记录' }}
                <template v-if="r.note"> · {{ r.note }}</template>
              </span>
            </div>
            <span class="wp-status" :class="r.status">{{ statusLabel(r.status) }}</span>
            <span class="wp-record-time">{{ hhmm(r.startedAt) }}</span>
          </div>
        </div>
        <p v-else-if="!dayLoading" class="wp-empty">这天没有抵御记录。</p>

        <template v-if="dayPositives.length">
          <p class="wp-section-title" style="margin-top: 18px">当天正向记录</p>
          <div class="wp-record-list">
            <div v-for="p in dayPositives" :key="'p' + p.id" class="wp-record">
              <span class="wp-record-emoji">🌱</span>
              <div class="wp-record-main">
                <strong>{{ p.name }}<template v-if="p.amount"> · {{ p.amount }}{{ p.unit }}</template></strong>
                <span>{{ p.note || '—' }}</span>
              </div>
              <span class="wp-status success">正能量</span>
              <span class="wp-record-time">{{ hhmm(p.happenedAt) }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <WpToastHost />
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import willpowerApi from '../api/willpower.js'
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'
import { useToast } from '../composables/useToast.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'

const router = useRouter()
const { user, init } = useWillpowerAuth()
const { push: toast } = useToast()

const weekLabels = ['一', '二', '三', '四', '五', '六', '日']

const demons = ref([])
const byDay = ref([])
const todayKey = ref(localDateKey(new Date()))
const cursor = ref({ year: new Date().getFullYear(), month: new Date().getMonth() })
const selectedDate = ref(todayKey.value)
const dayResistances = ref([])
const dayPositives = ref([])
const daySummary = ref({ success: 0, fail: 0, pending: 0, positive: 0 })
const dayLoading = ref(false)
const loadError = ref('')

function localDateKey(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

const dayStats = computed(() => {
  const map = new Map()
  for (const item of byDay.value) map.set(item.date, item)
  return map
})

/** 以周一为一周起点排布当月格子，前面补空格。 */
const cells = computed(() => {
  const { year, month } = cursor.value
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (first.getDay() + 6) % 7
  const list = []
  for (let i = 0; i < leading; i += 1) list.push({ date: '', dayNum: '' })
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = localDateKey(new Date(year, month, d))
    const stat = dayStats.value.get(date)
    list.push({ date, dayNum: d, success: stat?.success || 0, fail: stat?.fail || 0 })
  }
  return list
})

const monthTotal = computed(() =>
  cells.value
    .filter((cell) => cell.date)
    .reduce(
      (acc, cell) => ({ success: acc.success + cell.success, fail: acc.fail + cell.fail }),
      { success: 0, fail: 0 }
    )
)

const canGoNext = computed(() => {
  const now = new Date()
  return (
    cursor.value.year < now.getFullYear() ||
    (cursor.value.year === now.getFullYear() && cursor.value.month < now.getMonth())
  )
})

function demonOf(key) {
  return demons.value.find((d) => d.demonKey === key) || { emoji: '👹', name: key }
}

function statusLabel(status) {
  if (status === 'success') return '扛住'
  if (status === 'failed') return '破防'
  return '进行中'
}

function hhmm(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function formatDayAmount(p) {
  if (p.inputMode === 'duration' && Number(p.amount) > 0) {
    const total = Number(p.amount)
    const h = Math.floor(total / 60)
    const m = total % 60
    if (h && m) return `${h}小时${m}分`
    if (h) return `${h}小时`
    return `${m}分`
  }
  return `${p.amount}${p.unit || ''}`
}

function shiftMonth(delta) {
  const next = new Date(cursor.value.year, cursor.value.month + delta, 1)
  cursor.value = { year: next.getFullYear(), month: next.getMonth() }
}

function goToday() {
  const now = new Date()
  cursor.value = { year: now.getFullYear(), month: now.getMonth() }
  selectDay(todayKey.value)
}

async function selectDay(date) {
  selectedDate.value = date
  dayLoading.value = true
  try {
    const res = await willpowerApi.dayDetail(date)
    dayResistances.value = res.resistances || []
    dayPositives.value = res.positives || []
    daySummary.value = res.summary || { success: 0, fail: 0, pending: 0, positive: 0 }
  } catch (err) {
    toast(err.message || '读取当天记录失败', { type: 'error' })
  } finally {
    dayLoading.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/willpower/login')
    return
  }
  try {
    const [demonRes, ov] = await Promise.all([willpowerApi.listDemons(), willpowerApi.overview()])
    demons.value = demonRes.demons || []
    byDay.value = ov.overview?.byDay || []
    if (ov.overview?.today) {
      todayKey.value = ov.overview.today
      selectedDate.value = ov.overview.today
    }
    await selectDay(selectedDate.value)
  } catch (err) {
    loadError.value = err.message || '数据加载失败'
  }
})
</script>
