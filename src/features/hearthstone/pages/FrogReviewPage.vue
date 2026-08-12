<template>
  <section class="section page-section hs-page frog-page frog-review" :data-hs-theme="hsTheme">
    <div class="container">
      <div class="frog-wrap">
        <!-- 头部：返回 + 标题 -->
        <div class="frog-head">
          <div>
            <router-link to="/hearthstone/frog" class="frog-back" aria-label="返回蛙生模拟器">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              返回蛙生模拟器
            </router-link>
            <p class="frog-eyebrow"><span class="hs-live-dot" aria-hidden="true"></span> Pixel Patch Lab</p>
            <h1>卡牌修改验收台</h1>
            <p class="frog-sub">
              对照原卡、修改后效果与模板来源。红色轮廓仅用于标记实际替换范围，关闭后就是玩家看到的结果。
              当前还是测试版，欢迎逐类检查贴片效果。
            </p>
          </div>
          <div class="frog-head__actions">
            <button
              type="button"
              class="frog-theme-toggle"
              :aria-label="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
              :title="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
              @click="toggleTheme"
            >
              <svg v-if="hsTheme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
              {{ hsTheme === 'dark' ? '明亮' : '暗色' }}
            </button>
            <router-link to="/hearthstone/frog" class="frog-review-link frog-review-link--ghost">
              去玩找茬
            </router-link>
          </div>
        </div>

        <!-- 验收控制台 -->
        <div class="frog-config">
          <div class="frog-config__head">
            <span class="frog-config__title">修改字段</span>
            <div class="frog-review__actions">
              <label class="frog-switch" :title="wildMode ? '已开启：狂野随从已并入卡池' : '开启后把狂野模式的随从并入卡池'">
                <input type="checkbox" :checked="wildMode" @change="toggleWildMode" />
                <span class="frog-switch__track"><span class="frog-switch__thumb"></span></span>
                <span class="frog-switch__label">狂野模式</span>
              </label>
              <label class="frog-switch" :title="showPatchGuide ? '已开启：在修改处画红框标记实际替换范围' : '开启后会在修改处画红框标记实际替换范围'">
                <input type="checkbox" v-model="showPatchGuide" />
                <span class="frog-switch__track"><span class="frog-switch__thumb"></span></span>
                <span class="frog-switch__label">显示补丁边界</span>
              </label>
              <button class="frog-btn frog-btn--ghost" type="button" @click="nextSample">
                换一组样本
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              </button>
            </div>
          </div>
          <div class="frog-config__list frog-config__list--tabs">
            <button
              v-for="type in mutationTypes"
              :key="type"
              type="button"
              class="frog-tab"
              :class="{ 'frog-tab--active': activeType === type, 'frog-tab--unstable': unstableTypes.has(type) }"
              :aria-pressed="activeType === type"
              @click="activeType = type"
            >
              {{ fieldLabels[type] }}
            </button>
          </div>
        </div>

        <!-- 样本载入状态 -->
        <div v-if="loading" class="frog-status" role="status">
          <span class="frog-spinner"></span>
          正在载入验收样本……
        </div>
        <div v-else-if="error" class="frog-status frog-status--error" role="alert">
          <strong>验收页面载入失败</strong>
          <span>{{ error }}</span>
        </div>

        <template v-else-if="baseCard && mutation">
          <!-- 摘要：原始 → 修改 -->
          <div class="frog-review__summary" aria-live="polite">
            <span class="frog-review__summary-label">{{ fieldLabels[activeType] }}</span>
            <strong>{{ explanation.original }}</strong>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            <strong>{{ explanation.changed }}</strong>
          </div>

          <!-- 三张对照：原始 / 修改后 / 模板来源 -->
          <div class="frog-review__grid">
            <article class="frog-compare">
              <div class="frog-compare__head"><span>01</span><div><strong>原始卡牌</strong><small>{{ baseCard.name }}</small></div></div>
              <FrogCard :card="baseCard" :index="0" :interactive="false" :show-number="false" />
            </article>

            <article class="frog-compare frog-compare--result">
              <div class="frog-compare__head"><span>02</span><div><strong>修改后</strong><small>玩家实际看到的卡面</small></div></div>
              <FrogCard
                :card="baseCard"
                :index="0"
                :mutation="mutation"
                :is-suspicious="true"
                :interactive="false"
                :show-number="false"
                :show-patch-guide="showPatchGuide"
              />
            </article>

            <article class="frog-compare">
              <div class="frog-compare__head"><span>03</span><div><strong>模板来源</strong><small>{{ mutation.donor.name }}</small></div></div>
              <FrogCard :card="mutation.donor" :index="0" :interactive="false" :show-number="false" />
            </article>
          </div>

          <p v-if="unstableTypes.has(activeType)" class="frog-review__warn">
            该类型目前 bug 较多、贴片结果不够准确，仍在调优；红框标注的替换范围可能与最终落点有偏差，验收时以卡面实际观感为准。
          </p>
        </template>

        <p v-else class="frog-review__empty">
          当前类型暂无可对照样本，<button type="button" class="frog-link" @click="pickFirstAvailableType">换一类试试</button>。
        </p>

        <p class="frog-foot">
          卡牌数据来自暴雪国服卡牌接口，卡图经本站反向代理自对象存储 · 仅作交互演示，不代表游戏内实际数值
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import FrogCard from '../components/FrogCard.vue'
import {
  createMutationForType,
  fieldLabels,
  formatValue,
  mutationTypes,
  preloadCardImages,
  useFrogGame
} from '../composables/useFrogGame.js'
import { useHearthstoneTheme } from '../composables/useHearthstoneTheme.js'
import '../styles/hearthstone-frog.css'

