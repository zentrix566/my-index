<template>
  <section class="section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Age Calculator</p>
        <h1>年龄计算器</h1>
        <p>输入出生年份和某个特定年份，直接算出当时的年龄。不做任何校验，算出来是多少就显示多少，每次结果都会保留在下方方便查看。</p>
      </div>

      <SmartBackLink fallback="/projects" class="back" label="返回项目索引" />

      <form class="age-form" @submit.prevent="calculate">
        <label>
          出生年份
          <input
            v-model="birthYear"
            type="text"
            inputmode="numeric"
            placeholder="例如：1995"
          >
        </label>
        <label>
          特定年份
          <input
            v-model="targetYear"
            type="text"
            inputmode="numeric"
            placeholder="例如：2026"
          >
        </label>
        <button type="submit" class="age-button">计算年龄</button>
      </form>

      <div v-if="results.length" class="age-results">
        <div
          v-for="(item, index) in results"
          :key="index"
          class="age-result-item"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import SmartBackLink from '../../../components/SmartBackLink.vue'

// 原始输入值，不做任何清洗或校验
const birthYear = ref('')
const targetYear = ref('')

// 每次计算结果都追加到列表，保留历史；修改输入框不会清空，关闭页面前一直保留
const results = ref([])

function calculate() {
  const age = Number(targetYear.value) - Number(birthYear.value)
  // 结果格式：当前年份 X 年 - 当前年份 Y 年 = X 岁（数字两边带空格）
  // 最新结果插到列表头部，显示在最上面
  results.value.unshift(`当前年份 ${targetYear.value} 年 - 当前年份 ${birthYear.value} 年 = ${age} 岁`)
}
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

.age-form label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: var(--text-soft, #555);
  min-width: 180px;
}

.age-form input {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border, #d6dbe3);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--surface, #fff);
  color: var(--text, #1c2230);
}

.age-button {
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
</style>
