<script setup>
// 事件播报栏：实时滚动展示最近发生的混乱事件（最新在下方，自动滚到底）
// 顶部成就计数可点击，展开查看全部成就的完成/未完成状态
import { ref, watch, nextTick, computed } from 'vue'
import { ROOM, ACHIEVEMENTS } from '../game/constants.js'

const props = defineProps({
  news: { type: Array, default: () => [] },
  achievements: { type: Array, default: () => [] },
  total: { type: Number, default: 0 }
})

const listRef = ref(null)
const showAch = ref(false)

// 全部成就 + 是否已解锁（已解锁排在前面）
const achList = computed(() =>
  ACHIEVEMENTS.map((a) => ({ ...a, unlocked: props.achievements.includes(a.id) })).sort(
    (x, y) => Number(y.unlocked) - Number(x.unlocked)
  )
)

// 新消息进来后滚动到底部
watch(
  () => props.news.length,
  async () => {
    await nextTick()
    // transition-group 的 ref 是组件实例，取其根 DOM 元素
    const el = listRef.value?.$el ?? listRef.value
    if (el) el.scrollTop = el.scrollHeight
  }
)
</script>

<template>
  <aside class="news-feed" :style="{ height: ROOM.height + 'px' }">
    <div class="news-header">
      📰 实时播报
      <button class="ach-count" :class="{ active: showAch }" @click="showAch = !showAch">
        🏆 {{ achievements.length }}/{{ total }}
      </button>
    </div>

    <!-- 成就面板 -->
    <div v-if="showAch" class="ach-panel">
      <div class="ach-panel-head">
        🏆 成就 ({{ achievements.length }}/{{ total }})
        <button class="close-btn" @click="showAch = false">✕</button>
      </div>
      <div class="ach-scroll">
        <div
          v-for="a in achList"
          :key="a.id"
          class="ach-row"
          :class="{ locked: !a.unlocked }"
        >
          <span class="ach-emoji">{{ a.unlocked ? a.emoji : '🔒' }}</span>
          <div class="ach-info">
            <div class="ach-name">{{ a.name }}</div>
            <div class="ach-desc">{{ a.desc }}</div>
          </div>
          <span class="ach-flag">{{ a.unlocked ? '✅' : '未完成' }}</span>
        </div>
      </div>
    </div>

    <transition-group ref="listRef" name="news" tag="div" class="news-list">
      <div v-for="item in news" :key="item.id" class="news-item">
        <span class="time">{{ item.time }}</span>
        <span class="text">{{ item.text }}</span>
      </div>
    </transition-group>
    <div v-if="!news.length" class="empty">等待事件发生…</div>
  </aside>
</template>

<style scoped>
.news-feed {
  position: relative;
  width: 260px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
  max-height: 80vh;
}

.news-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  color: #f8f9fa;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.ach-count {
  font-size: 12px;
  font-weight: 700;
  color: #ffd43b;
  background: rgba(255, 212, 59, 0.12);
  border: 1px solid rgba(255, 212, 59, 0.35);
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ach-count:hover,
.ach-count.active {
  background: rgba(255, 212, 59, 0.28);
}

.ach-panel {
  position: absolute;
  top: 42px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 22, 0.97);
  border: 1px solid rgba(255, 212, 59, 0.35);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.ach-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  color: #ffd43b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.close-btn {
  background: transparent;
  border: none;
  color: #adb5bd;
  font-size: 15px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 5px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.ach-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.ach-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.05);
}

.ach-row.locked {
  opacity: 0.5;
}

.ach-emoji {
  font-size: 22px;
  flex: none;
}

.ach-info {
  flex: 1;
  min-width: 0;
}

.ach-name {
  font-size: 13px;
  font-weight: 700;
  color: #f8f9fa;
}

.ach-desc {
  font-size: 11.5px;
  color: #adb5bd;
  margin-top: 1px;
}

.ach-flag {
  font-size: 11px;
  color: #868e96;
  flex: none;
}

.ach-row:not(.locked) .ach-flag {
  color: #51cf66;
  font-size: 14px;
}

.news-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

.news-item {
  font-size: 12.5px;
  line-height: 1.4;
  color: #dee2e6;
  padding: 4px 4px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
}

.time {
  color: #868e96;
  margin-right: 6px;
  font-variant-numeric: tabular-nums;
}

.empty {
  color: #868e96;
  font-size: 12px;
  padding: 12px;
  text-align: center;
}

.news-enter-active {
  transition: all 0.25s ease;
}

.news-enter-from {
  opacity: 0;
  transform: translateX(20px);
  background: rgba(255, 212, 59, 0.15);
}
</style>