const { hsTheme, toggleTheme } = useHearthstoneTheme()
const { allCards, loadData, loading, error, wildMode, toggleWild } = useFrogGame()

// 这几类贴片效果还不够稳定，tab 上用虚线提示
const unstableTypes = new Set(['rarityId', 'name', 'text', 'minionTypeId'])

const activeType = ref(mutationTypes[0])
const baseCard = ref(null)
const mutation = ref(null)
const showPatchGuide = ref(true)
const sampleIndex = ref(0)

const explanation = computed(() => {
  if (!mutation.value) return null
  return {
    original: formatValue(activeType.value, mutation.value.original),
    changed: formatValue(activeType.value, mutation.value.changed)
  }
})

// 当前字段下、能成功生成贴片的原始卡（作为候选样本）
const compatibleBases = computed(() => (
  allCards.value.filter((card) => createMutationForType(card, allCards.value, activeType.value))
))

const setSample = () => {
  const candidates = compatibleBases.value
  if (!candidates.length) {
    baseCard.value = null
    mutation.value = null
    return
  }
  const card = candidates[sampleIndex.value % candidates.length]
  mutation.value = createMutationForType(card, allCards.value, activeType.value)
  baseCard.value = card
}

const nextSample = () => {
  sampleIndex.value += 1
  setSample()
}

const pickFirstAvailableType = () => {
  const available = mutationTypes.find((type) => (
    allCards.value.some((card) => createMutationForType(card, allCards.value, type))
  ))
  if (available) {
    activeType.value = available
  }
}

// 切换「狂野模式」后重新挑选样本，让新卡池立即生效
const toggleWildMode = async () => {
  if (loading.value) return
  await toggleWild()
  sampleIndex.value = 0
  setSample()
}

watch(activeType, () => {
  sampleIndex.value = 0
  setSample()
})

onMounted(async () => {
  await loadData()
  if (!error.value) {
    await preloadCardImages(allCards.value.map((card) => card.image))
    pickFirstAvailableType()
    setSample()
  }
})
</script>
