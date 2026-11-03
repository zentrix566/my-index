<template>
  <section class="section page-section hs-page" :data-hs-theme="hsTheme">
    <div class="container">
      <div class="hsd-wrap">
        <!-- 头部：返回 + 标题 + 工具导航 -->
        <div class="hsd-head">
          <div class="hsd-title-block">
            <router-link to="/hearthstone" class="hsd-back" aria-label="返回炉石成就查看器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              返回炉石成就
            </router-link>
            <p class="hsd-eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Deck Sharing</p>
            <h1>炉石卡组分享</h1>
            <p class="hsd-sub">解析页可一键保存卡组：私密仅自己可见，公开进入广场供所有玩家浏览复制。</p>
          </div>
          <HearthstoneToolNav @navigate="(p) => router.push(p)" />
        </div>

        <!-- Tab 切换 -->
        <div class="hsd-tabs" role="tablist" aria-label="卡组视图切换">
          <button
            type="button"
            role="tab"
            class="hsd-tab"
            :class="{ 'hsd-tab-active': activeTab === 'square' }"
            :aria-selected="activeTab === 'square'"
            @click="switchTab('square')"
          >卡组广场</button>
          <button
            type="button"
            role="tab"
            class="hsd-tab"
            :class="{ 'hsd-tab-active': activeTab === 'mine' }"
            :aria-selected="activeTab === 'mine'"
            @click="switchTab('mine')"
          >我的卡组</button>
        </div>

        <!-- 卡组广场 -->
        <template v-if="activeTab === 'square'">
          <div class="hsd-filters">
            <input
              v-model="filters.q"
              class="hsd-search"
              type="search"
              placeholder="按卡组名称搜索，回车确认"
              @keydown.enter.prevent="reloadSquare(1)"
            />
            <select v-model="filters.heroClass" class="hsd-select" aria-label="按职业筛选" @change="reloadSquare(1)">
              <option value="">全部职业</option>
              <option v-for="c in HERO_CLASSES" :key="c" :value="c">{{ c }}</option>
            </select>
            <select v-model="filters.format" class="hsd-select" aria-label="按模式筛选" @change="reloadSquare(1)">
              <option value="">全部模式</option>
              <option v-for="(label, value) in FORMAT_LABELS" :key="value" :value="value">{{ label }}</option>
            </select>
            <button type="button" class="hsd-filter-btn" @click="reloadSquare(1)">搜索</button>
          </div>

          <p v-if="squareLoading && !squareDecks.length" class="hsd-state">正在加载公开卡组...</p>
          <p v-else-if="!squareDecks.length" class="hsd-state">
            还没有公开的卡组。去解析页保存一套并设为公开吧。
          </p>
          <template v-else>
            <ul class="hsd-grid">
              <li v-for="deck in squareDecks" :key="deck.id">
                <button type="button" class="hsd-deck-card" @click="openSquareDeck(deck)">
                  <span class="hsd-deck-top">
                    <span class="hsd-badge">{{ deck.heroClass }}</span>
                    <span v-if="formatLabel(deck)" class="hsd-badge hsd-badge-soft">{{ formatLabel(deck) }}</span>
                    <span v-if="achievementLabel(deck)" class="hsd-badge hsd-badge-ach">{{ achievementLabel(deck) }}</span>
                  </span>
                  <strong class="hsd-deck-name">{{ deck.name }}</strong>
                  <span class="hsd-deck-desc">{{ deck.description || '作者没有留下介绍。' }}</span>
                  <span class="hsd-deck-meta">
                    <span>{{ deck.cardCount }} 张</span>
                    <span class="hsd-dot">·</span>
                    <span>{{ deck.authorName || '神秘旅店老板' }}</span>
                    <span class="hsd-dot">·</span>
                    <span>{{ shortTime(deck.updatedAt) }}</span>
                  </span>
                </button>
              </li>
            </ul>
            <div v-if="squareTotal > PAGE_SIZE" class="hsd-pager">
              <button type="button" class="hsd-tiny-btn" :disabled="squarePage <= 1" @click="reloadSquare(squarePage - 1)">上一页</button>
              <span class="hsd-pager-info">{{ squarePage }} / {{ totalPages }}</span>
              <button type="button" class="hsd-tiny-btn" :disabled="squarePage >= totalPages" @click="reloadSquare(squarePage + 1)">下一页</button>
            </div>
          </template>
        </template>

        <!-- 我的卡组 -->
        <template v-else>
          <div v-if="!user" class="hs-example-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <span>登录后可保存卡组并管理<strong>私密 / 公开</strong>状态。</span>
            <button
              type="button"
              class="hs-link"
              @click="router.push({ path: '/login', query: { redirect: '/hearthstone/decks?tab=mine', source: 'hearthstone' } })"
            >登录 / 注册</button>
          </div>
          <template v-else>
            <p v-if="mineLoading && !myDecks.length" class="hsd-state">正在加载我的卡组...</p>
            <p v-else-if="!myDecks.length" class="hsd-state">
              还没有保存过卡组。去
              <router-link class="hs-link" to="/hearthstone/deck">卡组代码解析</router-link>
              解析一套并点击「保存到我的卡组」。
            </p>
            <ul v-else class="hsd-grid">
              <li v-for="deck in myDecks" :key="deck.id">
                <div class="hsd-deck-card hsd-deck-own">
                  <button type="button" class="hsd-deck-main" @click="openMineDeck(deck)">
                    <span class="hsd-deck-top">
                      <span class="hsd-badge">{{ deck.heroClass }}</span>
                      <span v-if="formatLabel(deck)" class="hsd-badge hsd-badge-soft">{{ formatLabel(deck) }}</span>
                      <span class="hsd-badge" :class="visibilityClass(deck)">{{ visibilityLabel(deck) }}</span>
                    </span>
                    <strong class="hsd-deck-name">{{ deck.name }}</strong>
                    <span class="hsd-deck-desc">{{ deck.description || '没有描述。' }}</span>
                    <span class="hsd-deck-meta">
                      <span>{{ deck.cardCount }} 张</span>
                      <span class="hsd-dot">·</span>
                      <span>{{ shortTime(deck.updatedAt) }}</span>
                    </span>
                  </button>
                  <div class="hsd-own-actions">
                    <button type="button" class="hsd-tiny-btn" @click="openEditDialog(deck)">编辑</button>
                    <button
                      type="button"
                      class="hsd-tiny-btn"
                      :class="{ 'hsd-tiny-danger': deleteArmedId === deck.id }"
                      @click="removeDeck(deck)"
                    >{{ deleteArmedId === deck.id ? '确认删除？' : '删除' }}</button>
                  </div>
                </div>
              </li>
            </ul>
          </template>
        </template>
      </div>
    </div>

    <!-- 卡组详情（复用解析页同款弹窗，公开卡组用快照渲染） -->
    <DeckDetailModal
      v-if="detailVisible"
      :visible="detailVisible"
      :deck="detailDeck"
      @close="detailVisible = false"
    />

    <!-- 编辑卡组弹窗 -->
    <div v-if="editVisible" class="hsd-overlay" @click.self="closeEditDialog">
      <div
        ref="editDialogEl"
        class="hsd-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hsd-edit-title"
      >
        <h3 id="hsd-edit-title" class="hsd-dialog-title">编辑卡组</h3>
        <label class="hsd-label" for="hsd-edit-name">卡组名称</label>
        <input
          id="hsd-edit-name"
          v-model="editForm.name"
          class="hsd-input"
          type="text"
          maxlength="50"
        />
        <label class="hsd-label" for="hsd-edit-desc">描述</label>
        <textarea
          id="hsd-edit-desc"
          v-model="editForm.description"
          class="hsd-input hsd-desc"
          maxlength="200"
          placeholder="给其他玩家介绍一下这套卡组（200 字以内）"
        ></textarea>
        <div class="hsd-visibility">
          <label class="hsd-radio">
            <input v-model="editForm.visibility" type="radio" value="private" :disabled="editWasHidden" />
            <span>私密 · 仅自己可见</span>
          </label>
          <label class="hsd-radio">
            <input v-model="editForm.visibility" type="radio" value="public" :disabled="editWasHidden" />
            <span>公开 · 所有人可见</span>
          </label>
        </div>
        <p v-if="editWasHidden" class="hsd-warn">该卡组已被管理员隐藏，暂不能修改可见性。</p>
        <p v-if="editError" class="hsd-error" role="alert">{{ editError }}</p>
        <div class="hsd-dialog-actions">
          <button type="button" class="hsd-tiny-btn" :disabled="editSaving" @click="closeEditDialog">取消</button>
          <button type="button" class="hsd-btn" :disabled="editSaving" @click="submitEdit">
            {{ editSaving ? '保存中...' : '保存修改' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineAsyncComponent, ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import { useAuth } from '../../../auth/useAuth.js'
import { useToast } from '../../../composables/useToast.js'
import { formatDateTime } from '../../../utils/date.js'
import { FORMAT_LABELS } from '../utils/deckstring.js'
import {
  fetchPublicDecks,
  fetchMyDecks,
  fetchDeckDetail,
  updateDeck,
  deleteDeck as deleteDeckApi
} from '../api/decks.js'
import HearthstoneToolNav from '../components/HearthstoneToolNav.vue'

const DeckDetailModal = defineAsyncComponent(
  () => import('../components/DeckDetailModal.vue')
)

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { user, init: initAuth } = useAuth()
const { hsTheme } = useHearthstoneTheme()

const PAGE_SIZE = 20
const HERO_CLASSES = ['死亡骑士', '恶魔猎手', '德鲁伊', '猎人', '法师', '圣骑士', '牧师', '潜行者', '萨满祭司', '术士', '战士', '中立']

// ── Tab ──
const activeTab = ref(route.query.tab === 'mine' ? 'mine' : 'square')
function switchTab(tab) {
  activeTab.value = tab
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } }).catch(() => {})
  }
}

