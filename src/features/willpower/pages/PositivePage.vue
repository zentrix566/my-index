<template>
  <section class="wp-page">
    <div class="wp-container">
      <header class="wp-header">
        <div>
          <span class="wp-eyebrow">抵御心魔</span>
          <h1>今日正能量</h1>
          <p>跑步、阅读、早睡……把好状态也记下来，和「守住」一样重要。</p>
        </div>
        <RouterLink class="wp-btn ghost" to="/willpower">回到今日心魔</RouterLink>
      </header>

      <WpNav />

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <!-- 记一笔（放在首位：先记录，再回看） -->
      <div class="wp-card">
        <div class="wp-card-head">
          <div>
            <h2>记一笔</h2>
            <p>选个项目，填数量，顺手记一句。</p>
          </div>
        </div>
        <form class="wp-form-row" @submit.prevent="addPositive">
          <div class="wp-field">
            <label for="pos-act">项目</label>
            <select id="pos-act" v-model="positive.activityKey" @change="onActivityChange">
              <option v-for="a in activities" :key="a.activityKey" :value="a.activityKey">
                {{ a.emoji }} {{ a.name }}<template v-if="a.inputMode === 'duration'">（小时/分）</template>
              </option>
            </select>
          </div>

          <!-- 计数型：只填数字，单位固定 -->
          <div v-if="currentInputMode === 'count'" class="wp-field">
            <label for="pos-amt">数量（{{ currentUnit || '次' }}）</label>
            <input id="pos-amt" v-model.number="positive.amount" type="number" min="0" max="100000" />
          </div>

          <!-- 时长型：小时 + 分钟两段，单位固定 -->
          <template v-else>
            <div class="wp-field">
              <label for="pos-h">小时</label>
              <input id="pos-h" v-model.number="posHours" type="number" min="0" max="1000" @input="syncDuration" />
            </div>
            <div class="wp-field">
              <label for="pos-m">分钟</label>
              <input id="pos-m" v-model.number="posMinutes" type="number" min="0" max="59" @input="syncDuration" />
            </div>
          </template>

          <div class="wp-field">
            <label for="pos-note">备注（可选）</label>
            <input id="pos-note" v-model="positive.note" type="text" maxlength="200" />
          </div>
          <div class="wp-field" style="align-self: end">
            <button class="wp-btn primary" type="submit" :disabled="posBusy">添加</button>
          </div>
        </form>
        <p v-if="posErr" class="wp-error" style="margin-top: 10px">{{ posErr }}</p>
      </div>

      <!-- 本周概览 -->
      <div class="wp-stat-grid">
        <div class="wp-stat">
          <strong>{{ weekCount }}</strong>
          <span>本周正能量记录</span>
        </div>
        <div class="wp-stat">
          <strong>{{ positives.length }}</strong>
          <span>累计正能量记录</span>
        </div>
        <div class="wp-stat">
          <strong>{{ activityCount }}</strong>
          <span>涉及项目</span>
        </div>
      </div>

      <!-- 列表 -->
      <div class="wp-card" style="margin-top: 18px">
        <div class="wp-card-head">
          <div>
            <h2>全部正能量记录</h2>
            <p>最近 200 条，最新的在最上面。</p>
          </div>
        </div>
        <div v-if="positives.length" class="wp-record-list">
          <div v-for="p in positives" :key="p.id" class="wp-record">
            <template v-if="editId !== p.id">
              <span class="wp-record-emoji">{{ activityEmoji(p.activityKey) }}</span>
              <div class="wp-record-main">
                <strong>{{ p.name }}<template v-if="p.amount"> · {{ formatAmount(p) }}</template></strong>
                <span>{{ p.note || fmt(p.happenedAt) }}</span>
              </div>
              <span class="wp-record-time">{{ fmt(p.happenedAt) }}</span>
              <div class="wp-record-actions">
                <button class="wp-record-edit" type="button" title="编辑" @click="startEdit(p)">✎</button>
                <button class="wp-record-del" type="button" title="删除" @click="removePositive(p.id)">✕</button>
              </div>
            </template>
            <div v-else class="wp-record-edit-form">
              <div class="wp-form-row">
                <div class="wp-field">
                  <label>项目</label>
                  <select v-model="editForm.activityKey" @change="onEditActivityChange">
                    <option v-for="a in activities" :key="a.activityKey" :value="a.activityKey">
                      {{ a.emoji }} {{ a.name }}<template v-if="a.inputMode === 'duration'">（小时/分）</template>
                    </option>
                  </select>
                </div>
                <template v-if="editInputMode === 'count'">
                  <div class="wp-field">
                    <label>数量（{{ editUnit || '次' }}）</label>
                    <input v-model.number="editForm.amount" type="number" min="0" max="100000" />
                  </div>
                </template>
                <template v-else>
                  <div class="wp-field">
                    <label>小时</label>
                    <input v-model.number="editHours" type="number" min="0" max="1000" @input="syncEditDuration" />
                  </div>
                  <div class="wp-field">
                    <label>分钟</label>
                    <input v-model.number="editMinutes" type="number" min="0" max="59" @input="syncEditDuration" />
                  </div>
                </template>
                <div class="wp-field">
                  <label>时间</label>
                  <input type="datetime-local" v-model="editForm.happenedAt" />
                </div>
              </div>
              <div class="wp-field">
                <label>备注</label>
                <input v-model="editForm.note" type="text" maxlength="200" />
              </div>
              <div class="wp-actions">
                <button class="wp-btn primary small" type="button" :disabled="editBusy" @click="saveEdit(p.id)">保存</button>
                <button class="wp-btn ghost small" type="button" @click="cancelEdit">取消</button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="wp-empty">还没有正能量记录，先从上面记一笔吧。</p>
      </div>
    </div>

    <WpToastHost />
    <WpBattleFx ref="battleFx" />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import willpowerApi from '../api/willpower.js'
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'
import { useToast } from '../composables/useToast.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'
import WpBattleFx from '../components/WpBattleFx.vue'
import { formatBeijing, toBeijingInput, fromBeijingInput } from '../utils/time.js'

