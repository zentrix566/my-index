<template>
  <section class="section page-section hs-page" :data-hs-theme="hsTheme">
    <div class="container">
      <div class="dcv-wrap">
        <!-- 头部：返回 + 标题 + 主题切换 -->
        <div class="dcv-head">
          <div class="dcv-title-block">
            <router-link to="/hearthstone" class="dcv-back" aria-label="返回炉石成就查看器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              返回炉石成就
            </router-link>
            <p class="dcv-eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Deck Code Tool</p>
            <h1>炉石卡组代码解析</h1>
            <p class="dcv-sub">粘贴游戏内复制的卡组代码，立即查看卡组构成、法力曲线、合成造价，并可导出卡组图片。</p>
          </div>
          <!--
          <button
            type="button"
            class="dcv-theme"
            @click="toggleTheme"
            :aria-label="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
            :title="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
          >
            <svg v-if="hsTheme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
            </svg>
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
            {{ hsTheme === 'dark' ? '明亮' : '暗色' }}
          </button>
          -->
        </div>

        <!-- 输入卡片 -->
        <div class="dcv-card">
          <label class="dcv-label" for="dcv-name">卡组名称（可选）</label>
          <input
            id="dcv-name"
            v-model="deckName"
            class="dcv-input"
            type="text"
            maxlength="40"
            placeholder="不填则自动命名为「职业 + 卡组」"
            @input="clearError"
          />

          <label class="dcv-label" for="dcv-code">卡组代码</label>
          <textarea
            id="dcv-code"
            ref="codeEl"
            v-model="code"
            class="dcv-textarea"
            spellcheck="false"
            autocomplete="off"
            placeholder="在此粘贴卡组代码，例如：AAECAf7gBgL/lwbO8QYO9eMEh/YEmMQFhY4G/7oGkMsG/eYGwOgGn/EGrPEGwvEG4/EGqPcG//cGAAA="
            @input="clearError"
            @paste="onPaste"
          ></textarea>

          <div class="dcv-actions">
            <button type="button" class="dcv-btn dcv-primary" :disabled="analyzing" @click="analyze">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-4"/><path d="M12 14V4"/><path d="m8 8 4-4 4 4"/></svg>
              {{ analyzing ? '正在加载卡牌数据库...' : '解析卡组代码' }}
            </button>
            <button type="button" class="dcv-btn dcv-ghost" @click="pasteFromClipboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              从剪贴板粘贴
            </button>
            <button type="button" class="dcv-btn dcv-ghost" @click="fillSample">填入示例</button>
            <button v-if="canSave" type="button" class="dcv-btn dcv-save" @click="openSaveDialog">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              保存到我的卡组
            </button>
          </div>

          <p v-if="error" class="dcv-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            {{ error }}
          </p>
          <p v-else-if="hint" class="dcv-hint">{{ hint }}</p>
        </div>

        <!-- 使用提示 -->
        <div class="dcv-tips">
          <h4>如何获取卡组代码</h4>
          <ol>
            <li>游戏中打开一副卡组，点击「复制」按钮即可获得分享码；</li>
            <li>或在炉石盒子、旅法师营地等站点复制他人分享的卡组代码；</li>
            <li>把整段代码粘贴到上方文本框，点击「解析卡组代码」（直接 Ctrl/⌘+V 粘贴也会自动解析）。</li>
          </ol>
        </div>

        <!-- 复用现成的卡组详情弹窗 -->
        <DeckDetailModal
          v-if="modalVisible"
          :visible="modalVisible"
          :deck="deckData"
          @close="modalVisible = false"
        />

        <!-- 保存卡组弹窗 -->
        <div v-if="saveDialogVisible" class="dcv-overlay" @click.self="closeSaveDialog">
          <div
            ref="saveDialogEl"
            class="dcv-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dcv-save-title"
          >
            <h3 id="dcv-save-title" class="dcv-dialog-title">保存到我的卡组</h3>
            <p class="dcv-dialog-sub">{{ saveSummary }}</p>
            <label class="dcv-label" for="dcv-save-name">卡组名称</label>
            <input
              id="dcv-save-name"
              v-model="saveForm.name"
              class="dcv-input"
              type="text"
              maxlength="50"
              placeholder="不填则自动命名为「职业 + 卡组」"
            />
            <label class="dcv-label" for="dcv-save-desc">描述（可选）</label>
            <textarea
              id="dcv-save-desc"
              v-model="saveForm.description"
              class="dcv-textarea dcv-desc"
              maxlength="200"
              placeholder="给其他玩家介绍一下这套卡组（200 字以内）"
            ></textarea>
            <label class="dcv-label" for="dcv-ach-search">关联成就（可选）</label>
            <div v-if="!saveForm.achievementId" class="dcv-ach-picker">
              <input
                id="dcv-ach-search"
                v-model="achievementQuery"
                class="dcv-input"
                type="text"
                autocomplete="off"
                placeholder="搜索成就名称或编号，关联后其他玩家在该成就下可见"
                @input="onAchievementQuery"
              />
              <ul v-if="achievementCandidates.length" class="dcv-ach-list">
                <li v-for="ref in achievementCandidates" :key="ref.id">
                  <button type="button" class="dcv-ach-item" @click="selectAchievement(ref)">
                    <span class="dcv-ach-name">{{ ref.name }}</span>
                    <small class="dcv-ach-meta">{{ ref.version }} · {{ ref.heroClass }}</small>
                  </button>
                </li>
              </ul>
            </div>
            <div v-else class="dcv-ach-chip">
              <span class="dcv-ach-chip-text">🎯 {{ saveAchievementLabel }}</span>
              <button type="button" class="dcv-ach-clear" @click="clearAchievement">移除关联</button>
            </div>
            <div class="dcv-visibility">
              <label class="dcv-radio">
                <input v-model="saveForm.visibility" type="radio" value="private" />
                <span>私密 · 仅自己可见</span>
              </label>
              <label class="dcv-radio">
                <input v-model="saveForm.visibility" type="radio" value="public" />
                <span>公开 · 所有人可见</span>
              </label>
            </div>
            <p v-if="saveError" class="dcv-error" role="alert">{{ saveError }}</p>
            <div class="dcv-dialog-actions">
              <button type="button" class="dcv-btn dcv-ghost" :disabled="savingDeck" @click="closeSaveDialog">取消</button>
              <button type="button" class="dcv-btn dcv-primary" :disabled="savingDeck" @click="submitSave">
                {{ savingDeck ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { defineAsyncComponent, ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import { useAuth } from '../../../auth/useAuth.js'
import { useToast } from '../../../composables/useToast.js'
import { createDeck } from '../api/decks.js'

const DeckDetailModal = defineAsyncComponent(
  () => import('../components/DeckDetailModal.vue')
)
const { hsTheme } = useHearthstoneTheme()

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { user, init: initAuth } = useAuth()

const code = ref('')
const deckName = ref('')
const error = ref('')
const hint = ref('')
const analyzing = ref(false)
const modalVisible = ref(false)
const deckData = ref(null)
const codeEl = ref(null)

// 最近一次解析成功的卡组（保存入口依赖它，代码再改动后需重新解析）
const analyzed = ref(null)
const canSave = computed(() => Boolean(analyzed.value && analyzed.value.code === (code.value || '').trim()))

const saveDialogVisible = ref(false)
const saveDialogEl = ref(null)
const saveForm = reactive({ name: '', description: '', visibility: 'private', achievementId: '' })
const savingDeck = ref(false)
const saveError = ref('')
const achievementQuery = ref('')
const achievementCandidates = ref([])
const saveSummary = computed(() =>
  analyzed.value ? `「${analyzed.value.heroClass}」卡组 · 共 ${analyzed.value.total || ''} 张` : ''
)
const saveAchievementLabel = computed(() => {
  const ref = achievementRefModule.value?.getAchievementRef(saveForm.achievementId)
  if (!saveForm.achievementId) return ''
  return ref ? `${ref.name}（${ref.version}）` : '成就索引加载中…'
})
useDialogFocus(saveDialogVisible, saveDialogEl, closeSaveDialog)

// 成就索引体积大（连带全部版本成就数据），只能按需异步加载，不静态打进页面 chunk
const achievementRefModule = ref(null)
const loadAchievementRefs = async () => {
  if (!achievementRefModule.value) {
    achievementRefModule.value = await import('../utils/achievementRefs.js')
  }
  return achievementRefModule.value
}

const SAMPLE = 'AAECAf7gBgL/lwbO8QYO9eMEh/YEmMQFhY4G/7oGkMsG/eYGwOgGn/EGrPEGwvEG4/EGqPcG//cGAAA='

function clearError() {
  error.value = ''
}

let deckDecoderPromise
function getDeckDecoder() {
  if (!deckDecoderPromise) {
    deckDecoderPromise = import('../utils/deckstring.js')
  }
  return deckDecoderPromise
}

async function analyze() {
  if (analyzing.value) return
  const raw = (code.value || '').trim()
  if (!raw) {
    error.value = '请先粘贴卡组代码。'
    hint.value = ''
    return
  }
  analyzing.value = true
  try {
    const { decodeDeck } = await getDeckDecoder()
    const decoded = decodeDeck(raw)
    if (!decoded.valid) {
      error.value = '卡组代码无法解析，请确认代码完整、未被截断，且不含多余空格或换行。'
      hint.value = ''
      analyzed.value = null
      return
    }
    error.value = ''
    hint.value = `已识别为「${decoded.heroClass}」卡组，共 ${decoded.total} 张，点击下方卡片可查看大图。`
    analyzed.value = { code: raw, heroClass: decoded.heroClass, total: decoded.total }
    const name = deckName.value.trim() || `${decoded.heroClass}卡组`
    deckData.value = { code: raw, name, heroClass: decoded.heroClass, deckIntro: '' }
    modalVisible.value = true
    // 把当前卡组代码写进 URL，便于分享/深链（不新增历史记录）
    if (route.query.code !== raw) {
      router.replace({ query: { ...route.query, code: raw } }).catch(() => {})
    }
  } catch {
    error.value = '卡牌数据库加载失败，请刷新页面后重试。'
    hint.value = ''
  } finally {
    analyzing.value = false
  }
}

// 在文本框内粘贴：拦截默认插入，直接取剪贴板文本并解析（体验更顺）
function onPaste(e) {
  const text = e.clipboardData?.getData('text')
  if (!text) return
  e.preventDefault()
  code.value = text.trim()
  analyze()
}

// 主动读取系统剪贴板（需用户手势 + 安全上下文）
async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text && text.trim()) {
      code.value = text.trim()
      analyze()
    } else {
      error.value = '剪贴板为空，请手动粘贴（Ctrl/⌘+V）。'
    }
  } catch {
    error.value = '浏览器阻止了剪贴板读取，请直接把卡组代码粘贴到文本框（Ctrl/⌘+V）。'
  }
}

