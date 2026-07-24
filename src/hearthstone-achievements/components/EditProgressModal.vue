<template>
  <div v-if="visible" class="epm-overlay" @click.self="$emit('close')">
    <div class="epm-modal" role="dialog" aria-modal="true" aria-labelledby="epm-title">
      <button class="epm-close" type="button" aria-label="关闭" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <p class="epm-eyebrow">更新成就进度</p>
      <h3 id="epm-title" class="epm-title">{{ achievement?.name }}</h3>
      <p class="epm-meta">{{ achievement?.dualClasses ? achievement.dualClasses.join(' / ') : achievement?.heroClass }} · {{ achievement?.difficulty }} · {{ achievement?.type }}</p>
      <p v-if="achievement?.description" class="epm-desc">{{ achievement.description }}</p>

      <!-- 关联卡牌（与浏览卡牌弹窗一致） -->
      <div v-if="hasCards" class="epm-cards">
        <p class="epm-cards-label">关联卡牌</p>
        <div class="epm-cards-grid">
          <div v-for="card in achievement.cards" :key="card.name" class="epm-card-item">
            <img v-if="hasImage(card)" :src="cardSrc(card)" :alt="card.name" class="epm-card-img" @error="onCardError(card)" />
            <p v-else class="epm-card-noimg">暂无「{{ card.name }}」的图片</p>
            <p class="epm-card-name">{{ card.name }}</p>
          </div>
        </div>
      </div>

      <!-- 一次性：阶段勾选 -->
      <div v-if="achievement?.type === '一次性'" class="epm-stages">
        <label v-for="(stage, i) in achievement.stages" :key="i" class="epm-stage">
          <input type="checkbox" v-model="draftStages[i]" />
          <span>
            阶段 {{ i + 1 }}：{{ stage.description }}
            <em class="epm-stage-points">{{ stage.xpReward }} XP / {{ stage.points }} 点</em>
          </span>
        </label>
      </div>

      <!-- 累计：count 输入 -->
      <div v-else-if="achievement" class="epm-cumulative">
        <label class="epm-count-label" for="epm-count">当前累计（{{ countUnit }}）</label>
        <div class="epm-count-control">
          <button type="button" :aria-label="`减少一${countUnit}`" @click="dec">−</button>
          <input id="epm-count" type="number" inputmode="numeric" v-model.number="draftCount" min="0" />
          <button type="button" :aria-label="`增加一${countUnit}`" @click="inc">＋</button>
          <button type="button" class="epm-max" :aria-label="直接填到完成目标" @click="setMax">MAX</button>
        </div>
        <p class="epm-quota-hint">
          各阶段目标：{{ achievement.stages.map((s) => s.quota).join(' / ') }}
          <span class="epm-max-hint">· 点 <b>MAX</b> 直接视为完成（填到 {{ maxQuota }} {{ countUnit }}）</span>
        </p>
      </div>

      <div class="epm-actions">
        <button class="epm-cancel" type="button" @click="$emit('close')">取消</button>
        <button class="epm-save" type="button" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存进度' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useAchievementProgress } from '../composables/useAchievementProgress.js'

const props = defineProps({
  visible: Boolean,
  achievement: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'save'])

const { progress, getUnit } = useAchievementProgress()

// 累计成就的度量单位（次 / 点），用于编辑弹窗标签
const countUnit = computed(() => getUnit(props.achievement))
// 累计成就的最终目标（最后阶段的 quota）：点 MAX 直接填到该值即视为完成
const maxQuota = computed(() => {
  const stages = props.achievement?.stages
  if (!stages || stages.length === 0) return 0
  return stages[stages.length - 1].quota
})
// 关联卡牌：有 relatedCards 时显示图片区域
const hasCards = computed(
  () => Array.isArray(props.achievement?.cards) && props.achievement.cards.length > 0
)
// related 图加载失败时回退到 wild 兜底图
const onCardError = (card) => {
  if (card.image && card.imageFallback) card._cardFailed = true
}
const cardSrc = (card) => (card._cardFailed ? card.imageFallback : (card.image || card.imageFallback))
const hasImage = (card) => Boolean(card.image || card.imageFallback)
const draftStages = ref({})
const draftCount = ref(0)

// 打开时从当前进度初始化草稿
watch(
  () => [props.visible, props.achievement?.id],
  () => {
    if (props.visible && props.achievement) {
      const p = progress.value[props.achievement.id] || {}
      draftCount.value = p.count || 0
      draftStages.value = { ...(p.stages || {}) }
    }
  },
  { immediate: true }
)

function inc() {
  draftCount.value = (Number(draftCount.value) || 0) + 1
}
function dec() {
  draftCount.value = Math.max(0, (Number(draftCount.value) || 0) - 1)
}
function setMax() {
  draftCount.value = maxQuota.value
}

function save() {
  if (!props.achievement || props.saving) return
  emit('save', {
    id: props.achievement.id,
    stages: { ...draftStages.value },
    count: Number(draftCount.value) || 0
  })
}
</script>

