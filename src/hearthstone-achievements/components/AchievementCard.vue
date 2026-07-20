<script setup>
import { ref } from 'vue'
import { difficultyColors } from '../utils/achievements.js'

const props = defineProps({
  achievement: { type: Object, required: true }
})

defineEmits(['click'])

const copiedDeckName = ref('')

const getDifficultyStyle = (difficulty) => ({
  color: difficultyColors[difficulty] || '#666'
})

const isClickable = (ach) =>
  ach.cards && ach.cards.length > 0 && ach.cards.some((c) => c.imageLoader)

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
    class="hs-achievement-card"
    :class="{ 'hs-clickable': isClickable(achievement) }"
    @click="$emit('click', achievement)"
  >
    <div class="hs-card-content">
      <div class="hs-card-title-row">
        <h3 class="hs-card-title">
          {{ achievement.name }}
          <span v-if="isClickable(achievement)" class="hs-card-hint">点击查看卡牌</span>
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
        <li v-for="(stage, idx) in achievement.stages" :key="idx" class="hs-stage">
          <span class="hs-stage-text">{{ stage.description }}</span>
          <span class="hs-stage-rewards">
            <span class="hs-stage-xp">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
              {{ stage.xpReward }}
            </span>
            <span class="hs-stage-pts">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
              {{ stage.points }}
            </span>
          </span>
        </li>
      </ul>

      <div v-if="achievement.relatedCards && achievement.relatedCards.length > 0" class="hs-related-cards">
        <span class="hs-related-label">关联卡牌：</span>
        <span
          v-for="card in achievement.cards"
          :key="card.name"
          class="hs-related-card-name"
          :class="{ 'hs-missing': !card.imageLoader }"
        >
          {{ card.name }}<span v-if="!card.imageLoader" class="hs-missing-hint">（暂无图）</span>
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
      <div v-if="achievement.guide" class="hs-guide-section">
        <details class="hs-guide-details">
          <summary class="hs-guide-summary">📖 攻略</summary>
          <p class="hs-guide-text">{{ achievement.guide }}</p>
        </details>
      </div>
    </div>
  </article>
</template>
