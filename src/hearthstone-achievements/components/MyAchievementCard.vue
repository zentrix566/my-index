<script setup>
import { computed, ref } from 'vue'
import { difficultyColors } from '../utils/achievements.js'
import { useAchievementProgress } from '../composables/useAchievementProgress.js'

const props = defineProps({
  achievement: { type: Object, required: true }
})

const emit = defineEmits(['click'])

const { isStageCompleted, isAchievementCompleted, getCount } = useAchievementProgress()

const copiedDeckName = ref('')

const isClickable = (ach) =>
  ach.cards && ach.cards.length > 0 && ach.cards.some((c) => c.image)

const getDifficultyStyle = (difficulty) => ({
  color: difficultyColors[difficulty] || '#666'
})

// 累计进度文字（各阶段都用实际的 count 值）
const countValue = computed(() => getCount(props.achievement))
const progressText = computed(() => {
  if (countValue.value == null) return ''
  const stages = props.achievement.stages
  if (!stages || stages.length === 0) return ''
  return stages.map((s) => {
    const done = countValue.value >= s.quota
    return { quota: s.quota, done }
  })
})

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
      'hs-clickable': isClickable(achievement),
      'hs-completed': isAchievementCompleted(achievement)
    }"
    @click="$emit('click', achievement)"
  >
    <div class="hs-card-content">
      <div class="hs-card-title-row">
        <h3 class="hs-card-title">
          {{ achievement.name }}
          <span v-if="isAchievementCompleted(achievement)" class="hs-completed-badge">✓ 已完成</span>
          <span v-else-if="isClickable(achievement)" class="hs-card-hint">点击查看卡牌</span>
        </h3>
        <div class="hs-card-badges">
          <span
            class="hs-badge hs-type-badge"
            :class="achievement.type === '一次性' ? 'hs-one-time' : 'hs-cumulative'"
          >
            {{ achievement.type }}
          </span>
          <span class="hs-badge hs-difficulty-badge" :style="getDifficultyStyle(achievement.difficulty)">
            {{ achievement.difficulty }}
          </span>
        </div>
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
            <span class="hs-stage-xp" :class="{ 'hs-reward-done': isStageCompleted(achievement, idx) }">
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

      <!-- 累积进度显示（直接录入的 count 值） -->
      <div v-if="countValue != null" class="hs-count-progress">
        <div class="hs-count-header">
          <span class="hs-count-label">累计</span>
          <span class="hs-count-number">{{ countValue }}</span>
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
                :style="{ width: Math.min(100, (countValue / p.quota) * 100) + '%' }"
              ></div>
            </div>
            <span class="hs-count-stage-text">
              <template v-if="p.done">✓ </template>
              <strong>{{ countValue }}</strong> / {{ p.quota }}
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
            <span class="hs-deck-name">{{ deck.name }}</span>
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
    </div>
  </article>
</template>
