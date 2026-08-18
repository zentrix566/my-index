<template>
  <main class="world-page">
    <header class="world-header">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <label class="history-picker">
        <span>历史</span>
        <select v-model="scope" @change="switchScope">
          <option value="中国">中国历史</option>
          <option value="">国外（全部）</option>
          <option v-for="item in regions" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <div class="title-row">
        <div>
          <p class="eyebrow">资料来源：你的「国外.md」</p>
          <h1>历史 · {{ region === '全部' ? '国外' : region }}</h1>
          <p class="intro">从古典地中海到近现代，以人物出生年份为定位；可自行补充人物并保存在本机。</p>
        </div>
        <button class="add-button" @click="formOpen = !formOpen" :aria-expanded="formOpen">
          {{ formOpen ? '收起添加' : '添加人物' }}
        </button>
      </div>

      <form v-if="formOpen" class="add-form" @submit.prevent="addPerson">
        <label>姓名<input v-model.trim="draft.name" required maxlength="40" /></label>
        <label>年份<input v-model.number="draft.year" required type="number" min="-5000" max="3000" placeholder="如：-356 或 1912" /></label>
        <label>地区 / 国家<input v-model.trim="draft.region" required maxlength="30" placeholder="如：古希腊" /></label>
        <label>生卒<input v-model.trim="draft.life" maxlength="60" placeholder="如：前356年—前323年" /></label>
        <label class="note-field">简评<textarea v-model.trim="draft.note" maxlength="160" rows="2" placeholder="这位人物的简短说明"></textarea></label>
        <button class="submit-button" type="submit">保存到本机</button>
        <p v-if="formMessage" class="form-message" role="status">{{ formMessage }}</p>
      </form>

      <div class="filters" role="group" aria-label="按地区筛选">
        <button :class="{ on: region === '全部' }" @click="region = '全部'">全部 {{ allItems.length }}</button>
        <button v-for="item in regions" :key="item" :class="{ on: region === item }" @click="region = item">{{ item }}</button>
      </div>
    </header>

    <section class="timeline" aria-label="国外历史人物时间轴">
      <div class="timeline-axis" aria-hidden="true"></div>
      <article v-for="(person, index) in visibleItems" :key="person.id" class="timeline-item" :class="[{ leader: person.leader, event: person.kind === 'event' }, index % 2 ? 'right' : 'left']">
        <div class="year"><span>{{ formatYear(person.year) }}</span><i></i></div>
        <button class="person-card" @click="selected = person">
          <span class="person-region">{{ person.region }}</span>
          <strong>{{ person.name }}</strong>
          <span v-if="person.kind === 'event'" class="person-role">历史事件</span>
          <span v-else-if="person.leader" class="person-role">领导人 · {{ person.role }}</span>
          <span v-else-if="person.role" class="person-role">{{ person.role }}</span>
          <span v-if="person.life" class="person-life">生卒 {{ person.life }}<template v-if="person.age"> · 享年{{ person.age }}岁</template></span>
          <span v-if="person.custom" class="custom-tag">自添</span>
        </button>
      </article>
      <p v-if="visibleItems.length === 0" class="empty">当前地区还没有人物。</p>
    </section>

    <div v-if="selected" class="detail-backdrop" @click="selected = null"></div>
    <aside v-if="selected" class="detail">
      <button class="close" aria-label="关闭详情" @click="selected = null">×</button>
      <p class="detail-region">{{ selected.region }} · {{ formatYear(selected.year) }}</p>
      <h2>{{ selected.name }}</h2>
      <p v-if="selected.role" class="detail-role">{{ selected.role }}</p>
      <dl v-if="selected.life" class="detail-meta"><div><dt>生卒</dt><dd>{{ selected.life }}<template v-if="selected.age">（享年{{ selected.age }}岁）</template></dd></div></dl>
      <p class="detail-note">{{ selected.note || '未填写简评。' }}</p>
      <button v-if="selected.custom" class="delete-button" @click="removePerson(selected.id)">删除此自添人物</button>
    </aside>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { items } from '../data/worldHistory.json'

const STORAGE_KEY = 'world-history-timeline:custom-people'
const route = useRoute()
const router = useRouter()
const region = ref(typeof route.query.region === 'string' ? route.query.region : '全部')
const scope = ref(region.value === '全部' ? '' : region.value)
const selected = ref(null)
const formOpen = ref(false)
const formMessage = ref('')
const draft = ref({ name: '', year: '', region: '', life: '', note: '' })

function readCustomPeople() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.filter((item) => item?.id && item?.name && Number.isFinite(item?.year)) : []
  } catch {
    return []
  }
}

