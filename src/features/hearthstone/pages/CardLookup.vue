<template>
  <section class="section page-section hs-page" :data-hs-theme="hsTheme">
    <div class="container">
      <div class="cl-wrap">
        <div class="cl-head">
          <div class="cl-title-block">
            <router-link to="/hearthstone" class="cl-back" aria-label="返回炉石成就查看器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              返回炉石成就
            </router-link>
            <p class="cl-eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Card Lookup</p>
            <h1>炉石卡牌查询</h1>
            <p class="cl-sub">输入卡牌名称或 dbfId，查看卡图、效果与背景描述。开启右上角「开发模式」可显示入库自检（卡牌库 / manifest / OSS）与资源路径等调试信息。</p>
          </div>
          <label class="cl-dev-toggle">
            <span class="cl-dev-toggle-text">开发模式</span>
            <span class="cl-switch">
              <input type="checkbox" v-model="devMode" />
              <span class="cl-switch-track"><span class="cl-switch-thumb"></span></span>
            </span>
          </label>
        </div>

        <div class="cl-card">
          <label class="cl-label" for="cl-q">卡牌名称 或 dbfId</label>
          <div class="cl-input-row">
            <input
              id="cl-q"
              v-model="query"
              class="cl-input"
              type="text"
              placeholder="例如：蛙生 / 邪恶的虚鳞纳迦 / 129959"
              :disabled="dbStatus !== 'ready'"
              @keyup.enter="lookup"
            />
            <button type="button" class="cl-btn cl-primary" :disabled="dbStatus !== 'ready'" @click="lookup">
              {{ dbStatus === 'loading' ? '加载卡牌库…' : '查询' }}
            </button>
          </div>
          <p v-if="dbStatus === 'error'" class="cl-error" role="alert">
            卡牌库加载失败（{{ dbError }}）。
            <button type="button" class="cl-btn" @click="loadCardsDb">重新加载</button>
          </p>
          <p v-else-if="error" class="cl-error" role="alert">{{ error }}</p>
          <p v-else class="cl-hint">支持按名称（模糊匹配）或纯数字 dbfId 精确查询。</p>
        </div>

        <div v-if="results.length" class="cl-results">
          <p class="cl-count">共找到 {{ results.length }} 张匹配卡牌<span v-if="capped">（仅显示前 {{ LIMIT }} 张，请缩小关键词）</span></p>
          <div v-for="card in results" :key="card.id" class="cl-result">
            <div v-if="devMode" class="cl-checks">
              <div class="cl-check" :class="card.registered ? 'ok' : 'bad'">
                <span class="cl-check-ico">{{ card.registered ? '✓' : '✕' }}</span>
                卡牌库登记（cards-db）：{{ card.registered ? '已登记' : '未登记' }}
              </div>
              <div class="cl-check" :class="card.manifestOk ? 'ok' : 'bad'">
                <span class="cl-check-ico">{{ card.manifestOk ? '✓' : '✕' }}</span>
                卡图 manifest 登记（deck-card-images）：{{ card.manifestOk ? '已登记' : '未登记' }}
              </div>
              <div class="cl-check" :class="card.ossState === 'ok' ? 'ok' : card.ossState === 'fail' ? 'bad' : 'pending'">
                <span class="cl-check-ico">{{ card.ossState === 'ok' ? '✓' : card.ossState === 'fail' ? '✕' : '…' }}</span>
                OSS 图片可访问：{{ card.ossState === 'ok' ? '可访问' : card.ossState === 'fail' ? '无法访问' : '检测中…' }}
              </div>
            </div>

            <div class="cl-card-detail">
              <div class="cl-img">
                <img :src="card.ossFull" :alt="card.name" @error="card.ossState = 'fail'" />
              </div>
              <div class="cl-info">
                <h2 :style="{ color: rarityColorOf(card) }">{{ card.name }}</h2>
                <div class="cl-meta">
                  <span class="cl-chip">费用 {{ card.manaCost ?? '—' }}</span>
                  <span v-if="card.attack != null" class="cl-chip">攻击 {{ card.attack }}</span>
                  <span v-if="card.health != null" class="cl-chip">生命 {{ card.health }}</span>
                  <span class="cl-chip" :style="{ color: rarityColorOf(card) }">{{ rarityLabelOf(card) }}</span>
                  <span class="cl-chip">{{ card.setName }}</span>
                </div>
                <div class="cl-field">
                  <h4>效果</h4>
                  <p class="cl-text" v-html="card.text || '—'"></p>
                </div>
                <div class="cl-field">
                  <h4>背景描述</h4>
                  <p class="cl-flavor">{{ card.flavorText || '—' }}</p>
                </div>
                <div v-if="devMode" class="cl-field">
                  <h4>资源路径</h4>
                  <p class="cl-path">full: {{ card.ossFull }}</p>
                  <p class="cl-path">crop: {{ card.ossCrop }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { getLocalCardImages, normalizeRarity, getRarityColor, RARITY_LABELS, withCardImgVersion } from '../utils/cardImages.js'

const { hsTheme } = useHearthstoneTheme()

// 卡牌库约 5.5MB，放在 public/hearthstone/cards-db.json 按需 fetch：
// 不进 JS 构建包，且浏览器可按缓存头长效复用（数据未变时发版无需重新下载）。
const cardsDb = ref(null)
const dbStatus = ref('loading') // loading | ready | error
const dbError = ref('')

async function loadCardsDb() {
  dbStatus.value = 'loading'
  dbError.value = ''
  try {
    const resp = await fetch('/hearthstone/cards-db.json', { cache: 'force-cache' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    cardsDb.value = await resp.json()
    dbStatus.value = 'ready'
  } catch (cause) {
    dbStatus.value = 'error'
    dbError.value = cause instanceof Error ? cause.message : String(cause)
  }
}

onMounted(loadCardsDb)

const query = ref('')
const results = ref([])
const error = ref('')
const LIMIT = 4
const capped = computed(() => results.value.length >= LIMIT)
// 开发模式：默认关闭，开启后显示入库自检与资源路径等调试信息
const devMode = ref(false)

function rarityColorOf(card) {
  return getRarityColor(card.rarityId)
}
function rarityLabelOf(card) {
  return RARITY_LABELS[normalizeRarity(card.rarityId)] || '其他'
}

// 按名称（模糊）或 dbfId（精确）在卡牌库中查找，返回所有匹配
function findCards(raw) {
  const q = (raw || '').trim()
  if (!q) return []
  const vals = Object.values(cardsDb.value || {})
  if (/^\d+$/.test(q)) {
    return vals.filter((c) => String(c.id) === q)
  }
  const exact = vals.filter((c) => c.name === q)
  if (exact.length) return exact
  return vals.filter((c) => c.name.includes(q))
}

function lookup() {
  error.value = ''
  if (dbStatus.value !== 'ready') {
    error.value = dbStatus.value === 'loading' ? '卡牌库加载中，请稍候再试。' : '卡牌库加载失败，请点击「重新加载」后重试。'
    results.value = []
    return
  }
  const matches = findCards(query.value)
  if (!matches.length) {
    error.value = '未找到匹配的卡牌，可能尚未登记到卡牌库。请检查名称或 dbfId。'
    results.value = []
    return
  }
  results.value = matches.slice(0, LIMIT).map((c) => {
    const man = getLocalCardImages(c.name)
    return {
      ...c,
      ossFull: withCardImgVersion(c.ossFull),
      registered: true,
      manifestOk: !!(man && (man.full || man.crop)),
      ossState: 'pending'
    }
  })
  if (devMode.value) results.value.forEach(probeOss)
}

// 开启开发模式时，对已有结果补跑 OSS 可达性探测（诊断信息）
watch(devMode, (on) => {
  if (on) results.value.forEach(probeOss)
})

// 用隐藏 Image 实际请求 OSS 图，确认线上可访问（4s 超时判为失败）
function probeOss(card) {
  card.ossState = 'pending'
  const img = new Image()
  const timer = setTimeout(() => {
    card.ossState = 'fail'
  }, 4000)
  img.onload = () => {
    clearTimeout(timer)
    card.ossState = 'ok'
  }
  img.onerror = () => {
    clearTimeout(timer)
    card.ossState = 'fail'
  }
  img.src = card.ossFull
}
</script>

<style scoped>
.cl-wrap {
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 0 48px;
}
.cl-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.cl-title-block {
  min-width: 0;
}
.cl-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
  text-decoration: none;
  margin-bottom: 10px;
}
.cl-back:hover {
  color: #2563eb;
}
.cl-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
}
.hs-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}
.cl-title-block h1 {
  margin: 0 0 8px;
  font-size: 26px;
  color: #111827;
}
.cl-sub {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.6;
}
.cl-dev-toggle {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  user-select: none;
}
.cl-dev-toggle-text {
  white-space: nowrap;
}
.cl-switch {
  position: relative;
  display: inline-flex;
}
.cl-switch input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.cl-switch-track {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #d1d5db;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
  transition: background 0.18s ease;
}
.cl-switch-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.18s ease;
}
.cl-switch input:checked + .cl-switch-track {
  background: #2563eb;
}
.cl-switch input:checked + .cl-switch-track .cl-switch-thumb {
  transform: translateX(16px);
}
.cl-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 18px;
}
.cl-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
.cl-input-row {
  display: flex;
  gap: 10px;
}
.cl-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  color: #111827;
  outline: none;
}
.cl-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.cl-btn {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.cl-primary {
  background: #2563eb;
  color: #fff;
}
.cl-primary:hover {
  background: #1d4ed8;
}
.cl-error {
  margin: 10px 0 0;
  color: #dc2626;
  font-size: 13px;
}
.cl-hint {
  margin: 10px 0 0;
  color: #9ca3af;
  font-size: 13px;
}
.cl-results {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.cl-count {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}
.cl-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cl-checks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.cl-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
}
.cl-check.ok {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}
.cl-check.bad {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}
.cl-check.pending {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
}
.cl-check-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: currentColor;
  flex: none;
}
.cl-card-detail {
  display: flex;
  gap: 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px;
}
.cl-img {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.cl-img > img {
  width: 240px;
  max-width: 240px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
}
.cl-info {
  flex: 1;
  min-width: 0;
}
.cl-info h2 {
  margin: 0 0 10px;
  font-size: 22px;
}
.cl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.cl-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
}
.cl-field {
  margin-bottom: 12px;
}
.cl-field h4 {
  margin: 0 0 6px;
  font-size: 13px;
  color: #6b7280;
}
.cl-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #111827;
}
.cl-text :deep(b) {
  color: #b45309;
}
.cl-flavor {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  font-style: italic;
  color: #6b7280;
}
.cl-path {
  margin: 2px 0;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #6b7280;
  word-break: break-all;
}