function fillSample() {
  code.value = SAMPLE
  deckName.value = ''
  error.value = ''
  analyze()
}

// ── 保存到我的卡组 ──

function openSaveDialog() {
  if (!user.value) {
    toast.error('请先登录后再保存卡组')
    router.push({ path: '/login', query: { redirect: route.fullPath, source: 'hearthstone' } })
    return
  }
  saveForm.name = deckName.value.trim()
  saveForm.description = ''
  saveForm.visibility = 'private'
  saveError.value = ''
  achievementQuery.value = ''
  achievementCandidates.value = []
  // 成就页「分享卡组」深链接：?achievement=<slug> 预选关联成就（无效 slug 忽略）
  const preset = typeof route.query.achievement === 'string' ? route.query.achievement : ''
  if (preset) {
    void loadAchievementRefs().then((module) => {
      const presetRef = module.getAchievementRef(preset)
      if (presetRef && saveDialogVisible.value && !saveForm.achievementId) {
        saveForm.achievementId = presetRef.id
      }
    })
  }
  saveDialogVisible.value = true
}

function closeSaveDialog() {
  if (savingDeck.value) return
  saveDialogVisible.value = false
}

function onAchievementQuery() {
  const module = achievementRefModule.value
  if (!module) {
    // 索引尚未就绪：先加载再搜索
    void loadAchievementRefs().then(() => onAchievementQuery())
    return
  }
  achievementCandidates.value = module.searchAchievements(achievementQuery.value, 6)
}