// ── 卡组广场 ──
const filters = reactive({ q: '', heroClass: '', format: '' })
const squareDecks = ref([])
const squareTotal = ref(0)
const squarePage = ref(1)
const squareLoading = ref(false)
const totalPages = computed(() => Math.max(1, Math.ceil(squareTotal.value / PAGE_SIZE)))

async function reloadSquare(page = 1) {
  squareLoading.value = true
  try {
    const data = await fetchPublicDecks({
      q: filters.q.trim() || undefined,
      class: filters.heroClass || undefined,
      format: filters.format ? Number(filters.format) : undefined,
      page
    })
    squareDecks.value = data.decks || []
    squareTotal.value = data.total || 0
    squarePage.value = data.page || page
  } catch (e) {
    toast.error(e.message || '公开卡组加载失败，请稍后重试')
  } finally {
    squareLoading.value = false
  }
}

// ── 我的卡组 ──
const myDecks = ref([])
const mineLoading = ref(false)
const mineLoaded = ref(false)

async function reloadMine() {
  if (!user.value) return
  mineLoading.value = true
  try {
    const data = await fetchMyDecks()
    myDecks.value = data.decks || []
    mineLoaded.value = true
  } catch (e) {
    toast.error(e.message || '我的卡组加载失败，请稍后重试')
  } finally {
    mineLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'mine') reloadMine()
})
watch(user, (u) => {
  if (u && activeTab.value === 'mine' && !mineLoaded.value) reloadMine()
})

