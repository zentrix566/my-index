<script setup>
// 角色图鉴：分组展示各类角色与机制说明，点击遮罩或关闭按钮隐藏
import { CHARACTER_GUIDE } from '../game/constants.js'

defineProps({
  open: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="guide-mask" @click="emit('close')">
      <div class="guide-panel" @click.stop>
        <div class="guide-head">
          📖 角色图鉴
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>
        <div class="guide-body">
          <section v-for="g in CHARACTER_GUIDE" :key="g.group" class="guide-group">
            <h3 class="group-title">{{ g.group }}</h3>
            <div class="cards">
              <div v-for="it in g.items" :key="it.name" class="card">
                <span class="emoji">{{ it.emoji }}</span>
                <div class="info">
                  <div class="name">{{ it.name }}</div>
                  <div class="desc">{{ it.desc }}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.guide-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 20px;
}

.guide-panel {
  width: 640px;
  max-width: 100%;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1f;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.guide-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  font-size: 17px;
  font-weight: 800;
  color: #f8f9fa;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.close-btn {
  background: transparent;
  border: none;
  color: #adb5bd;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 6px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.guide-body {
  padding: 14px 18px 18px;
  overflow-y: auto;
}

.group-title {
  margin: 14px 0 8px;
  font-size: 14px;
  color: #ffd43b;
}

.guide-group:first-child .group-title {
  margin-top: 0;
}

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.emoji {
  font-size: 28px;
  flex: none;
}

.info {
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 700;
  color: #f1f3f5;
}

.desc {
  font-size: 12px;
  color: #adb5bd;
  margin-top: 2px;
  line-height: 1.4;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
