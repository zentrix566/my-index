<template>
  <section class="wp-page">
    <div class="wp-container">
      <header class="wp-header">
        <div>
          <span class="wp-eyebrow">抵御心魔</span>
          <h1>{{ greeting }}，{{ displayName }}</h1>
          <p>每一次守得住，都是一次微小的胜利。</p>
        </div>
      </header>

      <WpNav />

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <!-- 快速记录 / 计时挑战 -->
      <div class="wp-card">
        <div class="wp-card-head">
          <div>
            <h2>又来了一个？</h2>
            <p>选中心魔，记一笔结果，或开启一段计时挑战。</p>
          </div>
        </div>

        <p class="wp-section-title">选择心魔</p>
        <div class="wp-demon-grid">
          <button
            v-for="d in activeDemons"
            :key="d.demonKey"
            type="button"
            class="wp-demon-btn"
            :class="{ selected: d.demonKey === form.demonKey }"
            @click="form.demonKey = d.demonKey"
          >
            <span class="wp-demon-emoji">{{ d.emoji }}</span>
            <span class="wp-demon-name">{{ d.name }}</span>
          </button>
          <p v-if="!activeDemons.length" class="wp-empty">还没有可选的心魔，去个人中心添加。</p>
        </div>

        <div class="wp-form-row">
          <div class="wp-field">
            <label for="wp-note">备注（可选）</label>
            <input id="wp-note" v-model="form.note" type="text" maxlength="200" placeholder="比如：深夜刷手机时" />
          </div>
          <div class="wp-field">
            <label for="wp-hold">计时挑战时长（分钟）</label>
            <input id="wp-hold" v-model.number="holdMinutes" type="number" min="1" max="720" />
          </div>
        </div>

        <div class="wp-actions">
          <button class="wp-btn primary" type="button" :disabled="!form.demonKey || busy" @click="quickResist">
            记录已抵御 ✓
          </button>
          <button class="wp-btn ghost" type="button" :disabled="!form.demonKey || busy" @click="startTimer">
            ⏱ 开始计时挑战
          </button>
          <button class="wp-btn danger" type="button" :disabled="!form.demonKey || busy" @click="quickFail">
            如实记录破防 ✗
          </button>
        </div>
        <p class="wp-hint">破防也要记——成功率、失手扳回类成就都靠它算，骗自己没有意义。</p>
      </div>

      <!-- 进行中的计时挑战 -->
      <div v-if="pending.length" class="wp-card">
        <div class="wp-card-head">
          <div>
            <h2>进行中的挑战</h2>
            <p>坚持满时长自动判定成功；也可手动结算。</p>
          </div>
        </div>
        <div class="wp-record-list">
          <div v-for="p in pending" :key="p.id" class="wp-challenge">
            <span class="wp-challenge-emoji">{{ demonOf(p.demonKey).emoji }}</span>
            <div class="wp-challenge-meta">
              <strong>{{ demonOf(p.demonKey).name }}</strong>
              <span>已坚持 {{ elapsed(p) }} · 目标 {{ Math.round(p.durationSec / 60) }} 分钟</span>
            </div>
            <div class="wp-countdown">{{ countdownText(p) }}</div>
            <div class="wp-challenge-actions">
              <button class="wp-btn primary small" type="button" @click="resolve(p.id, 'success')">扛住了</button>
              <button class="wp-btn danger small" type="button" @click="resolve(p.id, 'failed')">破防了</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 概览统计 -->
      <div class="wp-stat-grid">
        <div class="wp-stat">
          <strong>{{ overview.todayCount }}</strong>
          <span>今日抵御</span>
        </div>
        <div class="wp-stat">
          <strong>{{ overview.todayFailCount }}</strong>
          <span>今日破防</span>
        </div>
        <div class="wp-stat">
          <strong>{{ overview.currentStreak }}</strong>
          <span>当前连胜（天）</span>
        </div>
        <div class="wp-stat">
          <strong>{{ overview.successRate }}%</strong>
          <span>成功率</span>
        </div>
      </div>

      <!-- 最近记录 -->
      <div class="wp-card" style="margin-top: 18px">
        <div class="wp-card-head">
          <div>
            <h2>最近记录</h2>
            <p>最新 10 条，成功与破防都在这里。</p>
          </div>
          <RouterLink class="wp-btn ghost small" to="/willpower/calendar">按天回看 →</RouterLink>
        </div>
        <div v-if="recent.length" class="wp-record-list">
          <div v-for="r in recent" :key="r.id" class="wp-record" :class="{ 'is-failed': r.status === 'failed' }">
            <template v-if="editingId !== r.id">
              <span class="wp-record-emoji">{{ demonOf(r.demonKey).emoji }}</span>
              <div class="wp-record-main">
                <strong>{{ demonOf(r.demonKey).name }}</strong>
                <span>{{ r.mode === 'timer' ? '计时挑战' : '快速记录' }}<template v-if="r.note"> · {{ r.note }}</template></span>
              </div>
              <span class="wp-status" :class="r.status">{{ statusLabel(r.status) }}</span>
              <span class="wp-record-time">{{ fmt(r.startedAt) }}</span>
              <div class="wp-record-actions">
                <button class="wp-record-edit" type="button" title="编辑" @click="startEdit(r)">✎</button>
                <button class="wp-record-del" type="button" title="删除" @click="removeRecord(r.id)">✕</button>
              </div>
            </template>
            <div v-else class="wp-record-edit-form">
              <div class="wp-form-row">
                <div class="wp-field">
                  <label>心魔</label>
                  <select v-model="editForm.demonKey">
                    <option v-for="d in demons" :key="d.demonKey" :value="d.demonKey">{{ d.emoji }} {{ d.name }}</option>
                  </select>
                </div>
                <div class="wp-field">
                  <label>结果</label>
                  <select v-model="editForm.status">
                    <option value="success">扛住</option>
                    <option value="failed">破防</option>
                  </select>
                </div>
                <div class="wp-field">
                  <label>时间</label>
                  <input type="datetime-local" v-model="editForm.startedAt" />
                </div>
              </div>
              <div class="wp-field">
                <label>备注</label>
                <input v-model="editForm.note" type="text" maxlength="200" placeholder="比如：深夜刷手机时" />
              </div>
              <div class="wp-actions">
                <button class="wp-btn primary small" type="button" :disabled="editBusy" @click="saveEdit(r.id)">保存</button>
                <button class="wp-btn ghost small" type="button" @click="cancelEdit">取消</button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="wp-empty">还没有记录，先从上面记一笔吧。</p>
      </div>
    </div>

    <WpToastHost />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import willpowerApi from '../api/willpower.js'
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'
import { useToast } from '../composables/useToast.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'

