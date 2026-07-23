<template>
  <div v-if="visible && deck" class="ddm-overlay" @click.self="$emit('close')">
    <div class="ddm-modal" role="dialog" aria-modal="true" aria-labelledby="ddm-title">
      <button class="ddm-close" type="button" aria-label="关闭" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <!-- 顶部信息区：职业标签 + 卡组名 -->
      <div class="ddm-header">
        <span class="ddm-class-tag">{{ displayClass }}</span>
        <h3 id="ddm-title" class="ddm-title">{{ deck.name }}</h3>
        <p v-if="decoded.valid" class="ddm-meta">共 {{ decoded.total }} 张</p>
      </div>

      <!-- 卡牌列表 + 详情预览（旅法师营地风格） -->
      <div v-if="decoded.valid && decoded.cards.length" class="ddm-body">
        <div class="ddm-cards">
          <ul class="ddm-card-list">
            <li
              v-for="(c, idx) in decoded.cards"
              :key="c.dbfId + '-' + c.count + '-' + idx"
              class="ddm-card-row"
              :class="{ 'ddm-card-active': selectedCard && selectedCard.dbfId === c.dbfId }"
              :title="c.name + ' · ' + (c.cost ?? '?') + '费' + (c.rarity ? ' · ' + c.rarity : '')"
              @click="selectCard(c)"
            >
              <!-- 费用宝石（六边形，按职业着色） -->
              <span class="ddm-cost-gem" :class="'ddm-cost-' + (c.cardClass || 'neutral')">
                <svg class="ddm-cost-svg" viewBox="0 0 28 32"><polygon points="14,0 27.5,8 27.5,24 14,32 0.5,24 0.5,8"/></svg>
                <span class="ddm-cost-num">{{ c.cost ?? '?' }}</span>
              </span>
              <!-- 类型图标 -->
              <span class="ddm-type-icon" :class="'ddm-type-' + (c.type || '').toLowerCase()" :aria-label="c.type || ''">
                <template v-if="c.type === 'MINION' || !c.type">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H3zm1 9V5l4 3-4 3z"/></svg>
                </template>
                <template v-else-if="c.type === 'SPELL'">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1C4.5 1 2 4 2 7v3c0 2.5 2 4.5 4 5.5L8 17l2-1.5c2-1 4-3 4-5.5V7c0-3-2.5-6-6-6zm0 2c2.5 0 4 2 4 4.5V10c0 1.5-1.5 3-3 4-1.5-1-3-2.5-3-4V7.5C4 5 5.5 3 8 3z"/></svg>
                </template>
                <template v-else-if="c.type === 'WEAPON'">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 2.5L11 5 11 8 5 14 2 14 2 11 8 5 11 5 13.5 2.5zM12 4L6 10"/></svg>
                </template>
                <template v-else-if="c.type === 'HERO'">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3z"/></svg>
                </template>
                <template v-else-if="c.type === 'LOCATION'">
                  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 12h12V5l-6-3-6 3v7zm6-8 4 2v5H4V6l4-2z"/></svg>
                </template>
              </span>
              <!-- 牌名（按稀有度着色） -->
              <span class="ddm-card-name-wrap">
                <span class="ddm-card-name" :class="getRarityClass(c.rarity)">{{ c.name }}</span>
              </span>
              <!-- 卡牌缩略图 -->
              <img
                v-if="c.cropImage"
                :src="c.cropImage"
                :alt="c.name"
                class="ddm-card-art"
                loading="lazy"
                @error="onImgError($event, c)"
              />
              <span v-else class="ddm-card-art ddm-art-placeholder"></span>
              <!-- 数量 -->
              <span class="ddm-count">{{ c.count }}</span>
            </li>
          </ul>
        </div>

        <!-- 卡牌详情面板 -->
        <div class="ddm-detail">
          <div v-if="selectedCard" class="ddm-detail-card">
            <img
              v-if="detailImage"
              :src="detailImage"
              :alt="selectedCard.name"
              class="ddm-detail-image"
              loading="eager"
              @error="onDetailImgError($event)"
            />
            <div v-else class="ddm-detail-placeholder">
              <p>暂无「{{ selectedCard.name }}」的大图</p>
            </div>
            <p class="ddm-detail-name" :class="getRarityClass(selectedCard.rarity)">{{ selectedCard.name }}</p>
          </div>
          <div v-else class="ddm-detail-hint">
            <p>点击左侧卡牌查看详情</p>
          </div>
        </div>
      </div>

      <div v-else-if="!decoded.valid" class="ddm-empty">
        <p>卡组码解析失败，请检查代码是否完整。</p>
      </div>

      <!-- 卡组介绍 -->
      <div v-if="deck.deckIntro" class="ddm-intro">
        <p class="ddm-intro-label">卡组介绍</p>
        <p class="ddm-intro-text">{{ deck.deckIntro }}</p>
      </div>

      <!-- 操作栏：复制代码 + 提示 -->
      <div class="ddm-actions">
        <button class="ddm-copy-btn" type="button" :class="{ 'ddm-copied': copied }" @click="copy">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          {{ copied ? '已复制' : '复制代码' }}
        </button>
        <p class="ddm-hint">复制后在游戏内「新游戏」→「导入卡组」粘贴即可使用。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { decodeDeck } from '../utils/deckstring.js'
