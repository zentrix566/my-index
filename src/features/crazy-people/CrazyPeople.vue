<script setup>
// 应用根组件：初始化世界、驱动主循环、连接控制面板与信息面板
import { computed, ref } from 'vue'
import GameStage from './components/GameStage.vue'
import ControlPanel from './components/ControlPanel.vue'
import NewsFeed from './components/NewsFeed.vue'
import AchievementToast from './components/AchievementToast.vue'
import CharacterGuide from './components/CharacterGuide.vue'
import { useGameLoop } from './composables/useGameLoop.js'
import { soundState, toggleSound } from './game/sound.js'
import { ROOM, ACHIEVEMENTS } from './game/constants.js'
import {
  world,
  tick,
  resetWorld,
  addMadman,
  addNpc,
  addObject,
  spawnCat,
  spawnGuard,
  increaseChaos,
  consumeToast,
  countMadmen,
  countPanicNpc
} from './game/world.js'

resetWorld()

const { running, toggle } = useGameLoop(tick)

const madmen = computed(() => countMadmen())
const panicking = computed(() => countPanicNpc())

const placeKind = ref('object')
const showGuide = ref(false)

function onReset() {
  resetWorld()
}
</script>

<template>
  <div class="app">
    <header class="title">
      <h1>🤪 密闭空间发疯小人</h1>
      <p>
        疯子有四种人设（狂暴/忧郁/表演/高智商），路人分勇者/吃瓜/暴躁等；理智归零的路人会被逼疯，疯子冷静后又能变回好人。房间里有炸弹💣、警铃🔔等道具，还有乱窜的猫🐈 与前来控场的保安👮。点角色弹菜单、拖物体摆现场、选类型点空地生成——尽情制造混乱吧。
      </p>
      <button class="guide-btn" @click="showGuide = true">📖 角色图鉴</button>
    </header>

    <div class="layout" :style="{ maxWidth: ROOM.width + 320 + 'px' }">
      <div class="board" :style="{ width: ROOM.width + 'px' }">
        <ControlPanel
          :running="running"
          :chaos-level="world.chaosLevel"
          :mood="world.mood"
          :madmen="madmen"
          :panicking="panicking"
          :smashed="world.stats.smashed"
          :sound-on="soundState.enabled"
          v-model:place-kind="placeKind"
          @add-madman="addMadman"
          @add-npc="addNpc"
          @add-object="addObject"
          @add-cat="spawnCat"
          @add-guard="spawnGuard"
          @chaos="increaseChaos"
          @toggle="toggle"
          @toggle-sound="toggleSound"
          @reset="onReset"
        />

        <GameStage :world="world" :place-kind="placeKind" />
      </div>

      <NewsFeed
        :news="world.news"
        :achievements="world.achievements"
        :total="ACHIEVEMENTS.length"
      />
    </div>

    <footer class="foot">全自动演示 · 点上方按钮加剧混乱 / 开关声音 · 点击角色或拖拽物体来当"上帝之手"</footer>

    <AchievementToast :toast="world.pendingToast" @consumed="consumeToast" />
    <CharacterGuide :open="showGuide" @close="showGuide = false" />
  </div>
</template>

<style scoped>
.app {
  min-height: calc(100vh - 137px);
  padding: 24px 16px 40px;
  box-sizing: border-box;
  /* 独立深色背景：my-index 全站为浅色主题，这里在组件内自带渐变，避免污染全局 body */
  background: radial-gradient(circle at 50% 0%, #343a40, #212529 70%);
}

.title {
  text-align: center;
  color: #f8f9fa;
  margin-bottom: 18px;
}

.title h1 {
  margin: 0 0 6px;
  font-size: 30px;
}

.title p {
  margin: 0 auto;
  font-size: 14px;
  color: #ced4da;
  max-width: 820px;
  line-height: 1.5;
}

.guide-btn {
  margin-top: 10px;
  cursor: pointer;
  border: 1px solid #ffd43b;
  background: rgba(255, 212, 59, 0.12);
  color: #ffd43b;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  transition: background 0.15s ease;
}

.guide-btn:hover {
  background: rgba(255, 212, 59, 0.25);
}

.layout {
  margin: 0 auto;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: center;
}

.board {
  max-width: 100%;
  flex: none;
}

.foot {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: #868e96;
}

@media (max-width: 1180px) {
  .layout {
    flex-direction: column;
    align-items: center;
  }
}
</style>
