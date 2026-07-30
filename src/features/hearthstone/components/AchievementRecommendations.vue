<template>
  <section
    v-if="recommendations.length"
    class="hs-priority-group hs-sprint-cat hs-rule-recommendations"
    aria-labelledby="hs-rule-recommendations-title"
  >
    <button
      type="button"
      class="hs-sprint-cat-head"
      :aria-expanded="!collapsed"
      aria-controls="hs-rule-recommendations-list"
      @click="$emit('toggle')"
    >
      <span class="hs-sprint-cat-caret" :class="{ open: !collapsed }" aria-hidden="true">▶</span>
      <h2 id="hs-rule-recommendations-title" class="hs-sprint-cat-title">优先冲刺建议</h2>
      <span class="hs-sprint-cat-count">
        {{ recommendations.length }} 项 · 本地规则 · 不消耗 AI 额度
      </span>
    </button>

    <ol
      id="hs-rule-recommendations-list"
      v-show="!collapsed"
      class="hs-rule-recommendations-list"
    >
      <li
        v-for="(recommendation, index) in recommendations"
        :key="recommendation.achievement.id"
        v-memo="[recommendation.score, editable, cardDetails]"
        class="hs-rule-recommendation"
      >
        <span class="hs-rule-recommendation-rank" aria-hidden="true">{{ index + 1 }}</span>
        <div class="hs-rule-recommendation-copy">
          <span class="hs-rule-recommendation-scope">
            {{ recommendation.achievement._expansionName }} ·
            {{ getClassName(recommendation.achievement) }}
          </span>
          <strong>{{ recommendation.achievement.name }}</strong>
          <p class="hs-rule-recommendation-reason">{{ recommendation.reason }}</p>
          <div class="hs-rule-recommendation-tags" aria-label="推荐理由">
            <span v-for="tag in recommendation.tags" :key="tag">{{ tag }}</span>
          </div>
          <div class="hs-rule-recommendation-detail">
            <span class="hs-rule-recommendation-label">成就要求</span>
            <ul class="hs-rule-recommendation-stages">
              <li
                v-for="(stage, stageIndex) in recommendation.achievement.stages"
                :key="stageIndex"
              >
                <span>{{ stage.description }}</span>
                <span class="hs-rule-recommendation-reward">
                  <template v-if="stage.xpReward">{{ stage.xpReward }} 经验</template>
                  <template v-if="stage.xpReward && stage.points"> · </template>
                  <template v-if="stage.points">{{ stage.points }} 成就点</template>
                </span>
              </li>
            </ul>
          </div>
          <div
            v-if="recommendation.achievement.cards?.length"
            class="hs-rule-recommendation-related"
          >
            <span class="hs-rule-recommendation-label">关联卡牌</span>
            <div class="hs-rule-recommendation-cards">
              <div
                v-for="card in recommendation.achievement.cards"
                :key="card.name"
                class="hs-rule-recommendation-card"
                :class="{ 'hs-card-image-only': isImageOnlyCard(card) }"
              >
                  <img
                  v-if="getCardThumbnail(card)"
                  :src="getCardThumbnail(card)"
                  alt=""
                  width="56"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  @error="useCardImageFallback($event, card)"
                >
                <span v-else class="hs-rule-recommendation-card-placeholder">暂无图片</span>
                <span class="hs-rule-recommendation-card-copy">
                  <strong>{{ card.name }}</strong>
                  <span v-if="getCardEffect(card)">{{ getCardEffect(card) }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="hs-rule-recommendation-actions">
          <button
            type="button"
            class="hs-btn hs-btn-primary"
            @click="$emit('select', recommendation.achievement)"
          >
            {{ editable ? '记录进度' : '查看成就' }}
          </button>
          <button
            type="button"
            class="hs-btn hs-btn-ghost"
            @click="$emit('share', recommendation.achievement)"
          >
            分享
          </button>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getClassName } from '../utils/achievements.js'

const props = defineProps({
  recommendations: { type: Array, required: true },
  editable: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: true }
})

defineEmits(['toggle', 'select', 'share'])

const cardDetails = ref(null)
const cardDetailsError = ref(false)

async function loadCardDetails() {
  if (cardDetails.value || cardDetailsError.value) return
  try {
    const module = await import('../data/achievement-card-details.json')
    cardDetails.value = module.default
  } catch {
    cardDetailsError.value = true
  }
}

watch(
  () => props.collapsed,
  (collapsed) => {
    if (!collapsed) loadCardDetails()
  },
  { immediate: true }
)

