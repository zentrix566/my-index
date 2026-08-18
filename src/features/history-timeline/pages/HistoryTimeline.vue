<template>
  <main class="china-page">
    <section class="changelog-banner" :class="{ open: changelogOpen }">
      <button class="changelog-toggle" type="button" @click="changelogOpen = !changelogOpen" :aria-expanded="changelogOpen">
        <span class="changelog-flag">📜 更新日志</span>
        <span class="changelog-latest">最近更新 · {{ changelog[0]?.date }}</span>
        <span class="changelog-count">{{ changelog.length }} 条</span>
        <span class="changelog-chevron">{{ changelogOpen ? '收起 ▲' : '展开 ▼' }}</span>
      </button>
      <div v-if="changelogOpen" class="changelog-body">
        <div v-for="entry in changelog" :key="entry.date" class="cl-entry">
          <div class="cl-head">
            <span class="cl-date">{{ entry.date }}</span>
            <span class="cl-title">{{ entry.title }}</span>
          </div>
          <ul class="cl-list">
            <li v-for="(c, i) in entry.changes" :key="i">{{ c }}</li>
          </ul>
        </div>
      </div>
    </section>
    <header class="china-header">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <label class="history-picker">历史 <select v-model="scope" @change="switchScope"><option value="中国">中国历史</option><option v-for="item in worldRegions" :key="item" :value="item">{{ item }}</option></select></label>
      <div class="title-row"><div><p class="eyebrow">资料来源：你的历史目录与「历史.md」</p><h1>历史 · 中国</h1><p class="intro">皇帝卡居中突出，大臣以 2–3 列并排展示；点击卡片查看详情。</p></div><button class="add-button" @click="formOpen = !formOpen">{{ formOpen ? '收起添加' : '添加人物' }}</button></div>
      <form v-if="formOpen" class="add-form" @submit.prevent="addPerson"><label>姓名<input v-model.trim="draft.name" required /></label><label>归属时期<select v-model="draft.eraKey"><option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }}</option></select></label><label>年份<input v-model.number="draft.year" type="number" required /></label><label>身份<input v-model.trim="draft.role" placeholder="如：大臣" /></label><label class="note-field">简评<textarea v-model.trim="draft.note" rows="2" /></label><button class="submit-button" type="submit">保存到本机</button><p v-if="formMessage" class="form-message">{{ formMessage }}</p></form>
      <div class="toolbar"><label>快速跳转 <select v-model="activeEraKey" @change="jumpToEra(activeEraKey)"><option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }} · {{ rangeText(era) }}</option></select></label><span>自动记住上次浏览时期</span><input v-model.trim="query" type="search" placeholder="搜索人物、事件或典故" /></div>
    </header>
    <section class="timeline" :class="{ searching: !!query.trim() }" aria-label="中国历史时间轴"><div class="timeline-axis"></div>
      <template v-for="item in visibleItems" :key="item.id">
        <article v-if="item.type === 'event'" :id="item.anchor || item.id" :class="['timeline-item', 'event', { match: itemMatches(item) }]">
          <div class="year"><span>{{ formatYear(item.year) }}</span><i></i></div>
          <button class="person-card event-card" :style="{ '--era': item.era.color }" @click="selected = item">
            <span class="person-region">{{ item.era.name }} · {{ formatYear(item.year) }}</span>
            <strong>{{ item.name }}</strong>
            <span class="person-role">历史事件</span>
            <span v-if="item.note" class="person-note">{{ item.note }}</span>
          </button>
        </article>
        <article v-else :id="item.anchor || item.id" :class="['timeline-item', 'group', item.side, { match: itemMatches(item) }]">
          <div class="year"><span>{{ formatYear(item.year) }}</span><i></i></div>
          <div class="group-block">
            <button v-if="item.ruler" class="person-card ruler-card" :style="{ '--era': item.era.color }" :id="item.ruler.id" @click="selected = item.ruler">
              <span class="person-region">{{ item.era.name }} · {{ item.group.label }}</span>
              <strong><span class="crown">👑</span>{{ item.ruler.name }}</strong>
              <span v-if="item.ruler.alias" class="ruler-alias">{{ item.ruler.alias }}</span>
              <span v-if="item.ruler.isLast" class="last-emperor-badge">末帝</span>
              <span v-if="reignText(item.ruler)" class="person-role">在位 {{ reignText(item.ruler) }}<template v-if="reignYears(item.ruler) !== null">（{{ reignYears(item.ruler) > 0 ? reignYears(item.ruler) + '年' : '不足一年' }}）</template></span>
              <span v-if="item.ruler.life" class="person-life">生卒 {{ item.ruler.life }}<template v-if="item.ruler.age"> · 享年{{ item.ruler.age }}岁</template></span>
              <span v-if="reactionFor(item.ruler.name)" class="reaction-badge" :class="reactionFor(item.ruler.name)" role="button" tabindex="0" @click.stop="toggleReaction(item.ruler.name, reactionFor(item.ruler.name))">{{ reactionFor(item.ruler.name) === 'like' ? '♥ 喜欢' : '✕ 讨厌' }}</span>
            </button>
            <div v-if="item.allusions.length" class="allusion-block">
              <p class="allusion-title">📖 典故</p>
              <button v-for="allusion in item.allusions" :key="allusion.id" class="allusion-card" :style="{ '--era': item.era.color }" @click="selected = allusion">
                <strong>{{ allusion.name }}</strong>
                <span class="allusion-note">{{ allusion.note }}</span>
              </button>
            </div>
            <div v-if="item.figures.length" class="figure-cards">
              <button v-for="person in item.figures" :key="person.id" class="person-card minister-card" :style="{ '--era': item.era.color }" :id="person.id" @click="selected = person">
                <span class="person-region">{{ item.era.name }} · {{ item.group.ruler || item.group.label }}</span>
                <strong>{{ person.name }}</strong>
                <span class="person-role">{{ person.role }}</span>
                <span v-if="person.life" class="person-life">生卒 {{ person.life }}<template v-if="person.age"> · 享年{{ person.age }}岁</template></span>
                <span v-if="person.custom" class="custom-tag">自添</span>
                <span v-if="reactionFor(person.name)" class="reaction-badge" :class="reactionFor(person.name)" role="button" tabindex="0" @click.stop="toggleReaction(person.name, reactionFor(person.name))">{{ reactionFor(person.name) === 'like' ? '♥ 喜欢' : '✕ 讨厌' }}</span>
              </button>
            </div>
          </div>
        </article>
      </template>
    </section>
    <Teleport to="body">
      <div
        class="ht-fab"
        style="position:fixed;right:18px;bottom:18px;z-index:9999;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:8px 10px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;max-width:min(580px,calc(100vw - 24px));box-shadow:0 8px 24px rgba(0,0,0,.16)"
      >
        <select class="ht-era" v-model="activeEraKey" @change="jumpToEra(activeEraKey)" aria-label="选择朝代跳转">
          <option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }}</option>
        </select>
        <select class="ht-ruler" v-model="fabRulerId" @change="jumpToRuler(fabRulerId)" :disabled="!fabRulers.length" aria-label="选择皇帝跳转（二级）">
          <option value="">选择皇帝…</option>
          <option v-for="r in fabRulers" :key="r.id" :value="r.id">{{ r.label }}</option>
        </select>
        <input class="ht-search" v-model.trim="query" placeholder="搜索人物、事件、典故…" aria-label="搜索人物、事件或典故" />
        <button class="ht-top" @click="scrollTop" aria-label="回到顶部选择朝代">Top ↑</button>
      </div>
    </Teleport>
    <div v-if="selected" class="detail-backdrop" @click="selected = null"></div>
    <aside v-if="selected" class="detail" :style="{ '--era': selected.era.color }"><button class="close" @click="selected = null">×</button><p class="detail-region">{{ selected.era.name }} · {{ formatYear(selected.year) }}</p><h2>{{ selected.isRuler ? '👑 ' : '' }}{{ selected.name }}</h2><p v-if="selected.alias" class="detail-alias">{{ selected.alias }}</p><p v-if="selected.isLast" class="last-emperor-badge">末帝</p><p class="detail-role"><template v-if="selected.isRuler">在位 {{ reignText(selected) }}<template v-if="reignYears(selected) !== null">（{{ reignYears(selected) > 0 ? reignYears(selected) + '年' : '不足一年' }}）</template></template><template v-else>{{ selected.role }}</template></p><dl v-if="selected.life" class="detail-meta"><div><dt>生卒</dt><dd>{{ selected.life }}<template v-if="selected.age">（享年{{ selected.age }}岁）</template></dd></div></dl><p class="detail-note">{{ selected.note || '未填写简评。' }}</p><div v-if="selected.isRuler || selected.type === 'figure'" class="reaction-actions"><button :class="{ active: reactionFor(selected.name) === 'like' }" @click="toggleReaction(selected.name, 'like')">喜欢</button><button :class="{ active: reactionFor(selected.name) === 'dislike' }" @click="toggleReaction(selected.name, 'dislike')">讨厌</button></div><button v-if="selected.custom" class="delete-button" @click="removePerson(selected.id)">删除此自添人物</button></aside>
  </main>