<style scoped>
.epm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.epm-modal {
  position: relative;
  width: 100%;
  max-width: 600px;
  background: #fff;
  border-radius: 14px;
  padding: 28px 26px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  max-height: 86vh;
  overflow-y: auto;
}
.epm-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: none;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
}
.epm-title {
  margin: 0 0 4px;
  font-size: 19px;
  color: #1f2937;
}
.epm-meta {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 13px;
}
.epm-desc {
  margin: 0 0 16px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}
.epm-stages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.epm-stage {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}
.epm-stage input {
  margin-top: 2px;
  width: 18px;
  height: 18px;
}
.epm-stage-points {
  display: block;
  font-style: normal;
  color: #9ca3af;
  font-size: 12px;
  margin-top: 2px;
}
.epm-cumulative {
  margin-bottom: 20px;
}
.epm-count-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}
.epm-count-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
.epm-count-control button {
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
}
.epm-count-control input {
  width: 90px;
  height: 40px;
  text-align: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
}
.epm-quota-hint {
  margin: 8px 0 0;
  color: #9ca3af;
  font-size: 12px;
}
.epm-max {
  width: 46px;
  border: 1px solid #d1d5db;
  background: #eef2ff;
  color: #4338ca;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.epm-max:hover { background: #e0e7ff; }
.epm-max-hint { color: #9ca3af; }
.epm-max-hint b { color: #4338ca; }
.epm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.epm-cards {
  margin: 0 0 18px;
}
.epm-cards-label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: #4b5563;
}
.epm-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(164px, 1fr));
  gap: 14px;
  justify-items: center;
}
.epm-card-item {
  text-align: center;
}
.epm-card-img {
  width: 100%;
  max-width: 220px;
  border-radius: 8px;
  display: block;
}
.epm-card-noimg {
  margin: 0 0 6px;
  padding: 18px 8px;
  font-size: 12px;
  color: #9ca3af;
  background: #f3f4f6;
  border-radius: 8px;
}
.epm-card-name {
  margin: 6px 0 0;
  font-size: 12px;
  color: #4b5563;
}
.epm-cancel,
.epm-save {
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.epm-cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #4b5563;
}
.epm-save {
  border: none;
  background: #6366f1;
  color: #fff;
}
.epm-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* UI Pro Max：与炉石仪表盘统一的深色表单界面。 */
.epm-overlay {
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(8px);
}
.epm-modal {
  max-width: 600px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  color: #e2e8f0;
  background: #0f1f2b;
  box-shadow: 0 28px 80px rgba(2, 6, 23, 0.5);
}
.epm-close {
  display: grid;
  width: 44px;
  height: 44px;
  top: 12px;
  right: 12px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
}
.epm-close:hover { color: #fff; background: rgba(255, 255, 255, 0.09); }
.epm-eyebrow {
  margin: 0 52px 5px 0;
  color: #4ade80;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.epm-title { margin-right: 52px; color: #f8fafc; font-size: 21px; }
.epm-meta { color: #fbbf24; }
.epm-desc { color: #94a3b8; }
.epm-stage {
  min-height: 48px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: #e2e8f0;
  background: rgba(2, 6, 23, 0.24);
}
.epm-stage input { accent-color: #22c55e; }
.epm-stage-points,
.epm-count-label,
.epm-quota-hint { color: #94a3b8; }
.epm-cards-label { color: #cbd5e1; }
.epm-card-name { color: #94a3b8; }
.epm-card-noimg { color: #64748b; background: rgba(2, 6, 23, 0.3); border: 1px solid rgba(148, 163, 184, 0.18); }
.epm-card-img { border: 1px solid rgba(148, 163, 184, 0.2); }
.epm-count-control button,
.epm-count-control input {
  height: 46px;
  border-color: rgba(148, 163, 184, 0.28);
  color: #f8fafc;
  background: rgba(2, 6, 23, 0.3);
}
.epm-count-control button { width: 46px; }
.epm-count-control input:focus { outline: 3px solid rgba(34, 197, 94, 0.2); border-color: #22c55e; }
.epm-max {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(99, 102, 241, 0.18);
  color: #c7d2fe;
}
.epm-max:hover { background: rgba(99, 102, 241, 0.3); }
.epm-max-hint,
.epm-max-hint b { color: #94a3b8; }
.epm-max-hint b { color: #c7d2fe; }
.epm-cancel,
.epm-save { min-height: 44px; border-radius: 10px; }
.epm-cancel { border-color: rgba(148, 163, 184, 0.3); color: #cbd5e1; background: transparent; }
.epm-save { background: linear-gradient(135deg, #15803d, #166534); }
.epm-close:focus-visible,
.epm-stage:focus-within,
.epm-cancel:focus-visible,
.epm-save:focus-visible {
  outline: 3px solid rgba(251, 191, 36, 0.55);
  outline-offset: 2px;
}
@media (max-width: 520px) {
  .epm-modal { padding: 24px 18px; border-radius: 15px; }
  .epm-actions > * { flex: 1; }
}
</style>