// ── 详情弹窗 ──
const detailVisible = ref(false)
const detailDeck = ref(null)

/** 公开卡组：按需拉详情（含代码与快照），详情弹窗优先用快照渲染。 */
async function openSquareDeck(deck) {
  try {
    const data = await fetchDeckDetail(deck.id)
    detailDeck.value = toModalDeck(data.deck)
    detailVisible.value = true
  } catch (e) {
    toast.error(e.message || '卡组详情加载失败')
  }
}

/** 我的卡组：列表已带代码与快照，直接打开。 */
function openMineDeck(deck) {
  detailDeck.value = toModalDeck(deck)
  detailVisible.value = true
}

function toModalDeck(deck) {
  return {
    code: deck.deckCode,
    name: deck.name,
    heroClass: deck.heroClass,
    gameFormat: deck.gameFormat,
    cards: deck.cards,
    cardCount: deck.cardCount,
    deckIntro: deck.description || ''
  }
}

function formatLabel(deck) {
  return FORMAT_LABELS[deck.gameFormat] || ''
}
// 成就索引按需异步加载（体积大，不静态打进页面 chunk），就绪前徽章先不显示
const achievementRefModule = ref(null)
function achievementLabel(deck) {
  const ref = achievementRefModule.value?.getAchievementRef(deck.achievementId)
  return ref ? `成就 · ${ref.name}` : ''
}
function shortTime(iso) {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? formatDateTime(d) : ''
}
function visibilityLabel(deck) {
  if (deck.visibility === 'public') return '公开'
  if (deck.visibility === 'hidden') return '已隐藏'
  return '私密'
}
function visibilityClass(deck) {
  if (deck.visibility === 'public') return 'hsd-badge-public'
  if (deck.visibility === 'hidden') return 'hsd-badge-hidden'
  return 'hsd-badge-soft'
}