</template>

<script setup>
import { Teleport, computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { eras } from '../data/chineseHistory.json'
import personDetails from '../data/personDetails.json'
import { items as worldItems } from '../data/worldHistory.json'
import { changelog } from '../../../data/changelog.js'

const ERA_KEY = 'history-timeline:last-era'
const REACTION_KEY = 'history-timeline:person-reactions'
const CUSTOM_KEY = 'history-timeline:custom-people'
const router = useRouter()
const scope = ref('中国')
const changelogOpen = ref(false)
const activeEraKey = ref(window.localStorage.getItem(ERA_KEY) || eras[0]?.key)
const query = ref('')
const fabRulerId = ref('')
const selected = ref(null)
const formOpen = ref(false)
const formMessage = ref('')
const draft = ref({ name: '', eraKey: 'dangdai', year: 2026, role: '', note: '' })
const worldRegions = [...new Set(worldItems.map((item) => item.region))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
function readJson(key, fallback) { try { return JSON.parse(window.localStorage.getItem(key) || '') ?? fallback } catch { return fallback } }
const reactions = ref(readJson(REACTION_KEY, {}))
const customPeople = ref(readJson(CUSTOM_KEY, []).filter((item) => item?.id && item?.name && item?.eraKey))
const timelineEras = computed(() => eras.map((era) => {
  const groups = era.groups.map((group) => ({ ...group, figures: [...group.figures] }))
  customPeople.value.filter((person) => person.eraKey === era.key).forEach((person) => groups.at(-1)?.figures.push({ ...person, custom: true }))
  return { ...era, groups }
}))
function description(name, fallback = '') {
  const summary = personDetails[name]?.summary || ''
  return summary.includes('…') ? fallback : (summary || fallback)
}
const allItems = computed(() => {
  // 多政权并存的朝代：按政权分组，组内按即位年排序，便于看清继承关系
  const PARALLEL = new Set(['dongjin', 'nanbeichao', 'wudai'])
  const regimeRank = {}
  for (const era of timelineEras.value) {
    if (!PARALLEL.has(era.key)) continue
    const rank = {}
    for (const g of era.groups) {
      const r = regimeOf(g.label)
      if (rank[r] === undefined || g.start < rank[r]) rank[r] = g.start
    }
    regimeRank[era.key] = rank
  }
  return timelineEras.value.flatMap((era, eraIndex) => {
  const groupItems = era.groups.map((group, gi) => {
    const side = (eraIndex + gi) % 2 ? 'right' : 'left'
    const ruler = group.ruler
      ? {
          id: `${era.key}-${gi}-r`,
          type: 'ruler',
          name: group.ruler,
          role: group.rulerTitle,
          alias: rulerAlias(group),
          note: description(group.ruler, group.blurb),
          life: personDetails[group.ruler]?.life,
          age: lifeAge(personDetails[group.ruler]?.life),
          reignStart: group.start,
          reignEnd: group.end,
          year: group.start,
          era,
          group,
          isRuler: true,
          isLast: group.last === true
        }
      : null
    const figures = group.figures.map((figure, fi) => ({
      id: `${era.key}-${gi}-f-${fi}`,
      type: 'figure',
      name: figure.name,
      role: figure.role,
      note: description(figure.name, figure.note),
      life: personDetails[figure.name]?.life || figure.life,
      age: lifeAge(personDetails[figure.name]?.life || figure.life),
      year: figure.year ?? group.start,
      era,
      group,
      custom: figure.custom
    }))
    const allusions = (group.allusions || []).map((allusion, ai) => ({
      id: `${era.key}-${gi}-a-${ai}`,
      type: 'allusion',
      name: allusion.name,
      role: '典故',
      note: allusion.note,
      year: allusion.year ?? group.start,
      era,
      group
    }))
    return {
      id: `${era.key}-${gi}`,
      type: 'group',
      year: group.start,
      era,
      eraIndex,
      group,
      side,
      ruler,
      figures,
      allusions,
      anchor: gi === 0 ? `era-${era.key}` : null
    }
  })
  const eventItems = (era.events || []).map((event, ei) => ({ id: `${era.key}-e-${ei}`, type: 'event', name: event.name, role: '历史事件', note: event.note, year: event.year, era, eraIndex }))
  return [...groupItems, ...eventItems]
}).sort((a, b) => {
  const pa = PARALLEL.has(a.era.key)
  const pb = PARALLEL.has(b.era.key)
  // 同一多政权朝代内：先按政权块顺序，再组内按即位年。
  // 历史事件项没有 group，不参与政权分块排序，交给下方通用分支按年份/类型处理。
  if (pa && pb && a.eraIndex === b.eraIndex && a.group && b.group) {
    const ra = regimeOf(a.group.label)
    const rb = regimeOf(b.group.label)
    const da = regimeRank[a.era.key][ra] ?? a.year
    const db = regimeRank[b.era.key][rb] ?? b.year
    if (da !== db) return da - db
    if (ra !== rb) return ra.localeCompare(rb, 'zh-CN')
    if (a.year !== b.year) return a.year - b.year
    const ea = a.group?.end ?? a.year
    const eb = b.group?.end ?? b.year
    if (ea !== eb) return ea - eb
    return labelOrder(a.group.label) - labelOrder(b.group.label)
  }
  if (a.year !== b.year) return a.year - b.year
  if (a.eraIndex !== b.eraIndex) return a.eraIndex - b.eraIndex
  if (a.type !== b.type) return a.type === 'event' ? -1 : 1
  const ea = a.group ? (a.group.end ?? a.year) : a.year
  const eb = b.group ? (b.group.end ?? b.year) : b.year
  if (ea !== eb) return ea - eb
  const la = a.group ? labelOrder(a.group.label) : 0
  const lb = b.group ? labelOrder(b.group.label) : 0
  return la - lb
})
})
// 搜索：保留完整时间轴，仅高亮命中项并跳转到首个命中；不再隐藏其余条目
const visibleItems = computed(() => allItems.value)
function itemMatches(item) {
  const text = query.value.trim().toLowerCase()
  if (!text) return false
  if (item.type === 'event') {
    return [item.name, item.role, item.note, item.era.name].filter(Boolean).join(' ').toLowerCase().includes(text)
  }
  const hay = [
    item.era.name,
    item.group?.label,
    item.ruler?.name,
    item.ruler?.role,
    item.ruler?.note,
    ...item.figures.flatMap((f) => [f.name, f.role, f.note]),
    ...(item.allusions || []).flatMap((a) => [a.name, a.role, a.note])
  ].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(text)
}
function formatYear(year) { return year < 0 ? `前${Math.abs(year)}年` : `${year}年` }
// 从“生卒”文本中解析出享年（周岁，粗略按年差计算）。兼容：前/公元、约、又作、同日多版本（用 / 分隔）、年份缺失（？）。
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
function reignText(ruler) {
  if (!ruler) return ''
  const s = ruler.reignStart, e = ruler.reignEnd
  if (s == null && e == null) return ''
  const start = s != null ? formatYear(s) : ''
  const end = e != null ? formatYear(e) : ''
  if (start && end) return `${start}—${end}`
  if (start) return `${start}起`
  return `${end}止`
}
function reignYears(ruler) {
  if (!ruler || ruler.reignStart == null || ruler.reignEnd == null) return null
  const s = ruler.reignStart, e = ruler.reignEnd
  let years
  if ((s < 0) !== (e < 0)) years = Math.abs(s) + e - 1
  else if (s < 0) years = Math.abs(s) - Math.abs(e)
  else years = e - s
  return years > 0 ? years : 0
}
function rulerAlias(group) {
  const name = group.ruler
  const title = group.rulerTitle
  if (!title || title === name) return ''
  if (title.includes('·')) return title.split('·').pop().trim()
  return title
}
// 帝王下拉显示用：优先年号（明/清最常用），无年号时用庙号/谥号-本名；名字太长时只用主名
function rulerOptionLabel(ruler, title, reign) {
  if (!ruler) return ''
  const alias = (() => {
    if (!title || title === ruler) return ''
    if (title.includes('·')) return title.split('·').pop().trim()
    return title
  })()
  const isTitle = (n) => /[帝祖宗王公侯皇汗伯主]$/.test(n)
  // 取本名：ruler 与 title 中不是庙号/谥号的那一个
  const personalOf = () => {
    if (!alias) return ruler
    const rulerIsTitle = isTitle(ruler)
    const aliasIsTitle = isTitle(alias)
    if (rulerIsTitle && !aliasIsTitle) return alias
    if (!rulerIsTitle && aliasIsTitle) return ruler
    return ruler
  }
  let titleName, personalName
  if (reign) {
    // 有年号（如 崇祯）：年号(+帝) 作为主名，本名作为副名，与清代「康熙帝-玄烨」风格一致
    titleName = reign.endsWith('帝') ? reign : reign + '帝'
    personalName = personalOf()
  } else {
    if (!alias) return ruler
    const rulerIsTitle = isTitle(ruler)
    const aliasIsTitle = isTitle(alias)
    if (rulerIsTitle && !aliasIsTitle) { titleName = ruler; personalName = alias }
    else if (!rulerIsTitle && aliasIsTitle) { titleName = alias; personalName = ruler }
    else return `${ruler}（${alias}）` // 两边都是庙号/都是本名 → 括号展示
  }
  // 长名缩写：本名 > 4 字时只用主名（年号/庙号）
  if (personalName.length > 4) return titleName
  return `${titleName}-${personalName}`
}
function labelOrder(label) {
  const m = String(label || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}
// 从 group label 提取政权前缀（如 "后梁1"→"后梁"、"北魏1"→"北魏"、"武周"→"武周"）
function regimeOf(label) {
  return String(label || '').replace(/\d+$/, '')
}
function rangeText(era) { return `${formatYear(era.start)}—${era.key === 'dangdai' ? '今' : formatYear(era.end)}` }
function switchScope() { if (scope.value !== '中国') router.push({ path: '/world-history', query: { region: scope.value } }) }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
const fabRulers = computed(() => {
  const era = timelineEras.value.find((e) => e.key === activeEraKey.value)
  if (!era) return []
  // 按皇帝序位排序（reign 起始年优先，label 内序号兜底，最后用原顺序保证稳定），避免 JSON 存储乱序导致下拉乱序
  return era.groups
    .map((g, gi) => ({ g, gi }))
    .filter(({ g }) => g.ruler)
    .sort((x, y) => (x.g.start - y.g.start) || (labelOrder(x.g.label) - labelOrder(y.g.label)) || (x.gi - y.gi))
    .map(({ g, gi }) => ({ id: `${era.key}-${gi}-r`, name: g.ruler, label: rulerOptionLabel(g.ruler, g.rulerTitle, g.reign) }))
})
function jumpToEra(key) {
  query.value = ''
  fabRulerId.value = ''
  window.localStorage.setItem(ERA_KEY, key)
  nextTick(() => { document.getElementById(`era-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })
}
function jumpToRuler(id) {
  if (!id) return
  query.value = ''
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('flash')
    setTimeout(() => el.classList.remove('flash'), 1500)
  })
}
function reactionFor(name) { return reactions.value[name] || '' }
function toggleReaction(name, value) { const next = { ...reactions.value }; if (next[name] === value) delete next[name]; else next[name] = value; reactions.value = next; window.localStorage.setItem(REACTION_KEY, JSON.stringify(next)) }
function addPerson() { if (!draft.value.name || !Number.isFinite(Number(draft.value.year))) { formMessage.value = '请填写姓名和年份。'; return }; customPeople.value = [...customPeople.value, { ...draft.value, id: `custom-${Date.now()}`, year: Number(draft.value.year) }]; window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPeople.value)); formMessage.value = `已保存「${draft.value.name}」。`; draft.value = { name: '', eraKey: draft.value.eraKey, year: draft.value.year, role: '', note: '' } }
function removePerson(id) { customPeople.value = customPeople.value.filter((item) => item.id !== id); window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPeople.value)); selected.value = null }
watch(activeEraKey, (key) => window.localStorage.setItem(ERA_KEY, key))
// 搜索时跳转到首个命中项（保留完整时间轴，便于上下浏览上下文），输入过程中防抖避免频繁滚动
let searchTimer
watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const text = query.value.trim().toLowerCase()
    if (!text) return
    const first = allItems.value.find(itemMatches)
    if (!first) return
    nextTick(() => {
      const el = document.getElementById(first.id) || (first.anchor && document.getElementById(first.anchor))
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1500)
    })
  }, 250)
})
</script>

<style scoped>
/* 保持中国与国外时间轴使用相同的卡片式中轴视觉语言。 */
.china-page{max-width:1220px;margin:0 auto;padding:28px 20px 56px}
/* 顶部更新日志面板：默认折叠，点击展开 */
.changelog-banner{border:1px solid var(--color-border);border-radius:14px;overflow:hidden;background:var(--color-card)}
.changelog-toggle{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:13px 18px;border:0;background:transparent;color:var(--color-text);font:inherit;cursor:pointer;text-align:left}
.changelog-flag{font-weight:800;font-size:15px;color:var(--color-primary);white-space:nowrap}
.changelog-latest{color:var(--color-muted);font-size:13px;white-space:nowrap}
.changelog-count{margin-left:auto;padding:2px 9px;border-radius:999px;background:var(--color-bg);color:var(--color-muted);font-size:12px;font-weight:700}
.changelog-chevron{color:var(--color-muted);font-size:13px;font-weight:700;white-space:nowrap}
.changelog-body{padding:0 18px 18px;border-top:1px solid var(--color-border)}
.cl-entry{padding:16px 0;border-bottom:1px dashed var(--color-border)}
.cl-entry:last-child{border-bottom:0;padding-bottom:0}
.cl-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.cl-date{color:var(--color-primary);font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
.cl-title{font-size:16px;font-weight:700;color:var(--color-text)}
.cl-list{margin:0;padding-left:18px;color:var(--color-muted);font-size:13.5px;line-height:1.8}
.cl-list li{margin-bottom:4px}

.back{color:var(--color-primary);font-size:14px}
.history-picker{display:inline-flex;gap:7px;align-items:center;margin-left:14px;color:var(--color-primary);font-size:13px;font-weight:700}
.history-picker select,.toolbar select{border:1px solid var(--color-border);border-radius:7px;padding:5px 8px;color:var(--color-text);background:var(--color-card);font:inherit}
.title-row{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-top:12px}
.eyebrow{margin:0 0 4px;color:var(--color-muted);font-size:12px}
h1{margin:0;font-size:32px;letter-spacing:.04em}
.intro{margin:8px 0 0;color:var(--color-muted)}
.add-button,.submit-button,.delete-button{min-height:42px;border:0;border-radius:9px;padding:9px 16px;color:#fff;background:var(--color-primary);font:inherit;font-weight:700;cursor:pointer}
.add-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px;padding:16px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-card)}
.add-form label{display:grid;gap:5px;color:var(--color-muted);font-size:12px;font-weight:700}
.add-form input,.add-form select,.add-form textarea,.toolbar input{width:100%;box-sizing:border-box;border:1px solid var(--color-border);border-radius:7px;padding:8px;background:var(--color-bg);color:var(--color-text);font:inherit}
.note-field{grid-column:span 2}
.form-message{align-self:center;margin:0;color:#247348}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:18px;padding:10px 12px;background:#eef2f7;border-radius:10px;color:var(--color-muted);font-size:13px}
.toolbar label{display:inline-flex;align-items:center;gap:7px;font-weight:700}
.toolbar input{width:min(280px,100%)}
.timeline{position:relative;margin:28px auto 0;padding:12px 0}
.timeline-axis{position:absolute;top:0;bottom:0;left:50%;width:3px;transform:translateX(-50%);background:linear-gradient(#40679c,#a88647)}
.timeline-item{position:relative;width:50%;box-sizing:border-box;padding-bottom:22px}
.timeline-item.left{margin-right:50%;padding-left:24px;padding-right:84px}
.timeline-item.right{margin-left:50%;padding-left:84px;padding-right:24px}
.group-block{display:flex;flex-direction:column;gap:10px;max-width:430px}
.timeline-item.left .group-block{margin-left:auto;align-items:flex-end}
.timeline-item.right .group-block{margin-right:auto;align-items:flex-start}
.year{position:absolute;top:17px;display:flex;width:120px;flex-direction:column;align-items:center;gap:4px;color:#655b48;font-size:12px;font-weight:800;white-space:nowrap}
.left .year{right:-60px}
.right .year{left:-60px}
.year span{z-index:1;padding:2px 5px;border-radius:4px;background:var(--color-bg)}
.year i{width:13px;height:13px;border:3px solid #fbf8f0;border-radius:50%;background:#40679c;box-shadow:0 0 0 2px #40679c}
.person-card{position:relative;width:min(100%,430px);padding:13px 16px;border:1px solid color-mix(in srgb,var(--era) 55%,#fff);border-radius:12px;background:var(--color-card);color:var(--color-text);box-shadow:0 4px 12px rgba(35,48,76,.08);cursor:pointer;text-align:left}
.person-card strong,.person-card span{display:block}
.person-card strong{font-size:17px}
.person-region{color:var(--era);font-size:11px;font-weight:800}
.person-role{margin-top:2px;color:var(--color-muted);font-size:12px}
.person-life{margin-top:6px;color:#655b48;font-size:12px}
.person-note{margin-top:6px;color:var(--color-muted);font-size:12px;line-height:1.5}
.custom-tag{position:absolute;top:10px;left:10px;padding:2px 5px;border-radius:5px;background:#e2eefc;color:#245785;font-size:10px}
.person-card .reaction-badge{position:absolute;top:9px;right:10px;display:inline-block;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;user-select:none}
.reaction-badge.like{background:#fde3e1;color:#c0392b}
.reaction-badge.dislike{background:#e8eaed;color:#5b6470}
/* 皇帝卡：明显区别于大臣，突出居中 */
.ruler-card{border:2px solid var(--era);background:linear-gradient(180deg,color-mix(in srgb,var(--era) 14%,#fff),var(--color-card));box-shadow:0 6px 16px color-mix(in srgb,var(--era) 22%,transparent)}
.ruler-card strong{font-size:20px}
.ruler-card .crown{margin-right:4px}
.ruler-alias{margin-top:2px;color:var(--era);font-size:13px;font-weight:700}
/* 末帝徽章：标记该朝最后一位皇帝 */
.last-emperor-badge{display:inline-block;margin-top:4px;padding:1px 8px;border-radius:999px;background:#2c3e68;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;width:fit-content}
.detail .last-emperor-badge{display:inline-block;margin:0 0 8px;padding:2px 10px;font-size:12px}
/* 大臣：并排 2–3 列，缩小卡片 */
.figure-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;width:100%;max-width:430px}
.minister-card{padding:10px 12px}
.minister-card strong{font-size:15px}
/* 典故栏：紧贴皇帝卡下方，区别于事件轨道与大臣卡 */
.allusion-block{display:flex;flex-direction:column;gap:8px;width:100%}
.allusion-title{margin:0;color:var(--era);font-size:12px;font-weight:800;letter-spacing:.08em}
.allusion-card{width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid color-mix(in srgb,var(--era) 35%,#fff);border-left:3px solid var(--era);border-radius:10px;background:color-mix(in srgb,var(--era) 7%,#fff);color:var(--color-text);box-shadow:0 2px 8px rgba(35,48,76,.06);cursor:pointer;text-align:left}
.allusion-card strong{display:block;font-size:15px;color:var(--era)}
.allusion-note{display:block;margin-top:4px;color:var(--color-muted);font-size:12.5px;line-height:1.6}
.allusion-card:hover{border-color:var(--era);background:color-mix(in srgb,var(--era) 12%,#fff)}
/* 历史事件：固定在中轴年份处 */
.timeline-item.event{width:100%;margin:0;padding:0 50% 22px;min-height:84px;text-align:center}
.timeline-item.event .person-card{width:220px;transform:translateX(-50%);border-style:dashed;background:#fff9e8;text-align:center}
.timeline-item.event .year{top:-7px;left:50%;transform:translateX(-50%)}
.timeline-item.event .year i{display:none}
.empty{position:relative;text-align:center;color:var(--color-muted)}
.ht-fab{position:fixed;right:18px;bottom:18px;z-index:50;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;padding:8px 10px;max-width:min(580px,calc(100vw - 24px));border:1px solid var(--line);border-radius:22px;background:var(--surface);box-shadow:0 8px 24px rgba(0,0,0,.16)}
.ht-fab select{border:1px solid var(--line);border-radius:7px;padding:5px 8px;background:var(--bg);color:var(--text);font:inherit;max-width:120px}
.ht-fab .ht-ruler{max-width:130px}
.ht-fab button{min-height:34px;border:0;border-radius:8px;padding:6px 12px;font:inherit;font-weight:700;color:#fff;background:var(--primary);cursor:pointer}
.ht-fab .ht-search{border:1px solid var(--line);border-radius:7px;padding:6px 10px;background:var(--bg);color:var(--text);font:inherit;width:160px}
.ht-fab .ht-search::placeholder{color:var(--muted)}
.ht-fab .ht-top{background:#2c3e68}
@keyframes flashHighlight{0%{box-shadow:0 0 0 4px var(--era)}100%{box-shadow:0 4px 12px rgba(35,48,76,.08)}}
.person-card.flash{animation:flashHighlight 1.5s ease-out}
/* 搜索时：命中项高亮描边，非命中项轻微变淡但保留可见，便于上下浏览上下文 */
.timeline.searching .timeline-item:not(.match){opacity:.38}
.timeline-item.match .person-card{border-color:var(--era);box-shadow:0 0 0 3px color-mix(in srgb,var(--era) 55%,transparent),0 6px 16px rgba(35,48,76,.18)}
.timeline-item.match.event .year span{background:var(--era);color:#fff;padding:2px 6px;border-radius:4px}
.detail-backdrop{position:fixed;inset:0;z-index:20;background:rgba(19,25,38,.3)}
.detail{position:fixed;top:90px;right:20px;z-index:21;width:min(360px,calc(100vw - 32px));padding:24px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-card);box-shadow:0 18px 48px rgba(0,0,0,.2)}
.close{position:absolute;top:8px;right:10px;border:0;background:transparent;color:var(--color-muted);font-size:24px;cursor:pointer}
.detail-region{margin:0;color:var(--era);font-size:13px;font-weight:800}
.detail h2{margin:6px 0;font-size:26px}
.detail-alias{margin:0 0 12px;color:var(--era);font-size:15px;font-weight:700}
.detail-role{margin:0 0 12px;color:var(--color-muted)}
.detail-meta{margin:0 0 12px;padding:10px;border-radius:8px;background:var(--color-bg)}
.detail-meta div{display:flex;gap:12px}
.detail-meta dt{color:var(--color-muted)}
.detail-meta dd{margin:0;font-weight:700}
.detail-note{line-height:1.7}
.reaction-actions{display:flex;gap:8px;margin-top:16px}
.reaction-actions button{min-height:38px;border:1px solid var(--color-border);border-radius:8px;padding:6px 12px;background:var(--color-bg);cursor:pointer}
.reaction-actions button.active{border-color:var(--era);background:color-mix(in srgb,var(--era) 15%,#fff)}
.delete-button{margin-top:16px;background:#9f3a36}
@media(max-width:760px){
  .title-row{align-items:start;flex-direction:column}
  .add-form{grid-template-columns:1fr}
  .note-field{grid-column:auto}
  .toolbar{flex-direction:column;align-items:flex-start}
  .timeline-axis{left:22px}
  .timeline-item,.timeline-item.left,.timeline-item.right{width:100%;margin:0;padding:0 0 18px 52px;text-align:left}
  .group-block{margin:0!important;max-width:100%;align-items:stretch!important}
  .left .person-card,.figure-cards,.person-card{width:100%}
  .year,.left .year,.right .year,.timeline-item.event .year{left:0;right:auto;width:auto;transform:none;flex-direction:row}
  .figure-cards{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
  .detail{top:auto;right:16px;bottom:16px;left:16px;width:auto}
  .ht-fab{flex-direction:column;align-items:stretch;right:12px;bottom:12px;gap:6px}
  .ht-fab .ht-search{width:100%}
  .ht-fab select{max-width:none}
}
</style>
