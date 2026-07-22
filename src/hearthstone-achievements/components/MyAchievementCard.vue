<script setup>
import { computed, ref } from 'vue'
import { difficultyColors, getClassName } from '../utils/achievements.js'
import { useAchievementProgress } from '../composables/useAchievementProgress.js'

const props = defineProps({
  achievement: { type: Object, required: true },
  showRemaining: { type: Boolean, default: false },
  editable: { type: Boolean, default: false },
  selectMode: { type: Boolean, default: false },
  selected: { type: Boolean, default: false }
})

const emit = defineEmits(['click', 'toggle-select', 'deck-click'])

const onCardClick = () => {
  if (props.selectMode) emit('toggle-select', props.achievement)
  else emit('click', props.achievement)
}

const { isStageCompleted, isAchievementCompleted, getCount, getProgressInfo, getMetric } = useAchievementProgress()

// 累计成就的细分单位：点数 / 次数（用于卡片徽标）
const metric = computed(() => getMetric(props.achievement))

// "快完成"徽标文字（仅在开启 showRemaining 且未完成的累计/多阶段成就上显示）
const remainingBadge = computed(() => {
  if (!props.showRemaining) return ''
  const info = getProgressInfo(props.achievement)
  if (info.completed) return ''
  return info.remainingText
})

const copiedDeckName = ref('')

const isClickable = (ach) =>
  ach.cards && ach.cards.length > 0 && ach.cards.some((c) => c.image)

const getDifficultyStyle = (difficulty) => ({
  color: difficultyColors[difficulty] || '#666'
})

// 累计进度显示：done 以 isStageCompleted 为准（兼容「stages 勾选」标记的完成），
// 已完成阶段显示满额（quota），避免「已完成却 0% 进度条」的显示矛盾
const countValue = computed(() => getCount(props.achievement))
const isCompleted = computed(() => isAchievementCompleted(props.achievement))
// 累计成就恒显示进度条（即便 count=0 / 无进度记录也显示 0%），避免"无进度条"的观感断层
const showCountProgress = computed(() =>
  props.achievement.type === '累计' ? true : (countValue.value != null || isCompleted.value)
)
// 头部展示的累计值：未完成用真实 count；已完成用末阶段 quota（代表已达成的目标值）
const headerCount = computed(() => {
  if (isCompleted.value) {
    const st = props.achievement.stages
    return st && st.length ? st[st.length - 1].quota : (countValue.value ?? 0)
  }
  return countValue.value ?? 0
})
const progressText = computed(() => {
  const stages = props.achievement.stages
  if (!stages || stages.length === 0) return []
  const cv = countValue.value
  return stages.map((s, idx) => {
    const done = isStageCompleted(props.achievement, idx)
    // 已完成阶段显示满额；未完成的阶段用真实累计值（无 count 记录则为 0）
    const value = done ? s.quota : (cv != null ? cv : 0)
    return { quota: s.quota, done, value }
  })
})

const onDeckClick = (deck, event) => {
  if (event) event.stopPropagation()
  emit('deck-click', { ...deck, heroClass: props.achievement.heroClass })
}