// ── 编辑弹窗 ──
const editVisible = ref(false)
const editDialogEl = ref(null)
const editForm = reactive({ id: 0, name: '', description: '', visibility: 'private' })
const editSaving = ref(false)
const editError = ref('')
const editWasHidden = computed(() => {
  const current = myDecks.value.find((d) => d.id === editForm.id)
  return current?.visibility === 'hidden'
})
useDialogFocus(editVisible, editDialogEl, closeEditDialog)

function openEditDialog(deck) {
  editForm.id = deck.id
  editForm.name = deck.name
  editForm.description = deck.description || ''
  editForm.visibility = deck.visibility === 'public' ? 'public' : 'private'
  editError.value = ''
  editVisible.value = true
}

function closeEditDialog() {
  if (editSaving.value) return
  editVisible.value = false
}

async function submitEdit() {
  if (editSaving.value) return
  const name = editForm.name.trim()
  if (!name) {
    editError.value = '卡组名称不能为空'
    return
  }
  editSaving.value = true
  editError.value = ''
  try {
    const data = await updateDeck(editForm.id, {
      name,
      description: editForm.description,
      visibility: editForm.visibility
    })
    const idx = myDecks.value.findIndex((d) => d.id === editForm.id)
    if (idx >= 0) myDecks.value.splice(idx, 1, { ...myDecks.value[idx], ...data.deck })
    editVisible.value = false
    toast.success('卡组已更新')
  } catch (e) {
    editError.value = e.message || '保存失败，请稍后重试'
  } finally {
    editSaving.value = false
  }
}

// ── 删除（二次点击确认，两秒未确认自动复位）──
const deleteArmedId = ref(0)
let deleteArmTimer = null

async function removeDeck(deck) {
  if (deleteArmedId.value !== deck.id) {
    deleteArmedId.value = deck.id
    clearTimeout(deleteArmTimer)
    deleteArmTimer = setTimeout(() => { deleteArmedId.value = 0 }, 2500)
    return
  }
  clearTimeout(deleteArmTimer)
  deleteArmedId.value = 0
  try {
    await deleteDeckApi(deck.id)
    myDecks.value = myDecks.value.filter((d) => d.id !== deck.id)
    toast.success('卡组已删除')
  } catch (e) {
    toast.error(e.message || '删除失败，请稍后重试')
  }
}

onMounted(() => {
  initAuth().catch(() => {})
  import('../utils/achievementRefs.js')
    .then((module) => { achievementRefModule.value = module })
    .catch(() => {})
  reloadSquare()
  if (activeTab.value === 'mine' && user.value) reloadMine()
})
</script>

<style scoped>
.hsd-wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding-bottom: 64px;
}

/* 头部 */
.hsd-head { margin-bottom: 20px; }
.hsd-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  color: var(--hs-muted);
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  transition: all .15s;
}
.hsd-back:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }
.hsd-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #a7472f;
}
.hsd-head h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 800;
  color: var(--hs-text);
}
.hsd-sub {
  margin: 0;
  max-width: 640px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--hs-muted);
}
.hsd-title-block + .hs-tool-nav { margin-top: 16px; }

/* Tab */
.hsd-tabs {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 18px;
  padding: 4px;
  border-radius: 12px;
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
}
.hsd-tab {
  padding: 8px 20px;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  color: var(--hs-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all .15s;
}
.hsd-tab-active {
  color: var(--hs-text);
  background: var(--hs-surface-raised);
  box-shadow: var(--hs-shadow-soft, 0 1px 4px rgba(15, 23, 42, .12));
}

/* 筛选行 */
.hsd-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}
.hsd-search {
  flex: 1 1 220px;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  font-size: 14px;
}
.hsd-select {
  height: 40px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  font-size: 14px;
}
.hsd-search:focus,
.hsd-select:focus,
.hsd-input:focus {
  outline: none;
  border-color: var(--hs-focus);
  box-shadow: 0 0 0 3px var(--hs-focus);
}
.hsd-filter-btn {
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--hs-primary);
  border: none;
  cursor: pointer;
  transition: filter .15s;
}
.hsd-filter-btn:hover { filter: brightness(1.08); }