const router = useRouter()
const { user, init } = useWillpowerAuth()
const { push: toast } = useToast()
const battleFx = ref(null)

const activities = ref([])
const positives = ref([])
const posBusy = ref(false)
const posErr = ref('')
const loadError = ref('')
const positive = reactive({ activityKey: '', amount: 1, note: '' })
const posHours = ref(0)
const posMinutes = ref(30)

// 内联编辑状态
const editId = ref(null)
const editBusy = ref(false)
const editForm = reactive({ activityKey: '', amount: 1, note: '', happenedAt: '' })
const editHours = ref(0)
const editMinutes = ref(30)

const currentActivity = computed(() => activities.value.find((a) => a.activityKey === positive.activityKey) || null)
const currentInputMode = computed(() => currentActivity.value?.inputMode || 'count')
const currentUnit = computed(() => currentActivity.value?.unit || '')

const editActivity = computed(() => activities.value.find((a) => a.activityKey === editForm.activityKey) || null)
const editInputMode = computed(() => editActivity.value?.inputMode || 'count')
const editUnit = computed(() => editActivity.value?.unit || '')

const unitHint = computed(() => currentUnit.value || '')

const weekCount = computed(() => {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000
  return positives.value.filter((p) => new Date(p.happenedAt).getTime() >= cutoff).length
})

const activityCount = computed(() => new Set(positives.value.map((p) => p.activityKey)).size)

function onActivityChange() {
  // 切换类型时重置输入：时长型默认 0 小时 30 分
  if (currentInputMode.value === 'duration') {
    posHours.value = 0
    posMinutes.value = 30
    positive.amount = 30
  } else {
    positive.amount = 1
  }
}

function syncDuration() {
  positive.amount = (Number(posHours.value) || 0) * 60 + (Number(posMinutes.value) || 0)
}