const copyDeckCode = async (deck, event) => {
  event.stopPropagation()
  try {
    await navigator.clipboard.writeText(deck.code)
    copiedDeckName.value = deck.name
    setTimeout(() => {
      if (copiedDeckName.value === deck.name) copiedDeckName.value = ''
    }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = deck.code
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copiedDeckName.value = deck.name
    setTimeout(() => {
      if (copiedDeckName.value === deck.name) copiedDeckName.value = ''
    }, 2000)
  }
}
</script>

<template>
  <article
    class="hs-achievement-card hs-my-card"
    :class="{
      'hs-clickable': editable || isClickable(achievement),
      'hs-completed': isAchievementCompleted(achievement),
      'hs-select-mode': selectMode,
      'hs-selected': selectMode && selected
    }"
    @click="onCardClick"
  >
    <span
      v-if="selectMode"
      class="hs-select-box"
      :class="{ checked: selected }"
      @click.stop="emit('toggle-select', achievement)"
    >
      <svg v-if="selected" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </span>
    <div class="hs-card-content">
      <div class="hs-card-title-row">
          <h3 class="hs-card-title">
          <span class="hs-card-name">{{ achievement.name }}</span>
          <span v-if="isAchievementCompleted(achievement)" class="hs-completed-badge">✓ 已完成</span>
        </h3>
        <div class="hs-card-badges">
          <span class="hs-badge hs-version-badge">{{ achievement._expansionName }}</span>
          <span class="hs-badge hs-class-badge">{{ getClassName(achievement) }}</span>
          <span
            class="hs-badge hs-type-badge"
            :class="achievement.type === '一次性' ? 'hs-one-time' : 'hs-cumulative'"
          >
            {{ achievement.type === '一次性' ? '一次性' : (metric === 'points' ? '点数' : '次数') }}
          </span>
          <span class="hs-badge hs-difficulty-badge" :style="getDifficultyStyle(achievement.difficulty)">
            {{ achievement.difficulty }}
          </span>
          <span
            v-if="!editable && !isAchievementCompleted(achievement) && isClickable(achievement)"
            class="hs-card-hint"
          >点击查看卡牌</span>
          <button
            v-if="(editable || isClickable(achievement)) && !selectMode"
            class="hs-card-open"
            type="button"
            :aria-label="editable ? `编辑 ${achievement.name} 的进度` : `查看 ${achievement.name} 的关联卡牌`"
            @click.stop="emit('click', achievement)"
          >
            <svg v-if="editable" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div v-if="remainingBadge" class="hs-card-remaining">
        <span class="hs-almost-badge">{{ remainingBadge }}</span>
      </div>

      <ul class="hs-stage-list">
        <li
          v-for="(stage, idx) in achievement.stages"
          :key="idx"
          class="hs-stage"
          :class="{ 'hs-stage-done': isStageCompleted(achievement, idx) }"
        >
          <span class="hs-stage-status">
            <svg v-if="isStageCompleted(achievement, idx)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-else class="hs-stage-dot"></span>
          </span>
          <span class="hs-stage-text" :class="{ 'hs-stage-strikethrough': isStageCompleted(achievement, idx) }">
            {{ stage.description }}
          </span>
          <span class="hs-stage-rewards">
            <span class="hs-stage-xp" v-if="stage.xpReward" :class="{ 'hs-reward-done': isStageCompleted(achievement, idx) }">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
              {{ stage.xpReward }}
            </span>
            <span class="hs-stage-pts" :class="{ 'hs-reward-done': isStageCompleted(achievement, idx) }">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              {{ stage.points }}
            </span>
          </span>
        </li>
      </ul>

      <!-- 累积进度显示（直接录入的 count 值，已完成阶段按满额显示） -->
      <div v-if="showCountProgress" class="hs-count-progress">
        <div class="hs-count-header">
          <span class="hs-count-label">累计</span>
          <span class="hs-count-number">{{ headerCount }}</span>
        </div>
        <div class="hs-count-stage-list">
          <div
            v-for="(p, idx) in progressText"
            :key="idx"
            class="hs-count-stage"
            :class="{ 'hs-count-stage-done': p.done }"
          >
            <div class="hs-count-stage-bar">
              <div
                class="hs-count-stage-fill"
                :style="{ width: Math.min(100, (p.value / p.quota) * 100) + '%' }"
              ></div>
            </div>
            <span class="hs-count-stage-text">
              <template v-if="p.done">✓ </template>
              <strong>{{ p.value }}</strong> / {{ p.quota }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="achievement.relatedCards && achievement.relatedCards.length > 0" class="hs-related-cards">
        <span class="hs-related-label">关联卡牌：</span>
          <span
          v-for="card in achievement.cards"
          :key="card.name"
          class="hs-related-card-name"
          :class="{ 'hs-missing': !card.image }"
        >
          {{ card.name }}<span v-if="!card.image" class="hs-missing-hint">（暂无图）</span>
        </span>
      </div>

      <div v-if="achievement.recommendedDecks && achievement.recommendedDecks.length > 0" class="hs-deck-section">
        <div class="hs-deck-label">推荐卡组：</div>
        <div class="hs-deck-list">
          <div v-for="deck in achievement.recommendedDecks" :key="deck.name" class="hs-deck-item">
            <button type="button" class="hs-deck-name hs-deck-name-btn" @click="onDeckClick(deck, $event)">
              {{ deck.name }}
            </button>
            <button
              class="hs-copy-button"
              type="button"
              :class="{ 'hs-copied': copiedDeckName === deck.name }"
              @click="copyDeckCode(deck, $event)"
              title="复制卡组代码"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              <span>{{ copiedDeckName === deck.name ? '已复制' : '复制' }}</span>
            </button>
          </div>
        </div>
      </div>
      <div v-if="achievement.guide" class="hs-guide-section">
        <details class="hs-guide-details" @click.stop>
          <summary class="hs-guide-summary">查看攻略</summary>
          <p class="hs-guide-text">{{ achievement.guide }}</p>
        </details>
      </div>
    </div>
  </article>
</template>