/* 卡组网格 */
.hsd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.hsd-deck-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-height: 100%;
  padding: 16px;
  text-align: left;
  border-radius: 14px;
  background: var(--hs-surface-raised);
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-shadow-soft, 0 1px 4px rgba(15, 23, 42, .08));
  color: inherit;
  cursor: pointer;
  transition: all .15s;
  font: inherit;
}
button.hsd-deck-card:hover { border-color: var(--hs-gold-soft, var(--hs-border)); transform: translateY(-1px); }
.hsd-deck-top { display: flex; flex-wrap: wrap; gap: 6px; }
.hsd-badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .04em;
  color: #fff;
  background: linear-gradient(135deg, #e65100, #f57c00);
}
.hsd-badge-soft {
  color: var(--hs-muted);
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
}
.hsd-badge-public {
  color: #15803d;
  background: rgba(21, 128, 61, .12);
  border: 1px solid rgba(21, 128, 61, .35);
}
.hsd-badge-ach {
  color: #b45309;
  background: rgba(180, 83, 9, .1);
  border: 1px solid rgba(180, 83, 9, .35);
}
.hsd-badge-hidden {
  color: #b91c1c;
  background: rgba(185, 28, 28, .1);
  border: 1px solid rgba(185, 28, 28, .35);
}
.hsd-deck-name {
  font-size: 16px;
  font-weight: 800;
  color: var(--hs-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hsd-deck-desc {
  font-size: 13px;
  line-height: 1.6;
  color: var(--hs-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hsd-deck-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--hs-muted);
}
.hsd-dot { opacity: .5; }

/* 我的卡组卡片：主体可点 + 底部操作行 */
.hsd-deck-own { padding: 0; cursor: default; }
.hsd-deck-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 16px 16px 10px;
  text-align: left;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.hsd-own-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px 12px;
}

/* 状态与分页 */
.hsd-state {
  margin: 24px 0;
  font-size: 14px;
  color: var(--hs-muted);
}
.hsd-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 20px;
}
.hsd-pager-info { font-size: 13px; font-weight: 700; color: var(--hs-muted); }
.hsd-tiny-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-text);
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  cursor: pointer;
  transition: all .15s;
}
.hsd-tiny-btn:hover { background: var(--hs-surface-overlay); }
.hsd-tiny-btn:disabled { opacity: .45; cursor: not-allowed; }
.hsd-tiny-danger {
  color: #b91c1c;
  border-color: rgba(185, 28, 28, .45);
  background: rgba(185, 28, 28, .08);
}
.hsd-tiny-danger:hover { background: rgba(185, 28, 28, .16); }

/* 编辑弹窗 */
.hsd-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, .55);
  backdrop-filter: blur(2px);
}
.hsd-dialog {
  width: 100%;
  max-width: 460px;
  max-height: min(86vh, 640px);
  overflow-y: auto;
  padding: 22px;
  border-radius: 16px;
  background: var(--hs-surface-raised, #fff);
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-shadow-strong, 0 24px 48px rgba(15, 23, 42, .25));
}
.hsd-dialog-title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 800;
  color: var(--hs-text);
}
.hsd-label {
  display: block;
  margin: 12px 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--hs-text-soft);
}
.hsd-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  font-size: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.hsd-desc {
  min-height: 72px;
  resize: vertical;
  font-family: inherit;
}
.hsd-visibility {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 14px;
}
.hsd-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-text-soft);
  cursor: pointer;
}
.hsd-radio input { accent-color: var(--hs-primary); }
.hsd-warn {
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #b45309;
}
.hsd-error {
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
}
.hsd-dialog-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}
.hsd-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--hs-primary);
  border: none;
  cursor: pointer;
  transition: filter .15s;
}
.hsd-btn:hover { filter: brightness(1.08); }
.hsd-btn:disabled { opacity: .55; cursor: not-allowed; }

@media (max-width: 640px) {
  .hsd-head h1 { font-size: 24px; }
  .hsd-tabs { width: 100%; }
  .hsd-tab { flex: 1; }
}
</style>