function selectAchievement(ref) {
  saveForm.achievementId = ref.id
  achievementQuery.value = ''
  achievementCandidates.value = []
}

function clearAchievement() {
  saveForm.achievementId = ''
}

async function submitSave() {
  if (savingDeck.value || !analyzed.value) return
  savingDeck.value = true
  saveError.value = ''
  try {
    await createDeck({
      deckCode: analyzed.value.code,
      name: saveForm.name,
      description: saveForm.description,
      visibility: saveForm.visibility,
      achievementId: saveForm.achievementId || undefined
    })
    saveDialogVisible.value = false
    toast.success(saveForm.achievementId ? '卡组已保存并关联成就，可在成就页「玩家分享」中查看' : '卡组已保存，可在「卡组广场 · 我的卡组」中查看')
  } catch (e) {
    saveError.value = e.message || '保存失败，请稍后重试'
  } finally {
    savingDeck.value = false
  }
}

onMounted(() => {
  initAuth().catch(() => {})
  // 后台预热重型资源：卡组解码 chunk（约 1.3MB）与详情弹窗 chunk，
  // 首次点「解析」时即已就绪，避免主线程集中解析大 JSON 造成灰屏卡顿
  getDeckDecoder().catch(() => {})
  import('../components/DeckDetailModal.vue').catch(() => {})
  loadAchievementRefs().catch(() => {})
  const c = route.query.code
  if (typeof c === 'string' && c.trim()) {
    code.value = c.trim()
    analyze()
  }
})
</script>