/* 暗色主题适配 */
.hs-page[data-hs-theme='dark'] .cl-title-block h1,
.hs-page[data-hs-theme='dark'] .cl-sub {
  color: #e6e8eb;
}
.hs-page[data-hs-theme='dark'] .cl-count {
  color: #9aa4b2;
}
.hs-page[data-hs-theme='dark'] .cl-dev-toggle {
  color: #9aa4b2;
}
.hs-page[data-hs-theme='dark'] .cl-switch-track {
  background: #333a44;
}
.hs-page[data-hs-theme='dark'] .cl-switch-thumb {
  background: #cbd5e1;
}
.hs-page[data-hs-theme='dark'] .cl-switch input:checked + .cl-switch-track {
  background: #2563eb;
}
.hs-page[data-hs-theme='dark'] .cl-card,
.hs-page[data-hs-theme='dark'] .cl-card-detail {
  background: #1b1f26;
  border-color: #2c333d;
}
.hs-page[data-hs-theme='dark'] .cl-input {
  background: #23272f;
  border-color: #333a44;
  color: #e6e8eb;
}
.hs-page[data-hs-theme='dark'] .cl-label {
  color: #cbd5e1;
}
.hs-page[data-hs-theme='dark'] .cl-check {
  background: #23272f;
  border-color: #333a44;
  color: #cbd5e1;
}
.hs-page[data-hs-theme='dark'] .cl-check.ok {
  background: #14331f;
  border-color: #2f6b43;
  color: #6ee7a0;
}
.hs-page[data-hs-theme='dark'] .cl-check.bad {
  background: #3a1d1d;
  border-color: #7f3a3a;
  color: #fca5a5;
}
.hs-page[data-hs-theme='dark'] .cl-chip {
  background: #2c333d;
  color: #cbd5e1;
}
.hs-page[data-hs-theme='dark'] .cl-text {
  color: #e6e8eb;
}
.hs-page[data-hs-theme='dark'] .cl-text :deep(b) {
  color: #fbbf24;
}
.hs-page[data-hs-theme='dark'] .cl-flavor {
  color: #9aa4b2;
}
.hs-page[data-hs-theme='dark'] .cl-img > img {
  background: #23272f;
  border-color: #333a44;
}
</style>
