<script setup>
// 角色头顶气泡：文字为空时不渲染
defineProps({
  text: { type: String, default: '' },
  panic: { type: Boolean, default: false }
})
</script>

<template>
  <transition name="bubble">
    <div v-if="text" class="speech-bubble" :class="{ panic }">
      {{ text }}
    </div>
  </transition>
</template>

<style scoped>
.speech-bubble {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  padding: 4px 10px;
  background: #fff;
  border: 2px solid #333;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.3;
  white-space: nowrap;
  color: #222;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 30;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #333;
}

.speech-bubble.panic {
  background: #ffe3e3;
  border-color: #e03131;
  color: #c92a2a;
  font-weight: 700;
}

.speech-bubble.panic::after {
  border-top-color: #e03131;
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