const router = useRouter()
const { user, init } = useWillpowerAuth()
const { push: toast } = useToast()

const demons = ref([])
const overview = ref({
  todayCount: 0,
  todayFailCount: 0,
  currentStreak: 0,
  totalSuccess: 0,
  totalFail: 0,
  weekCount: 0,
  successRate: 0,
  longestStreak: 0,
  totalHeldMinutes: 0,
  activeDays: 0,
  byDay: [],
  byDemon: [],
  byHour: []
})
const achievementSummary = ref({ total: 0, unlocked: 0, points: 0 })
const pending = ref([])
const recent = ref([])
const weekPositiveCount = ref(0)
const busy = ref(false)
const loadError = ref('')

// 内联编辑状态
const editingId = ref(null)
const editBusy = ref(false)
const editForm = reactive({ demonKey: '', status: 'success', note: '', startedAt: '' })

const form = reactive({ demonKey: '', note: '' })
const holdMinutes = ref(10)
const displayName = ref('')
const greeting = ref('')

const activeDemons = computed(() => demons.value.filter((d) => !d.archived))

function demonMap() {
  const map = new Map()
  for (const d of demons.value) map.set(d.demonKey, d)
  return map
}
function demonOf(key) {
  return demonMap().get(key) || { emoji: '👹', name: key }
}