import { getRarityClass, getCardFullImage, CDN_BASE } from '../utils/cardImages.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  deck: { type: Object, default: null }
})
const emit = defineEmits(['close'])

const decoded = computed(() => (props.deck ? decodeDeck(props.deck.code) : { valid: false, heroClass: '未知', total: 0, cards: [] }))
const displayClass = computed(() => (props.deck && props.deck.heroClass) || decoded.value.heroClass)
const copied = ref(false)
const selectedCard = ref(null)
const detailImage = ref('')

function selectCard(card) {
  selectedCard.value = card
  detailImage.value = getCardFullImage(card.name, card.id)
}

function onImgError(e, card) {
  // 本地缩略图缺失时回退官方 CDN，确保部署后（即便本地图片未随仓库发布）也不破图
  if (card && card.id && !String(e.target.src).startsWith('http')) {
    e.target.src = `${CDN_BASE}/${card.id}.png`
    e.target.onerror = null
    return
  }
  e.target.style.display = 'none'
}

function onDetailImgError(e) {
  // 本地大图加载失败时，尝试 CDN 回退
  if (selectedCard.value && selectedCard.value.id && !detailImage.value.startsWith('http')) {
    detailImage.value = `${CDN_BASE}/${selectedCard.value.id}.png`
    return
  }
  e.target.style.display = 'none'
}

async function copy() {
  if (!props.deck) return
  try {
    await navigator.clipboard.writeText(props.deck.code)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.deck.code
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// 弹窗打开时默认选中第一张有图的卡牌
watch(() => props.visible, (show) => {
  if (show && decoded.value.cards.length) {
    const first = decoded.value.cards.find(c => c.fullImage) || decoded.value.cards[0]
    selectCard(first)
  } else if (!show) {
    selectedCard.value = null
    detailImage.value = ''
  }
})
</script>

<style scoped>
.ddm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}
.ddm-modal {
  position: relative;
  width: 100%;
  max-width: 960px;
  padding: 28px 30px 24px;
  border: 1px solid var(--hs-border);
  border-radius: 20px;
  color: var(--hs-text);
  background: var(--hs-surface-raised);
  box-shadow: var(--hs-shadow-strong);
  max-height: 88vh;
  overflow-y: auto;
}
.ddm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--hs-border);
  border-radius: 10px;
  color: var(--hs-muted);
  background: var(--hs-surface-soft);
  cursor: pointer;
  transition: all .18s;
}
.ddm-close:hover { color: var(--hs-text); background: var(--hs-surface-overlay); }

/* ── 顶部信息区 ── */
.ddm-header { margin-bottom: 16px; }
.ddm-class-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #e65100, #f57c00);
  color: #fff;
}
.ddm-title { margin: 8px 0 2px; color: var(--hs-text); font-size: 22px; font-weight: 700; }
.ddm-meta { margin: 0; color: var(--hs-muted); font-size: 13px; }

/* ── 主体：列表 + 详情 ── */
.ddm-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  margin-bottom: 18px;
}

/* ── 卡牌列表（旅法师营地风格）── */
.ddm-cards {
  padding: 12px;
  border-radius: 14px;
  background: var(--hs-inset-bg);
  border: 1px solid var(--hs-border);
}
.ddm-card-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}
.ddm-card-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: background .12s;
}
.ddm-card-row:hover { background: var(--hs-surface-soft); }
.ddm-card-row.ddm-card-active { background: var(--hs-surface-overlay); }

