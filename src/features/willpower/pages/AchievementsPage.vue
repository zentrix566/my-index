<template>
  <section class="wp-page">
    <div class="wp-container">
      <header class="wp-header">
        <div>
          <span class="wp-eyebrow">抵御心魔</span>
          <h1>成就殿堂</h1>
          <p>每一次自律，都被悄悄记成了勋章。</p>
        </div>
        <button class="wp-btn ghost" type="button" @click="logout">退出登录</button>
      </header>

      <WpNav />

      <p v-if="loadError" class="wp-error">{{ loadError }}</p>

      <div class="wp-stat-grid" style="margin-bottom: 18px">
        <div class="wp-stat"><strong>{{ summary.unlocked }}</strong><span>已解锁</span></div>
        <div class="wp-stat"><strong>{{ summary.total }}</strong><span>成就总数</span></div>
        <div class="wp-stat"><strong>{{ summary.points }}</strong><span class="wp-stat-sub">累计积分</span></div>
        <div class="wp-stat"><strong>{{ summary.hiddenLocked }}</strong><span class="wp-stat-sub">未现身的隐藏成就</span></div>
      </div>

      <div class="wp-card">
        <div class="wp-card-head">
          <div><h2>已点亮</h2><p>你已经解锁的成就。</p></div>
        </div>
        <div v-if="unlocked.length" class="wp-ach-grid">
          <div v-for="a in unlocked" :key="a.code" class="wp-ach unlocked">
            <div class="wp-ach-top">
              <div class="wp-ach-icon">🏆</div>
              <div>
                <h3>{{ a.name }}</h3>
                <span class="wp-ach-tier" :class="`tier-${a.tier}`">{{ a.tier }}</span>
              </div>
            </div>
            <p>{{ a.description }}</p>
            <div class="wp-ach-foot">
              <span class="wp-ach-points">+{{ a.points }} 分</span>
              <span v-if="a.custom" class="wp-record-del" role="button" @click="removeAch(a.code)">删除</span>
            </div>
          </div>
        </div>
        <p v-else class="wp-empty">还没有解锁任何成就，去今日页记一笔吧。</p>
      </div>

      <div class="wp-card">
        <div class="wp-card-head">
          <div><h2>征途未尽</h2><p>尚未达成的可见成就与进度。</p></div>
        </div>
        <div v-if="visibleLocked.length" class="wp-ach-grid">
          <div v-for="a in visibleLocked" :key="a.code" class="wp-ach locked">
            <div class="wp-ach-top">
              <div class="wp-ach-icon">🔒</div>
              <div>
                <h3>{{ a.name }}</h3>
                <span class="wp-ach-tier" :class="`tier-${a.tier}`">{{ a.tier }}</span>
              </div>
            </div>
            <p>{{ a.description }}</p>
            <div class="wp-progress"><i :style="{ width: pct(a) }"></i></div>
            <div class="wp-ach-foot">
              <span class="wp-ach-points">{{ a.progress }}/{{ a.target }} {{ a.unit }}</span>
              <span v-if="a.custom" class="wp-record-del" role="button" @click="removeAch(a.code)">删除</span>
            </div>
          </div>
        </div>
        <p v-else class="wp-empty">可见成就已全部点亮。</p>
      </div>

      <div class="wp-card">
        <div class="wp-card-head">
          <div><h2>隐藏成就</h2><p>达成特定条件后才会现身，现在只有若隐若现的提示。</p></div>
        </div>
        <div v-if="hiddenLocked.length" class="wp-ach-grid">
          <div v-for="a in hiddenLocked" :key="a.code" class="wp-ach hidden-locked">
            <div class="wp-ach-top">
              <div class="wp-ach-icon">❓</div>
              <div>
                <h3>{{ a.name }}</h3>
                <span class="wp-ach-tier tier-隐藏">隐藏</span>
              </div>
            </div>
            <p class="wp-hidden-hint">{{ a.description || a.hint }}</p>
            <div class="wp-ach-foot">
              <span class="wp-ach-points">+{{ a.points }} 分</span>
            </div>
          </div>
        </div>
        <p v-else class="wp-empty">没有未现身的隐藏成就。</p>
      </div>

      <!-- 自定义成就 -->
      <div class="wp-card">
        <div class="wp-card-head">
          <div><h2>自定义成就</h2><p>给自己设一个专属目标，比如「抵御奶茶魔 100 次」。</p></div>
          <button class="wp-btn primary small" type="button" @click="showForm = !showForm">
            {{ showForm ? '收起' : '+ 新建' }}
          </button>
        </div>

        <form v-if="showForm" class="wp-form" @submit.prevent="createAch">
          <div class="wp-field">
            <label for="ach-name">成就名称</label>
            <input id="ach-name" v-model="ach.name" type="text" maxlength="20" placeholder="如：百战奶茶魔" />
          </div>
          <div class="wp-field">
            <label for="ach-desc">描述（可选）</label>
            <input id="ach-desc" v-model="ach.description" type="text" maxlength="100" placeholder="达成后显示的文字" />
          </div>
          <div class="wp-form-row">
            <div class="wp-field">
              <label for="ach-type">规则类型</label>
              <select id="ach-type" v-model="ach.rule.type">
                <option v-for="t in ruleTypes" :key="t.type" :value="t.type">{{ t.label }}</option>
              </select>
            </div>
            <div class="wp-field">
              <label for="ach-target">目标数值（{{ currentRuleUnit }}）</label>
              <input id="ach-target" v-model.number="ach.rule.target" type="number" min="1" max="100000" />
            </div>
            <div class="wp-field">
              <label for="ach-points">积分</label>
              <input id="ach-points" v-model.number="ach.points" type="number" min="1" max="200" />
            </div>
          </div>

          <div v-if="ruleNeedsDemon" class="wp-form-row">
            <div class="wp-field">
              <label for="ach-demon">针对心魔</label>
              <select id="ach-demon" v-model="ach.rule.demonKey">
                <option value="*">任意心魔</option>
                <option v-for="d in allDemons" :key="d.demonKey" :value="d.demonKey">{{ d.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="ach.rule.type === 'time_window'" class="wp-form-row">
            <div class="wp-field">
              <label for="ach-from">起始小时（0-23）</label>
              <input id="ach-from" v-model.number="ach.rule.hourFrom" type="number" min="0" max="23" />
            </div>
            <div class="wp-field">
              <label for="ach-to">结束小时（1-24）</label>
              <input id="ach-to" v-model.number="ach.rule.hourTo" type="number" min="1" max="24" />
            </div>
          </div>

          <div v-if="ruleNeedsActivity" class="wp-form-row">
            <div class="wp-field">
              <label for="ach-act">针对正向项目</label>
              <select id="ach-act" v-model="ach.rule.activityKey">
                <option value="*">任意项目</option>
                <option v-for="a in activities" :key="a.activityKey" :value="a.activityKey">{{ a.name }}</option>
              </select>
            </div>
          </div>

          <label class="wp-field" style="flex-direction: row; align-items: center; gap: 8px">
            <input type="checkbox" v-model="ach.hidden" style="width: auto" /> 设为隐藏成就
          </label>

          <p v-if="achError" class="wp-error">{{ achError }}</p>

          <div class="wp-actions">
            <button class="wp-btn primary" type="submit" :disabled="achBusy">创建成就</button>
          </div>
        </form>
      </div>
    </div>

    <WpToastHost />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import willpowerApi from '../api/willpower.js'
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'
import { useToast } from '../composables/useToast.js'
import WpToastHost from '../components/WpToastHost.vue'
import WpNav from '../components/WpNav.vue'

const router = useRouter()
const { user, init, logout: doLogout } = useWillpowerAuth()
const { push: toast } = useToast()

const achievements = ref([])
const summary = ref({ total: 0, unlocked: 0, points: 0, hiddenLocked: 0 })
const ruleTypes = ref([])
const allDemons = ref([])
const activities = ref([])
const loadError = ref('')

const showForm = ref(false)
const achBusy = ref(false)
const achError = ref('')
const ach = reactive({
  name: '',
  description: '',
  points: 10,
  hidden: false,
  rule: { type: 'resist_count', target: 10, demonKey: '*' }
})

const unlocked = computed(() => achievements.value.filter((a) => a.unlocked))
const visibleLocked = computed(() => achievements.value.filter((a) => !a.unlocked && !a.hidden))
const hiddenLocked = computed(() => achievements.value.filter((a) => a.hidden && !a.unlocked))

const ruleNeedsDemon = computed(() =>
  ['resist_count', 'time_window', 'single_day_count', 'resist_duration_minutes'].includes(ach.rule.type)
)
const ruleNeedsActivity = computed(() => ['positive_count', 'positive_amount'].includes(ach.rule.type))
const currentRuleUnit = computed(() => {
  const t = ruleTypes.value.find((r) => r.type === ach.rule.type)
  return t?.unit || ''
})

function pct(a) {
  if (!a.target) return '0%'
  return `${Math.min(100, Math.round((a.progress / a.target) * 100))}%`
}

async function loadAll() {
  const cat = await willpowerApi.catalog()
  ruleTypes.value = cat.ruleTypes || []
  allDemons.value = cat.demons || []
  activities.value = cat.activities || []
  await refreshAchievements()
}

async function refreshAchievements() {
  const res = await willpowerApi.listAchievements()
  achievements.value = res.achievements || []
  summary.value = res.summary || summary.value
}

async function removeAch(code) {
  try {
    await willpowerApi.deleteAchievement(code)
    toast('已删除自定义成就', { type: 'info' })
    await refreshAchievements()
  } catch (err) {
    toast(err.message || '删除失败', { type: 'error' })
  }
}

async function createAch() {
  achError.value = ''
  if (!ach.name.trim()) {
    achError.value = '请填写成就名称'
    return
  }
  const payload = {
    name: ach.name.trim(),
    description: ach.description.trim(),
    points: Number(ach.points) || 10,
    hidden: Boolean(ach.hidden),
    rule: {
      type: ach.rule.type,
      target: Number(ach.rule.target) || 1,
      ...(ruleNeedsDemon.value ? { demonKey: ach.rule.demonKey || '*' } : {}),
      ...(ruleNeedsActivity.value ? { activityKey: ach.rule.activityKey || '*' } : {}),
      ...(ach.rule.type === 'time_window'
        ? { hourFrom: Number(ach.rule.hourFrom) || 0, hourTo: Number(ach.rule.hourTo) || 24 }
        : {})
    }
  }
  achBusy.value = true
  try {
    await willpowerApi.createAchievement(payload)
    toast('自定义成就已创建', { type: 'success' })
    showForm.value = false
    ach.name = ''
    ach.description = ''
    await refreshAchievements()
  } catch (err) {
    achError.value = err.message || '创建失败'
  } finally {
    achBusy.value = false
  }
}

async function logout() {
  await doLogout()
  router.replace('/willpower/login')
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
