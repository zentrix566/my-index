<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Age Calculator</p>
        <h1>年龄计算器</h1>
        <p>输入出生年份和特定年份，计算当时的年龄。纪元默认选择公元，计算公元前年份时可单独切换；跨纪元会自动跳过不存在的公元 0 年。</p>
      </div>

      <SmartBackLink fallback="/projects" class="back" label="返回项目索引" />

      <form class="age-form" novalidate @submit.prevent="calculate">
        <fieldset class="year-fieldset">
          <legend>出生年份</legend>
          <div class="year-control">
            <select v-model="birthEra" aria-label="出生年份纪元">
              <option value="bce">公元前</option>
              <option value="ce">公元</option>
            </select>
            <input
              ref="birthYearInput"
              v-model="birthYear"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              placeholder="例如：145"
              aria-label="出生年份数字"
              :aria-invalid="Boolean(errorMessage)"
              aria-describedby="age-form-help age-form-error"
            >
          </div>
        </fieldset>

        <fieldset class="year-fieldset">
          <legend>特定年份</legend>
          <div class="year-control">
            <select v-model="targetEra" aria-label="特定年份纪元">
              <option value="bce">公元前</option>
              <option value="ce">公元</option>
            </select>
            <input
              v-model="targetYear"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              placeholder="例如：86"
              aria-label="特定年份数字"
              :aria-invalid="Boolean(errorMessage)"
              aria-describedby="age-form-help age-form-error"
            >
          </div>
        </fieldset>

        <button type="submit" class="age-button">计算年龄</button>

        <p id="age-form-help" class="form-help">年份只填正整数；停止输入后会自动计算，也可以点击按钮计算。</p>
        <p v-if="errorMessage" id="age-form-error" class="form-error" role="alert">
          {{ errorMessage }}
        </p>
      </form>

      <div v-if="results.length" class="age-results">
        <div
          v-for="item in results"
          :key="item.id"
          class="age-result-item"
        >
          <span class="age-result-equation">
            {{ item.target }} − {{ item.birth }} = {{ item.age }} 岁
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import SmartBackLink from '../../../components/SmartBackLink.vue'
import {
  calculateHistoricalAge,
  formatHistoricalYear
} from '../utils/historicalYear.js'

const birthEra = ref('ce')
const birthYear = ref('')
const targetEra = ref('ce')
const targetYear = ref('')
const results = ref([])
const errorMessage = ref('')
const birthYearInput = ref(null)
let autoCalculateTimer

function calculate() {
  runCalculation({ focusOnError: true })
}

function runCalculation({ focusOnError }) {
  errorMessage.value = ''

  try {
    if (birthYear.value === '' || targetYear.value === '') {
      throw new RangeError('请完整填写出生年份和特定年份')
    }

    const birth = { era: birthEra.value, year: Number(birthYear.value) }
    const target = { era: targetEra.value, year: Number(targetYear.value) }
    const age = calculateHistoricalAge(birth, target)
    const resultKey = `${birth.era}-${birth.year}-${target.era}-${target.year}`

    if (results.value[0]?.key === resultKey) return

    results.value.unshift({
      id: `${Date.now()}-${results.value.length}`,
      key: resultKey,
      birth: formatHistoricalYear(birth),
      target: formatHistoricalYear(target),
      age
    })
  } catch (error) {
    errorMessage.value = error.message
    if (focusOnError) birthYearInput.value?.focus()
  }
}

watch([birthEra, birthYear, targetEra, targetYear], () => {
  window.clearTimeout(autoCalculateTimer)
  errorMessage.value = ''

  if (birthYear.value === '' || targetYear.value === '') return

  autoCalculateTimer = window.setTimeout(() => {
    runCalculation({ focusOnError: false })
  }, 500)
})

onBeforeUnmount(() => {
  window.clearTimeout(autoCalculateTimer)
})
</script>

<style scoped>
.back {
  display: inline-block;
  margin: 0 0 1.5rem;
  color: var(--accent, #4f8cff);
  text-decoration: none;
  font-size: 0.95rem;
}

.age-form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1.5rem;
}

.year-fieldset {
  min-width: min(100%, 280px);
  margin: 0;
  padding: 0;
  border: 0;
}

.year-fieldset legend {
  margin-bottom: 0.4rem;
  padding: 0;
  font-size: 0.95rem;
  color: var(--text-soft, #555);
}

.year-control {
  display: flex;
  gap: 0.5rem;
}

.age-form input,
.age-form select {
  min-height: 44px;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border, #d6dbe3);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--surface, #fff);
  color: var(--text, #1c2230);
}

.age-form input {
  min-width: 0;
  width: 100%;
}

.age-form select {
  flex: 0 0 auto;
  cursor: pointer;
}

.age-form input:focus-visible,
.age-form select:focus-visible,
.age-button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent, #4f8cff) 35%, transparent);
  outline-offset: 2px;
}

.age-form input[aria-invalid="true"] {
  border-color: var(--danger, #c2413b);
}

.age-button {
  min-height: 44px;
  padding: 0.65rem 1.4rem;
  border: none;
  border-radius: 8px;
  background: var(--accent, #4f8cff);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.age-button:hover {
  opacity: 0.9;
}

.age-button:active {
  opacity: 0.78;
}

.form-help,
.form-error {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.9rem;
}

.form-help {
  color: var(--text-soft, #555);
}

.form-error {
  color: var(--danger, #c2413b);
  font-weight: 600;
}

.age-results {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.age-result-item {
  padding: 1rem 1.5rem;
  border-radius: 10px;
  background: var(--surface-alt, #f4f7fb);
  border: 1px solid var(--border, #d6dbe3);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text, #1c2230);
}

.age-result-equation {
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .year-fieldset,
  .age-button {
    width: 100%;
  }
}
</style>