const customPeople = ref(readCustomPeople())
const allItems = computed(() => [...items, ...customPeople.value].map((p) => ({ ...p, age: lifeAge(p.life) })).sort((a, b) => a.year - b.year))
const regions = computed(() => [...new Set(allItems.value.map((item) => item.region))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const visibleItems = computed(() => region.value === '全部' ? allItems.value : allItems.value.filter((item) => item.region === region.value))

watch(region, (value) => {
  scope.value = value === '全部' ? '' : value
  router.replace({ query: value === '全部' ? {} : { region: value } })
})

watch(() => route.query.region, (value) => {
  const next = typeof value === 'string' && regions.value.includes(value) ? value : '全部'
  if (next !== region.value) region.value = next
})

function switchScope() {
  if (scope.value === '中国') {
    router.push('/history')
    return
  }
  region.value = scope.value || '全部'
}

function formatYear(year) {
  return year < 0 ? `前${Math.abs(year)}年` : `${year}年`
}

// 从“生卒”文本中解析出享年（粗略按年差计算）。兼容：前/公元、约、又作、同日多版本（用 / 分隔）、年份缺失（？）。
const LIFE_SEP = /[—–－~～-]/
function parseLifeYear(raw) {
  if (!raw) return null
  const text = String(raw).split('/')[0].trim()
  if (!text || text.includes('？')) return null
  let s = text
  if (s.includes('约')) s = s.replace(/约/g, '')
  let bce = false
  if (s.includes('公元前')) { bce = true; s = s.replace('公元前', '') }
  else if (s.includes('前')) { bce = true; s = s.replace('前', '') }
  else if (s.includes('公元')) { s = s.replace('公元', '') }
  const m = s.match(/(\d+)年/)
  if (!m) return null
  let year = parseInt(m[1], 10)
  if (bce) year = -year
  return year
}
function lifeAge(life) {
  if (!life) return null
  const parts = String(life).split(LIFE_SEP)
  if (parts.length < 2) return null
  const birth = parseLifeYear(parts[0])
  const death = parseLifeYear(parts[1])
  if (birth == null || death == null) return null
  const age = (birth < 0) !== (death < 0) ? Math.abs(birth) + Math.abs(death) - 1 : death - birth
  return age > 0 ? age : null
}

function saveCustomPeople() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customPeople.value))
}

function addPerson() {
  const year = Number(draft.value.year)
  if (!draft.value.name || !draft.value.region || !Number.isFinite(year)) {
    formMessage.value = '请填写姓名、年份和地区。'
    return
  }
  customPeople.value = [...customPeople.value, {
    id: `custom-${Date.now()}`,
    name: draft.value.name,
    year,
    region: draft.value.region,
    life: draft.value.life,
    note: draft.value.note,
    role: '自添人物',
    custom: true
  }]
  saveCustomPeople()
  formMessage.value = `已保存「${draft.value.name}」。`
  draft.value = { name: '', year: '', region: '', life: '', note: '' }
}

function removePerson(id) {
  customPeople.value = customPeople.value.filter((person) => person.id !== id)
  saveCustomPeople()
  selected.value = null
}
</script>

