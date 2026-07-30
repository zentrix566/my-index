<template>
  <div v-if="visible" class="epm-overlay" @click.self="$emit('close')">
    <div ref="dialogElement" class="epm-modal" role="dialog" aria-modal="true" aria-labelledby="epm-title" tabindex="-1">
      <button class="epm-close" type="button" aria-label="关闭" @click="$emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>

      <p class="epm-eyebrow">更新成就进度</p>
      <h3 id="epm-title" class="epm-title">{{ achievement?.name }}</h3>
      <p class="epm-meta">{{ getClassName(achievement) }} · {{ achievement?.difficulty }} · {{ achievement?.type }}</p>
      <p v-if="achievement?.description" class="epm-desc">{{ achievement.description }}</p>

      <!-- 关联卡牌（与浏览卡牌弹窗共用 CardGallery，展示 / 交互完全一致） -->
      <div v-if="hasCards" class="epm-cards">
        <p class="epm-cards-label">关联卡牌</p>
        <CardGallery :cards="achievement.cards" />
      </div>

      <!-- 收集类成就：记录已发现的职业 / 已使用的战利品，勾选即进度 -->
      <div v-if="isTrack" class="epm-classes">
        <p class="epm-classes-label">{{ trackLabel }}</p>
        <div class="epm-class-grid">
          <button
            v-for="item in trackList"
            :key="item"
            type="button"
            class="epm-class-chip"
            :class="{ active: draftDiscovered.includes(item), 'has-detail': !!itemDetail(item) }"
            :style="draftDiscovered.includes(item) ? trackItemStyle(item) : {}"
            :aria-pressed="draftDiscovered.includes(item)"
            @click="toggleClass(item)"
          >
            <span class="epm-class-check" aria-hidden="true">✓</span>
            <span class="epm-class-text">{{ item }}</span>
            <span v-if="itemDetail(item)" class="epm-chip-tooltip">{{ itemDetail(item) }}</span>
          </button>
        </div>
        <p class="epm-quota-hint">
          已{{ trackVerb }} <b>{{ draftDiscovered.length }}</b> 个{{ trackUnit }}，上方要求会随选择即时更新。
        </p>
      </div>

      <!-- 累计：count 输入 -->
      <div v-else-if="!isOneTime" class="epm-cumulative">
        <label class="epm-count-label" for="epm-count">当前累计（{{ countUnit }}）</label>
        <div class="epm-count-control">
          <button type="button" :aria-label="`减少一${countUnit}`" @click="dec">−</button>
          <input id="epm-count" type="number" inputmode="numeric" v-model.number="draftCount" min="0" />
          <button type="button" :aria-label="`增加一${countUnit}`" @click="inc">＋</button>
          <button type="button" class="epm-max" aria-label="直接填到完成目标" @click="setMax">MAX</button>
        </div>
        <p class="epm-quota-hint">
          上方要求会随累计数即时更新。
          <span class="epm-max-hint">点 <b>MAX</b> 可直接填到最终目标 {{ maxQuota }} {{ countUnit }}。</span>
        </p>
      </div>

      <section
        v-if="achievement?.stages?.length"
        class="epm-goals"
        :class="{ 'epm-goals-standalone': isOneTime && !hasCards }"
        aria-labelledby="epm-goals-title"
      >
        <div class="epm-goals-head">
          <h4 id="epm-goals-title">成就要求</h4>
          <span>已完成 {{ completedStageCount }} / {{ achievement.stages.length }}</span>
        </div>
        <ol class="epm-goal-list">
          <li
            v-for="(stage, i) in achievement.stages"
            :key="i"
            class="epm-goal"
            :class="{ completed: isDraftStageCompleted(i, stage) }"
          >
            <label v-if="isOneTime" class="epm-goal-main epm-goal-editable">
              <input type="checkbox" v-model="draftStages[i]" />
              <span class="epm-goal-status" aria-hidden="true">
                {{ isDraftStageCompleted(i, stage) ? '✓' : i + 1 }}
              </span>
              <span class="epm-goal-content">
                <strong>{{ stage.description }}</strong>
                <span class="epm-goal-rewards">
                  <span v-if="stage.xpReward">{{ stage.xpReward }} 经验</span>
                  <span v-if="stage.points">{{ stage.points }} 成就点</span>
                </span>
              </span>
            </label>
            <div v-else class="epm-goal-main">
              <span class="epm-goal-status" aria-hidden="true">
                {{ isDraftStageCompleted(i, stage) ? '✓' : i + 1 }}
              </span>
              <span class="epm-goal-content">
                <strong>{{ stage.description }}</strong>
                <span class="epm-goal-rewards">
                  <span v-if="stage.xpReward">{{ stage.xpReward }} 经验</span>
                  <span v-if="stage.points">{{ stage.points }} 成就点</span>
                </span>
              </span>
            </div>
          </li>
        </ol>
      </section>

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
import { ref, watch, computed, toRef } from 'vue'
import CardGallery from './CardGallery.vue'
import { useAchievementProgress } from '../composables/useAchievementProgress.js'
import { useDialogFocus } from '../composables/useDialogFocus.js'
import { classColors, getClassName } from '../utils/achievements.js'

