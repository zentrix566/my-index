<template>
  <section
    class="section page-section hs-page hs-journey-page"
    :style="{ '--hs-header-offset': headerOffset + 'px' }"
  >
    <div class="container">
      <header class="hs-journey-hero">
        <p class="eyebrow">Hearthstone Journey · {{ journey.expansion }}</p>
        <h1>
          旅途 · {{ journey.title }}
          <small>{{ journey.chapterLabel }} · 剧情文本与任务一览</small>
        </h1>
        <div class="hs-journey-summary">
          <p v-for="(paragraph, i) in journey.summary" :key="i">{{ paragraph }}</p>
        </div>
        <div class="hs-journey-hero-meta">
          <span class="hs-journey-meta-chip">共 <strong>{{ journey.parts.length }}</strong> 个部分</span>
          <span class="hs-journey-meta-chip">每部分 <strong>7</strong> 个剧情片段</span>
          <span class="hs-journey-meta-chip">每部分奖励 <strong>1 包</strong> 黑暗帝国卡包</span>
          <span class="hs-journey-meta-chip">第七部分含 <strong>双结局分支</strong></span>
        </div>
        <div class="hs-journey-spoiler">
          ⚠️ 剧透警告：本页包含旅途系统的完整剧情文本与游戏内语音，想亲自体验剧情建议先去游戏内推进，再回来对照任务。
        </div>
        <div class="hs-journey-hero-links">
          <router-link to="/hearthstone">← 返回成就档案</router-link>
          <router-link to="/hearthstone/guide">炉石功能手册</router-link>
          <a :href="journey.source.url" target="_blank" rel="noopener noreferrer">
            文本参考：{{ journey.source.name }} ↗
          </a>
        </div>
      </header>

      <div class="hs-journey-toolbar">
        <nav class="hs-journey-part-nav" aria-label="旅途部分导航">
          <a v-for="(part, i) in journey.parts" :key="i" :href="`#part-${i + 1}`">
            {{ part.title }}
          </a>
        </nav>
        <div class="hs-journey-toolbar-side">
          <div class="hs-journey-mode" role="group" aria-label="内容显示模式">
            <label
              v-for="option in viewModes"
              :key="option.value"
              class="hs-journey-mode-option"
              :class="{ active: viewMode === option.value }"
            >
              <input v-model="viewMode" type="radio" name="hs-journey-mode" :value="option.value">
              {{ option.label }}
            </label>
          </div>
          <a
            class="hs-journey-source-link"
            :href="journey.source.url"
            target="_blank"
            rel="noopener noreferrer"
          >NGA 原文 ↗</a>
        </div>
      </div>

      <article
        v-for="(part, pi) in journey.parts"
        :id="`part-${pi + 1}`"
        :key="pi"
        class="hs-journey-part"
      >
        <header class="hs-journey-part-head">
          <h2>
            {{ part.title }}
            <span class="hs-journey-part-range">{{ partRange(part) }}</span>
          </h2>
          <span class="hs-journey-part-reward">🎁 {{ part.reward }} ×1</span>
        </header>

        <div class="hs-journey-scenes">
          <JourneySceneCard
            v-for="scene in part.scenes"
            :key="scene.no"
            :scene="scene"
            :view-mode="viewMode"
          />

          <template v-if="part.branches">
            <div class="hs-journey-branch-note">
              完成第五片段「无尽之怒」后剧情分成两条路线，各有独立的第六、第七片段与对话，任务不同、奖励相同。
            </div>
            <div class="hs-journey-branches">
              <div
                v-for="branch in part.branches"
                :key="branch.key"
                class="hs-journey-branch-col"
              >
                <div class="hs-journey-branch-head">
                  <span class="hs-journey-branch-key">{{ branch.key.toUpperCase() }}</span>
                  {{ branch.label }}
                </div>
                <JourneySceneCard
                  v-for="scene in branch.scenes"
                  :key="scene.no"
                  :scene="scene"
                  :view-mode="viewMode"
                />
              </div>
            </div>
          </template>
        </div>

        <footer class="hs-journey-part-foot">
          完成本部分奖励：{{ part.reward }} ×1
        </footer>
      </article>

      <p class="hs-journey-page-foot">
        剧情与任务文本整理自游戏内实装内容，参考
        <a :href="journey.source.url" target="_blank" rel="noopener noreferrer">{{ journey.source.name }}</a
        >；如游戏内后续补丁调整了任务口径，以游戏内实际显示为准。
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { journeys } from '../data/journeys.js'
import { usePersistentRef } from '../composables/usePersistentRef.js'
import JourneySceneCard from '../components/JourneySceneCard.vue'
import '../styles/hearthstone-journey.css'

const journey = journeys[0]

const viewModes = [
  { value: 'all', label: '全部' },
  { value: 'story', label: '只看剧情' },
  { value: 'tasks', label: '仅看任务' }
]

// 旧版本地化的是布尔值 hs-journey-tasks-only，迁移到三态 viewMode
function migrateLegacyView() {
  try {
    const legacy = localStorage.getItem('hs-journey-tasks-only')
    if (legacy != null) {
      localStorage.setItem('hs-journey-view-mode', legacy === '1' ? 'tasks' : 'all')
      localStorage.removeItem('hs-journey-tasks-only')
    }
  } catch {
    // 忽略存储异常
  }
}
migrateLegacyView()
const viewMode = usePersistentRef('hs-journey-view-mode', 'all')

// 全站顶栏下滚隐藏（transform 滑出）、上滚重现。工具条与部分标题都吸顶在顶栏之下，
// 这里实时测量顶栏当前占位高度，经 CSS 变量 --hs-header-offset 注入样式，显隐切换时同步让位。
const headerOffset = ref(0)
let headerEl
let rafId = 0
const syncHeaderOffset = () => {
  if (!headerEl) return
  headerOffset.value = Math.max(0, headerEl.getBoundingClientRect().bottom)
}
// 顶栏滑入/滑出带 0.25s 过渡：任一触发源之后逐帧跟随 0.6s，避免停在中间帧或跟丢显隐切换
const kickHeaderSync = () => {
  syncHeaderOffset()
  cancelAnimationFrame(rafId)
  const start = performance.now()
  const tick = () => {
    syncHeaderOffset()
    if (performance.now() - start < 600) rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}
let classObserver
onMounted(() => {
  headerEl = document.querySelector('.site-header')
  if (!headerEl) return
  syncHeaderOffset()
  kickHeaderSync()
  window.addEventListener('scroll', kickHeaderSync, { passive: true })
  window.addEventListener('resize', kickHeaderSync)
  // 顶栏显隐由 class 切换驱动，兜底监听其变化（防止个别滚动事件未到达本页监听器）
  classObserver = new MutationObserver(kickHeaderSync)
  classObserver.observe(headerEl, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', kickHeaderSync)
  window.removeEventListener('resize', kickHeaderSync)
  classObserver?.disconnect()
  cancelAnimationFrame(rafId)
})

function partRange(part) {
  if (part.branches) {
    return `片段 ${part.scenes[0].no}–${part.scenes.at(-1).no}，随后分为两条支线（6a/6b、7a/7b）`
  }
  return `片段 ${part.scenes[0].no}–${part.scenes.at(-1).no} · ${part.scenes[0].title} → ${part.scenes.at(-1).title}`
}
</script>