function fmt(iso) {
  return formatBeijing(iso)
}

function activityEmoji(key) {
  return activities.value.find((a) => a.activityKey === key)?.emoji || '✅'
}

function formatAmount(p) {
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

async function loadAll() {
  const [cat, pos] = await Promise.all([willpowerApi.listActivities(), willpowerApi.listPositives()])
  activities.value = cat.activities || []
  if (!positive.activityKey && activities.value.length) positive.activityKey = activities.value[0].activityKey
  positives.value = (pos.positives || []).slice().sort((a, b) => (a.happenedAt < b.happenedAt ? 1 : -1))
  if (currentInputMode.value === 'duration') {
    posHours.value = 0
    posMinutes.value = 30
    positive.amount = 30
  }
}

async function addPositive() {
  if (!positive.activityKey) return
  posErr.value = ''
  if (currentInputMode.value === 'duration' && !Number(positive.amount)) {
    posErr.value = '请填写时长'
    return
  }
  posBusy.value = true
  try {
    const activity = activities.value.find((a) => a.activityKey === positive.activityKey)
    const res = await willpowerApi.createPositive({
      activityKey: positive.activityKey,
      name: activity?.name,
      amount: Number(positive.amount) || 0,
      unit: currentInputMode.value === 'count' ? currentUnit.value : '',
      note: positive.note.trim()
    })
    positive.note = ''
    toast('正能量记录已添加 ✓', { type: 'success' })
    if (battleFx.value) battleFx.value.play('win', '正能量 +1 🌟')
    await loadAll()
    if (res.newlyUnlocked?.length) {
      for (const a of res.newlyUnlocked) toast(`🏆 解锁成就：${a.name}`, { type: 'success' })
    }
  } catch (err) {
    posErr.value = err.message || '添加失败'
  } finally {
    posBusy.value = false
  }
}

async function removePositive(id) {
  try {
    await willpowerApi.deletePositive(id)
    await loadAll()
  } catch (err) {
    toast(err.message || '删除失败', { type: 'error' })
  }
}

function toLocalInput(iso) {
  return toBeijingInput(iso)
}

function startEdit(p) {
  editId.value = p.id
  editForm.activityKey = p.activityKey
  editForm.amount = Number(p.amount) || 0
  editForm.note = p.note || ''
  editForm.happenedAt = toLocalInput(p.happenedAt)
  if (p.inputMode === 'duration') {
    const total = Number(p.amount) || 0
    editHours.value = Math.floor(total / 60)
    editMinutes.value = total % 60
  } else {
    editHours.value = 0
    editMinutes.value = 30
  }
}

function onEditActivityChange() {
  if (editInputMode.value === 'duration') {
    editHours.value = 0
    editMinutes.value = 30
    editForm.amount = 30
  } else {
    editForm.amount = 1
  }
}

function syncEditDuration() {
  editForm.amount = (Number(editHours.value) || 0) * 60 + (Number(editMinutes.value) || 0)
}

function cancelEdit() {
  editId.value = null
}

async function saveEdit(id) {
  editBusy.value = true
  try {
    const activity = activities.value.find((a) => a.activityKey === editForm.activityKey)
    await willpowerApi.updatePositive(id, {
      activityKey: editForm.activityKey,
      amount: Number(editForm.amount) || 0,
      note: editForm.note.trim(),
      happenedAt: fromBeijingInput(editForm.happenedAt)
    })
    toast('记录已更新', { type: 'success' })
    editId.value = null
    await loadAll()
    if (activity && activity.name) {
      // 项目名变更由后端回填，无需前端额外处理
    }
  } catch (err) {
    toast(err.message || '更新失败', { type: 'error' })
  } finally {
    editBusy.value = false
  }
}

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/willpower/login')
    return
  }
  try {
    await loadAll()
  } catch (err) {
    loadError.value = err.message || '数据加载失败'
  }
})
</script>
