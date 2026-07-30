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
        v-memo="[recommendation.score, editable]"
        class="hs-rule-recommendation"
      >
        <span class="hs-rule-recommendation-rank" aria-hidden="true">{{ index + 1 }}</span>
        <div class="hs-rule-recommendation-copy">
          <span class="hs-rule-recommendation-scope">
            {{ recommendation.achievement._expansionName }} ·
            {{ getClassName(recommendation.achievement) }}
          </span>
          <strong>{{ recommendation.achievement.name }}</strong>
          <p>{{ recommendation.reason }}</p>
          <div class="hs-rule-recommendation-tags" aria-label="推荐理由">
            <span v-for="tag in recommendation.tags" :key="tag">{{ tag }}</span>
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
import { getClassName } from '../utils/achievements.js'

defineProps({
  recommendations: { type: Array, required: true },
  editable: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: true }
})

defineEmits(['toggle', 'select', 'share'])
</script>

<style scoped>
.hs-rule-recommendations {
  margin: 0;
  color: var(--hs-text);
}

.hs-rule-recommendation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hs-rule-recommendation p {
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
}
</style>