/* 费用宝石（六边形） */
.ddm-cost-gem {
  position: relative;
  flex: 0 0 auto;
  width: 22px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ddm-cost-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ddm-cost-svg polygon {
  stroke: var(--hs-border);
  stroke-width: 0.8;
}
/* 各职业费用宝石颜色 */
.ddm-cost-warrior   .ddm-cost-svg polygon { fill: #c0392b; } /* 战士·红 */
.ddm-cost-paladin  .ddm-cost-svg polygon { fill: #f1c40f; } /* 圣骑士·金 */
.ddm-cost-hunter    .ddm-cost-svg polygon { fill: #27ae60; } /* 猎人·绿 */
.ddm-cost-rogue     .ddm-cost-svg polygon { fill: #2c3e50; } /* 潜行者·黑 */
.ddm-cost-priest    .ddm-cost-svg polygon { fill: #ecf0f1; } /* 牧师·白 */
.ddm-cost-shaman    .ddm-cost-svg polygon { fill: #2980b9; } /* 萨满·蓝 */
.ddm-cost-mage      .ddm-cost-svg polygon { fill: #8e44ad; } /* 法师·紫 */
.ddm-cost-warlock   .ddm-cost-svg polygon { fill: #795548; } /* 术士·棕 */
.ddm-cost-druid     .ddm-cost-svg polygon { fill: #d35400; } /* 德鲁伊·橙 */
.ddm-cost-demonhunter .ddm-cost-svg polygon { fill: #8b0000; } /* 恶魔猎手·暗红 */
.ddm-cost-deathknight .ddm-cost-svg polygon { fill: #607d8b; } /* 死亡骑士·蓝灰 */
.ddm-cost-neutral   .ddm-cost-svg polygon { fill: #555; } /* 中立·灰 */
.ddm-cost-num {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,.6);
  pointer-events: none;
}
.ddm-cost-priest .ddm-cost-num { color: #333; text-shadow: 0 0 1px rgba(0,0,0,.3); }

/* 类型图标 */
.ddm-type-icon {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  opacity: .75;
}
.ddm-type-icon svg { width: 100%; height: 100%; }

/* 牌名（按稀有度着色） */
.ddm-card-name-wrap {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}
.ddm-card-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  letter-spacing: .02em;
}
.ddm-rarity-common   { color: var(--hs-text); }  /* 白卡：跟随主题（亮色=黑字，暗色=白字） */
.ddm-rarity-rare     { color: #2563eb; }
.ddm-rarity-epic     { color: #9333ea; }
.ddm-rarity-legendary{ color: #f97316; }

/* 卡牌缩略图 */
.ddm-card-art {
  flex: 0 0 auto;
  width: 64px;
  height: 22px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--hs-border);
  opacity: .9;
  transition: opacity .15s;
}
.ddm-card-row:hover .ddm-card-art { opacity: 1; }
.ddm-art-placeholder {
  background: var(--hs-surface-soft);
}

/* 数量 */
.ddm-count {
  flex: 0 0 auto;
  min-width: 18px;
  height: 22px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--hs-gold);
  background: rgba(217, 119, 6, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.25);
}

/* ── 卡牌详情面板 ── */
.ddm-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  padding: 16px;
  border-radius: 14px;
  background: var(--hs-inset-bg);
  border: 1px solid var(--hs-border);
}
.ddm-detail-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.ddm-detail-image {
  width: 100%;
  max-width: 260px;
  border-radius: 12px;
  box-shadow: var(--hs-shadow-strong);
}
.ddm-detail-name {
  margin: 14px 0 0;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
}
.ddm-detail-hint,
.ddm-detail-placeholder {
  color: var(--hs-muted);
  font-size: 13px;
  text-align: center;
}
.ddm-detail-placeholder p { margin: 0; }

/* ── 卡组介绍 ── */
.ddm-intro {
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--hs-surface-soft);
  border: 1px solid var(--hs-border);
}
.ddm-intro-label {
  margin: 0 0 6px;
  color: var(--hs-text-soft);
  font-size: 12px;
  font-weight: 700;
}
.ddm-intro-text {
  margin: 0;
  color: var(--hs-muted);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-line;
}

/* ── 空状态 ── */
.ddm-empty {
  margin-bottom: 18px;
  padding: 24px;
  border-radius: 12px;
  color: var(--hs-muted);
  text-align: center;
  background: var(--hs-surface-soft);
}

/* ── 操作栏 ── */
.ddm-actions { margin-top: 4px; }
.ddm-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border: 1px solid rgba(74, 222, 128, 0.4);
  border-radius: 10px;
  color: #16a34a;
  background: rgba(74, 222, 128, 0.08);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
}
.ddm-copy-btn:hover { background: rgba(74, 222, 128, 0.16); border-color: rgba(74, 222, 128, 0.6); }
.ddm-copied { color: #fff; background: #16a34a; border-color: #16a34a; }
.ddm-hint { margin: 8px 0 0; color: var(--hs-muted); font-size: 12px; }

/* focus */
.ddm-close:focus-visible,
.ddm-copy-btn:focus-visible,
.ddm-card-row:focus-visible {
  outline: 3px solid var(--hs-focus);
  outline-offset: 2px;
}


/* 暗色主题：稀有度文字在深色表面提亮，保证对比度 */
.hs-page[data-hs-theme="dark"] .ddm-rarity-rare { color: #60a5fa; }
.hs-page[data-hs-theme="dark"] .ddm-rarity-epic { color: #c084fc; }
.hs-page[data-hs-theme="dark"] .ddm-rarity-legendary { color: #fb923c; }
@media (max-width: 760px) {
  .ddm-modal { padding: 22px 16px 18px; max-width: calc(100vw - 32px); }
  .ddm-body { grid-template-columns: 1fr; }
  .ddm-detail { min-height: auto; order: -1; }
  .ddm-detail-image { max-width: 220px; }
  .ddm-card-list { grid-template-columns: 1fr; }
  .ddm-card-art { width: 56px; height: 20px; }
}
</style>