function statusLabel(status) {
  if (status === 'success') return '扛住'
  if (status === 'failed') return '破防'
  return '进行中'
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function nowMs() {
  return Date.now()
}
function dueAtMs(p) {
  return new Date(p.startedAt).getTime() + Number(p.durationSec || 0) * 1000
}
function elapsed(p) {
  const sec = Math.max(0, Math.floor((nowMs() - new Date(p.startedAt).getTime()) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}分${String(s).padStart(2, '0')}秒`
}
function countdownText(p) {
  const remain = Math.max(0, Math.floor((dueAtMs(p) - nowMs()) / 1000))
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

let timer = null
const settled = new Set()
function tick() {
  for (const p of pending.value) {
    if (dueAtMs(p) <= nowMs() && !settled.has(p.id)) {
      settled.add(p.id)
      // 后端在读接口会自动结算，这里重拉一次即可
      refreshOverview().catch(() => {})
    }
  }
}

async function loadAll() {
  const [demonRes, ov, pos] = await Promise.all([
    willpowerApi.listDemons(),
    willpowerApi.overview(),
    willpowerApi.listPositives()
  ])
  demons.value = demonRes.demons || []
  applyOverview(ov)
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000
  weekPositiveCount.value = (pos.positives || []).filter(
    (p) => new Date(p.happenedAt).getTime() >= cutoff
  ).length
  if (!form.demonKey && activeDemons.value.length) form.demonKey = activeDemons.value[0].demonKey
}

function applyOverview(ov) {
  overview.value = { ...overview.value, ...ov.overview }
  pending.value = ov.pending || []
  recent.value = ov.recent || []
  if (ov.achievementSummary) achievementSummary.value = ov.achievementSummary
}

async function refreshOverview() {
  const ov = await willpowerApi.overview()
  applyOverview(ov)
}

function announceUnlocks(list) {
  if (!list || !list.length) return
  for (const a of list) toast(`🏆 解锁成就：${a.name}（+${a.points} 分）`, { type: 'success' })
}

async function submitQuick(result) {
  if (!form.demonKey) return
  busy.value = true
  try {
    const res = await willpowerApi.createResistance({
      demonKey: form.demonKey,
      mode: 'quick',
      result,
      note: form.note.trim()
    })
    form.note = ''
    announceUnlocks(res.newlyUnlocked)
    toast(result === 'failed' ? '已记录一次破防，明天扳回来' : '已记录一次抵御 ✓', {
      type: result === 'failed' ? 'info' : 'success'
    })
    await refreshOverview()
  } catch (err) {
    toast(err.message || '记录失败', { type: 'error' })
  } finally {
    busy.value = false
  }
}

function quickResist() {
  return submitQuick('success')
}

function quickFail() {
  return submitQuick('failed')
}

async function startTimer() {
  if (!form.demonKey) return
  busy.value = true
  try {
    const res = await willpowerApi.createResistance({
      demonKey: form.demonKey,
      mode: 'timer',
      durationSec: Math.max(1, Number(holdMinutes.value) || 10) * 60,
      note: form.note.trim()
    })
    form.note = ''
    announceUnlocks(res.newlyUnlocked)
    toast('计时挑战已开启，坚持住！', { type: 'success' })
    await refreshOverview()
  } catch (err) {
    toast(err.message || '开启失败', { type: 'error' })
  } finally {
    busy.value = false
  }
}

async function resolve(id, result) {
  busy.value = true
  try {
    const res = await willpowerApi.resolveResistance(id, result)
    announceUnlocks(res.newlyUnlocked)
    toast(result === 'success' ? '这一关，扛住了！' : '已记录一次破防', {
      type: result === 'success' ? 'success' : 'info'
    })
    await refreshOverview()
  } catch (err) {
    toast(err.message || '结算失败', { type: 'error' })
  } finally {
    busy.value = false
  }
}

async function removeRecord(id) {
  try {
    await willpowerApi.deleteResistance(id)
    await refreshOverview()
  } catch (err) {
    toast(err.message || '删除失败', { type: 'error' })
  }
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function startEdit(r) {
  editingId.value = r.id
  editForm.demonKey = r.demonKey
  editForm.status = r.status
  editForm.note = r.note || ''
  editForm.startedAt = toLocalInput(r.startedAt)
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id) {
  editBusy.value = true
  try {
    await willpowerApi.updateResistance(id, {
      demonKey: editForm.demonKey,
      status: editForm.status,
      note: editForm.note.trim(),
      startedAt: new Date(editForm.startedAt).toISOString()
    })
    toast('记录已更新', { type: 'success' })
    editingId.value = null
    await refreshOverview()
  } catch (err) {
    toast(err.message || '更新失败', { type: 'error' })
  } finally {
    editBusy.value = false
  }
}

function setGreeting() {
  const h = new Date().getHours()
  greeting.value = h < 6 ? '夜深了' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好'
}

onMounted(async () => {
  setGreeting()
  await init()
  if (!user.value) {
    router.replace('/willpower/login')
    return
  }
  displayName.value = user.value.displayName || user.value.username
  try {
    await loadAll()
  } catch (err) {
    loadError.value = err.message || '数据加载失败'
  }
  timer = setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