const getCardEffect = (card) => {
  if (cardDetailsError.value) return '效果资料加载失败'
  if (!cardDetails.value) return '正在加载卡牌效果…'
  const details = cardDetails.value[card.name]
  if (!details) return ''
  return details.text || '无特殊效果'
}

const isImageOnlyCard = (card) =>
  Boolean(cardDetails.value && !cardDetails.value[card.name])

const getCardThumbnail = (card) =>
  isImageOnlyCard(card)
    ? card.image || card.imageFallback || ''
    : card.imageFallback || card.image || ''

const useCardImageFallback = (event, card) => {
  const image = event.currentTarget
  if (image.dataset.fallbackApplied) return
  const fallback = isImageOnlyCard(card)
    ? card.imageFallback
    : card.image
  if (!fallback) return
  image.dataset.fallbackApplied = 'true'
  image.src = fallback
}
</script>

<style scoped>
.hs-rule-recommendations {
  margin: 0;
  color: var(--hs-text);
}

.hs-rule-recommendation {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.hs-rule-recommendation-reason {
  margin: 0;
}

.hs-rule-recommendation-scope {
  color: var(--hs-muted);
  font-size: 11px;
  font-weight: 700;
}

.hs-sprint-cat-title {
  margin: 0;
}

.hs-rule-recommendations-list {
  display: grid;
  gap: 8px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.hs-rule-recommendation {
  padding: 12px;
  border: 1px solid var(--hs-border);
  border-radius: 12px;
  background: var(--hs-surface-soft);
}

.hs-rule-recommendation-rank {
  display: grid;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  color: var(--hs-surface);
  background: var(--hs-primary);
  font-weight: 800;
}

.hs-rule-recommendation-copy {
  display: grid;
  flex: 1 1 auto;
  gap: 4px;
  min-width: 0;
}

.hs-rule-recommendation-copy strong {
  font-size: 14px;
}

.hs-rule-recommendation-copy p {
  color: var(--hs-text-soft);
  font-size: 12px;
  line-height: 1.5;
}

.hs-rule-recommendation-detail,
.hs-rule-recommendation-related {
  display: grid;
  gap: 6px;
  margin-top: 4px;
}

.hs-rule-recommendation-label {
  color: var(--hs-text);
  font-size: 12px;
  font-weight: 800;
}

.hs-rule-recommendation-stages {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hs-rule-recommendation-stages li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 9px;
  border-left: 3px solid var(--hs-primary);
  border-radius: 0 8px 8px 0;
  color: var(--hs-text-soft);
  background: var(--hs-surface);
  font-size: 12px;
  line-height: 1.5;
}

.hs-rule-recommendation-reward {
  flex: 0 0 auto;
  color: var(--hs-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.hs-rule-recommendation-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px;
}

.hs-rule-recommendation-card {
  display: grid;
  grid-template-columns: 56px auto;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  color: var(--hs-text-soft);
  background: var(--hs-surface);
  font-size: 12px;
}

.hs-rule-recommendation-card img,
.hs-rule-recommendation-card-placeholder {
  width: 56px;
  height: 40px;
  border-radius: 6px;
}

.hs-rule-recommendation-card img {
  display: block;
  object-fit: cover;
}

.hs-rule-recommendation-card.hs-card-image-only {
  grid-template-columns: 88px auto;
}

.hs-rule-recommendation-card.hs-card-image-only img {
  width: 88px;
  height: 124px;
  object-fit: contain;
  background: var(--hs-surface-soft);
}

.hs-rule-recommendation-card-placeholder {
  display: grid;
  place-items: center;
  color: var(--hs-muted);
  background: var(--hs-surface-soft);
  font-size: 10px;
}

.hs-rule-recommendation-card-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
  line-height: 1.45;
}

.hs-rule-recommendation-card-copy strong {
  color: var(--hs-text);
  font-size: 12px;
}

.hs-rule-recommendation-card-copy > span {
  color: var(--hs-text-soft);
  font-size: 11px;
}

.hs-rule-recommendation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hs-rule-recommendation-tags span {
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--hs-link);
  background: var(--hs-surface);
  font-size: 11px;
  font-weight: 700;
}

.hs-rule-recommendation-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-self: center;
}

@media (max-width: 720px) {
  .hs-rule-recommendation {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .hs-rule-recommendation-actions {
    width: 100%;
    padding-left: 40px;
  }

  .hs-rule-recommendation-stages li {
    display: grid;
    gap: 2px;
  }

  .hs-rule-recommendation-cards {
    grid-template-columns: 1fr;
  }
}
</style>