<style scoped>
.world-page { max-width: 1220px; margin: 0 auto; padding: 28px 20px 56px; }
.back { color: var(--color-primary); font-size: 14px; }
.history-picker { display: inline-flex; align-items: center; gap: 7px; margin-left: 14px; color: var(--color-primary); font-size: 13px; font-weight: 700; }
.history-picker select { max-width: 180px; border: 1px solid var(--color-border); border-radius: 7px; padding: 5px 8px; color: var(--color-text); background: var(--color-card); font: inherit; }
.title-row { display: flex; justify-content: space-between; gap: 24px; align-items: end; margin-top: 12px; }
.eyebrow { margin: 0 0 4px; color: var(--color-muted); font-size: 12px; }
h1 { margin: 0; font-size: 32px; letter-spacing: .04em; }
.intro { margin: 8px 0 0; color: var(--color-muted); }
.add-button, .submit-button, .delete-button { border: 0; border-radius: 9px; background: var(--color-primary); color: #fff; cursor: pointer; font-weight: 700; min-height: 42px; padding: 9px 16px; }
.add-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); }
.add-form label { display: grid; gap: 5px; color: var(--color-muted); font-size: 12px; font-weight: 700; }
.add-form input, .add-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--color-border); border-radius: 7px; padding: 8px; font: inherit; color: var(--color-text); background: var(--color-bg); }
.note-field { grid-column: span 2; }
.form-message { align-self: center; margin: 0; color: #247348; font-size: 13px; }
.filters { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 18px; }
.filters button { border: 1px solid var(--color-border); border-radius: 999px; min-height: 34px; padding: 5px 11px; background: var(--color-card); color: var(--color-text); cursor: pointer; }
.filters button.on { background: #2c3e68; color: #fff; border-color: #2c3e68; }
.timeline { position: relative; margin: 28px auto 0; padding: 12px 0; }
.timeline-axis { position: absolute; left: 50%; top: 0; bottom: 0; width: 3px; background: linear-gradient(#40679c, #a88647); transform: translateX(-50%); }
.timeline-item { position: relative; min-height: 108px; width: 50%; box-sizing: border-box; }
.timeline-item.left { padding: 0 84px 18px 24px; }
.timeline-item.right { padding: 0 24px 18px 84px; }
.timeline-item.left { margin-right: 50%; text-align: right; }
.timeline-item.right { margin-left: 50%; text-align: left; }
.timeline-item.left.leader .person-card { margin-left: auto; }
.timeline-item.right.leader .person-card { margin-right: auto; }
.timeline-item.left:not(.leader):not(.event) .person-card { margin-right: auto; }
.timeline-item.right:not(.leader):not(.event) .person-card { margin-left: auto; }
.timeline-item.event { width: 100%; margin: 0; padding: 0 50% 18px; min-height: 84px; text-align: center; }
.timeline-item.event .person-card { width: 220px; transform: translateX(-50%); border-style: dashed; border-color: #a88647; background: #fff9e8; text-align: center; }
.timeline-item.event .year { left: 50%; transform: translateX(-50%); top: -7px; }
.timeline-item.event .year i { display: none; }
.year { position: absolute; top: 17px; display: flex; align-items: center; gap: 8px; color: #655b48; font-size: 12px; font-weight: 800; white-space: nowrap; }
.left .year { right: -60px; width: 120px; justify-content: center; flex-direction: column; gap: 4px; }
.right .year { left: -60px; width: 120px; justify-content: center; flex-direction: column; gap: 4px; }
.year span { position: relative; z-index: 1; padding: 2px 5px; border-radius: 4px; background: var(--color-bg); }
.year i { width: 13px; height: 13px; border: 3px solid #fbf8f0; border-radius: 50%; background: #40679c; box-shadow: 0 0 0 2px #40679c; }
.person-card { position: relative; width: min(100%, 430px); padding: 13px 16px; border: 1px solid #9badca; border-radius: 12px; background: var(--color-card); color: var(--color-text); box-shadow: 0 4px 12px rgba(35, 48, 76, .08); cursor: pointer; text-align: left; }
.left .person-card { text-align: right; }
.person-card strong, .person-card span { display: block; }
.person-card strong { font-size: 17px; }
.person-region { color: #335787; font-size: 11px; font-weight: 800; }
.person-role { margin-top: 2px; color: var(--color-muted); font-size: 12px; }
.person-life { margin-top: 6px; color: #655b48; font-size: 12px; }
.custom-tag { position: absolute; top: 10px; right: 10px; padding: 2px 5px; border-radius: 5px; background: #e2eefc; color: #245785; font-size: 10px; }
.empty { position: relative; text-align: center; color: var(--color-muted); }
.detail-backdrop { position: fixed; inset: 0; z-index: 20; background: rgba(19, 25, 38, .3); }
.detail { position: fixed; right: 20px; top: 90px; z-index: 21; width: min(360px, calc(100vw - 32px)); padding: 24px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-card); box-shadow: 0 18px 48px rgba(0,0,0,.2); }
.close { position: absolute; right: 10px; top: 8px; border: 0; background: transparent; font-size: 24px; cursor: pointer; color: var(--color-muted); }
.detail-region { margin: 0; color: #335787; font-size: 13px; font-weight: 800; }
.detail h2 { margin: 6px 0; font-size: 26px; }
.detail-role { margin: 0 0 12px; color: var(--color-muted); }
.detail-meta { margin: 0 0 12px; padding: 10px; border-radius: 8px; background: var(--color-bg); }
.detail-meta div { display: flex; gap: 12px; }.detail-meta dt { color: var(--color-muted); }.detail-meta dd { margin: 0; font-weight: 700; }
.detail-note { line-height: 1.7; }.delete-button { background: #9f3a36; }
@media (max-width: 760px) { .title-row { align-items: start; flex-direction: column; }.add-form { grid-template-columns: 1fr; }.note-field { grid-column: auto; }.timeline-axis { left: 22px; }.timeline-item, .timeline-item.left, .timeline-item.right, .timeline-item.event { width: 100%; margin: 0; padding: 0 0 18px 52px; text-align: left; }.left .person-card, .timeline-item.event .person-card { text-align: left; transform: none; width: 100%; }.year, .left .year, .right .year, .timeline-item.event .year { left: 0; right: auto; width: auto; transform: none; flex-direction: row; }.person-card { width: 100%; }.detail { left: 16px; right: 16px; top: auto; bottom: 16px; width: auto; } }
</style>