<style scoped>
.dcv-wrap {
  max-width: 880px;
  margin: 0 auto;
  padding-bottom: 64px;
}

/* 头部 */
.dcv-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.dcv-title-block { min-width: 0; }
.dcv-back {
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
.dcv-back:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }
.dcv-eyebrow {
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
.hs-live-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #15803d; box-shadow: 0 0 0 3px rgba(21,128,61,.18);
}
.dcv-title-block h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 800;
  color: var(--hs-text);
}
.dcv-sub {
  margin: 0;
  max-width: 560px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--hs-muted);
}
.dcv-theme {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--hs-text);
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  transition: all .15s;
}
.dcv-theme:hover { background: var(--hs-surface-overlay); }

/* 输入卡片 */
.dcv-card {
  padding: 22px;
  border-radius: 16px;
  background: var(--hs-surface-raised);
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-shadow-strong);
}
.dcv-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--hs-text-soft);
}
.dcv-label:first-child { margin-top: 0; }
.dcv-input,
.dcv-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--hs-border);
  background: var(--hs-inset-bg);
  color: var(--hs-text);
  font-size: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.dcv-input:focus,
.dcv-textarea:focus {
  outline: none;
  border-color: var(--hs-focus);
  box-shadow: 0 0 0 3px var(--hs-focus);
}
.dcv-textarea {
  min-height: 112px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Courier New", monospace;
  letter-spacing: .02em;
  line-height: 1.6;
}

/* 操作按钮 */
.dcv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.dcv-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all .15s;
}
.dcv-primary {
  color: #fff;
  background: var(--hs-primary);
}
.dcv-primary:hover { filter: brightness(1.08); }
.dcv-ghost {
  color: var(--hs-text);
  background: var(--hs-surface-soft);
  border-color: var(--hs-border);
}
.dcv-ghost:hover { background: var(--hs-surface-overlay); }
.dcv-save {
  color: var(--hs-gold, #b45309);
  background: var(--hs-surface-soft);
  border-color: var(--hs-gold, #b45309);
}
.dcv-save:hover { filter: brightness(1.05); background: var(--hs-surface-overlay); }

/* 保存卡组弹窗 */
.dcv-overlay {
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
.dcv-dialog {
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
.dcv-dialog-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 800;
  color: var(--hs-text);
}
.dcv-dialog-sub {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--hs-muted);
}
.dcv-desc {
  min-height: 72px;
  font-family: inherit;
  letter-spacing: normal;
}
.dcv-visibility {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 14px;
}
.dcv-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--hs-text-soft);
  cursor: pointer;
}
.dcv-radio input { accent-color: var(--hs-primary); }
.dcv-ach-picker { position: relative; }
.dcv-ach-list {
  position: absolute;
  z-index: 5;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: 10px;
  background: var(--hs-surface-raised, #fff);
  border: 1px solid var(--hs-border);
  box-shadow: var(--hs-shadow-strong, 0 12px 24px rgba(15, 23, 42, .18));
}
.dcv-ach-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--hs-text);
  font-size: 13px;
  cursor: pointer;
}
.dcv-ach-item:hover { background: var(--hs-surface-overlay, rgba(148, 163, 184, .14)); }
.dcv-ach-name { font-weight: 700; }
.dcv-ach-meta { color: var(--hs-muted); font-size: 12px; white-space: nowrap; }
.dcv-ach-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px 7px 12px;
  border-radius: 9px;
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
}
.dcv-ach-chip-text { font-size: 13px; font-weight: 700; color: var(--hs-text); }
.dcv-ach-clear {
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--hs-muted);
  background: transparent;
  border: 1px solid var(--hs-border);
  cursor: pointer;
}
.dcv-ach-clear:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }
.dcv-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

/* 提示 */
.dcv-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 14px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
}
.dcv-hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--hs-muted);
}

/* 使用提示 */
.dcv-tips {
  margin-top: 22px;
  padding: 16px 18px;
  border-radius: 12px;
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
  color: var(--hs-muted);
}
.dcv-tips h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--hs-text-soft);
}
.dcv-tips ol {
  margin: 0;
  padding-left: 20px;
  line-height: 1.9;
  font-size: 13px;
}

@media (max-width: 640px) {
  .dcv-head { flex-direction: column; }
  .dcv-theme { align-self: flex-start; }
  .dcv-title-block h1 { font-size: 24px; }
}
</style>