const props = defineProps({
  visible: Boolean,
  achievement: { type: Object, default: null },
  saving: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'save'])
const dialogElement = ref(null)
useDialogFocus(toRef(props, 'visible'), dialogElement, () => emit('close'))

const { progress, getUnit } = useAchievementProgress()

// 收集类成就（记录已发现职业）可用的 11 个职业
const TRACK_CLASSES = ['战士', '猎人', '德鲁伊', '法师', '圣骑士', '牧师', '潜行者', '萨满祭司', '术士', '恶魔猎手', '死亡骑士']
const isTrackClasses = computed(() => !!props.achievement?.trackClasses)
const isTrackItems = computed(() => !!props.achievement?.trackItems)
const isTrack = computed(() => isTrackClasses.value || isTrackItems.value)
const isOneTime = computed(() => props.achievement?.type === '一次性' && !isTrack.value)
const draftDiscovered = ref([])

// 收集类成就：已勾选的排前面，方便查看还差哪些（trackItems 与 trackClasses 通用）
const trackList = computed(() => {
  const customClasses = props.achievement?.trackClasses
  const base = isTrackItems.value
    ? (props.achievement?.trackItems || [])
    : (Array.isArray(customClasses) ? customClasses : TRACK_CLASSES)
  const checked = base.filter((item) => draftDiscovered.value.includes(item))
  const unchecked = base.filter((item) => !draftDiscovered.value.includes(item))
  return [...checked, ...unchecked]
})
const trackLabel = computed(() =>
  props.achievement?.trackLabel ||
  (isTrackItems.value ? '已使用的战利品' : '已发现的职业')
)
const trackUnit = computed(() => (isTrackItems.value ? '战利品' : '职业'))
const trackVerb = computed(() =>
  props.achievement?.trackVerb ||
  (isTrackItems.value ? '使用' : '发现')
)

function classColor(cls) {
  return classColors[cls] || '#999999'
}
function toggleClass(cls) {
  const i = draftDiscovered.value.indexOf(cls)
  if (i >= 0) draftDiscovered.value.splice(i, 1)
  else draftDiscovered.value.push(cls)
}
// 选中态内联样式：trackClasses 用职业色彩，trackItems 用统一的翡翠绿
function trackItemStyle(cls) {
  const c = isTrackClasses.value ? classColor(cls) : '#22c55e'
  return {
    '--c': c,
    borderColor: c,
    color: c,
    background: c + '24',
    boxShadow: `0 0 0 3px ${c}1f, 0 2px 10px rgba(0,0,0,0.22)`
  }
}
// trackItems 模式：从 trackItemDetails 映射取战利品效果描述（hover tooltip 用）
function itemDetail(item) {
  return props.achievement?.trackItemDetails?.[item] || ''
}

// 累计成就的度量单位（次 / 点），用于编辑弹窗标签
const countUnit = computed(() => getUnit(props.achievement))
// 累计成就的最终目标（最后阶段的 quota）：点 MAX 直接填到该值即视为完成
const maxQuota = computed(() => {
  const stages = props.achievement?.stages
  if (!stages || stages.length === 0) return 0
  return stages[stages.length - 1].quota
})
// 关联卡牌：有 relatedCards 时显示图片区域（展示交给 CardGallery 组件）
const hasCards = computed(
  () => Array.isArray(props.achievement?.cards) && props.achievement.cards.length > 0
)
const draftStages = ref({})
const draftCount = ref(0)
const isDraftStageCompleted = (index, stage) => {
  if (isTrack.value) {
    return draftDiscovered.value.length >= (Number(stage?.quota) || 0)
  }
  if (!isOneTime.value) {
    return (Number(draftCount.value) || 0) >= (Number(stage?.quota) || 0)
  }
  return !!draftStages.value[index]
}
const completedStageCount = computed(() =>
  (props.achievement?.stages || []).filter((stage, index) =>
    isDraftStageCompleted(index, stage)
  ).length
)

// 打开时从当前进度初始化草稿
watch(
  () => [props.visible, props.achievement?.id],
  () => {
    if (props.visible && props.achievement) {
      const p = progress.value[props.achievement.id] || {}
      draftCount.value = p.count || 0
      draftStages.value = { ...(p.stages || {}) }
      draftDiscovered.value = Array.isArray(p.stages?._discovered) ? p.stages._discovered.slice() : []
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
  // 收集类成就：进度 = 已勾选的职业列表，count 同步为职业数
  if (isTrack.value) {
    emit('save', {
      id: props.achievement.id,
      stages: { _discovered: draftDiscovered.value.slice() },
      count: draftDiscovered.value.length
    })
    return
  }
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
  background: var(--hs-modal-bg);
  border: 1px solid var(--hs-modal-border);
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
.epm-goals {
  margin: 0 0 20px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.22);
}
.epm-goals-standalone { margin-top: 18px; }
.epm-goals-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.epm-goals-head h4 {
  margin: 0;
  color: #f8fafc;
  font-size: 14px;
}
.epm-goals-head > span {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}
.epm-goal-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.epm-goal {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.48);
  transition: border-color .15s, background .15s;
}
.epm-goal.completed {
  border-color: rgba(74, 222, 128, 0.34);
  background: rgba(22, 101, 52, 0.14);
}
.epm-goal-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
}
.epm-goal-editable { cursor: pointer; }
.epm-goal-editable input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}
.epm-goal-status {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.16);
  font-size: 12px;
  font-weight: 800;
}
.epm-goal.completed .epm-goal-status {
  color: #052e16;
  background: #4ade80;
}
.epm-goal-content {
  display: grid;
  min-width: 0;
  gap: 6px;
}
.epm-goal-content strong {
  color: #e2e8f0;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.55;
}
.epm-goal.completed .epm-goal-content strong { color: #bbf7d0; }
.epm-goal-rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #fbbf24;
  font-size: 12px;
}
.epm-goal-editable:focus-within {
  border-radius: 9px;
  outline: 3px solid rgba(74, 222, 128, 0.28);
  outline-offset: 2px;
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
/* 关联卡牌的网格布局与点击放大由 CardGallery 组件统一提供，此处不再重复定义 */
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

/* 收集类成就：已发现职业勾选 */
.epm-classes { margin-bottom: 20px; }
.epm-classes-label {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 800;
  color: #4b5563;
  letter-spacing: .01em;
}
.epm-class-grid { display: flex; flex-wrap: wrap; gap: 9px; }
.epm-class-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 2px solid #cbd5e1;
  border-radius: 10px;
  background: #f9fafb;
  color: #374151;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: transform .12s, box-shadow .12s, background .12s, border-color .12s, color .12s;
}
.epm-class-chip:hover { border-color: #94a3b8; background: #f1f5f9; transform: translateY(-1px); }
.epm-class-chip.active { font-weight: 800; }
.epm-class-text { line-height: 1; }
.epm-class-check {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--c, #22c55e);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .25);
}
/* 未选中时隐藏对勾，靠边框/文字提示可点击 */
.epm-class-chip:not(.active) .epm-class-check { display: none; }

/* trackItems hover tooltip：显示战利品效果详情 */
.epm-class-chip.has-detail { position: relative; }
.epm-chip-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 280px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: normal;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s;
  z-index: 100;
}
.epm-class-chip.has-detail:hover .epm-chip-tooltip { opacity: 1; }
/* 底部芯片 tooltip 往下弹，避免被弹窗顶部截断 */
.epm-class-chip.has-detail:nth-last-child(-n+4):hover .epm-chip-tooltip {
  bottom: auto;
  top: calc(100% + 8px);
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
.epm-count-label,
.epm-quota-hint { color: #94a3b8; }
.epm-cards-label { color: #cbd5e1; }
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
.epm-cancel:focus-visible,
.epm-save:focus-visible {
  outline: 3px solid rgba(251, 191, 36, 0.55);
  outline-offset: 2px;
}
/* 收集类成就：深色主题下职业芯片 */
.epm-classes-label { color: #cbd5e1; }
.epm-class-chip {
  border-color: rgba(148, 163, 184, 0.42);
  color: #e2e8f0;
  background: rgba(2, 6, 23, 0.35);
}
.epm-class-chip:hover { border-color: rgba(148, 163, 184, 0.72); background: rgba(2, 6, 23, 0.5); }
@media (max-width: 520px) {
  .epm-modal { padding: 24px 18px; border-radius: 15px; }
  .epm-actions > * { flex: 1; }
}
</style>
