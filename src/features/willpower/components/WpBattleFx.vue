<template>
  <transition name="wp-fx-fade">
    <div v-if="active" class="wp-fx" :class="mode" aria-hidden="true">
      <div class="wp-fx-stage">
        <!-- 抵御成功 / 正能量：打败心魔 -->
        <template v-if="mode === 'win'">
          <div class="wp-fx-hero">⚔️</div>
          <div class="wp-fx-demon wp-fx-demon-out">👹</div>
          <div class="wp-fx-boom">💥</div>
          <div class="wp-fx-spark wp-fx-spark-1">✨</div>
          <div class="wp-fx-spark wp-fx-spark-2">⭐</div>
          <div class="wp-fx-spark wp-fx-spark-3">✨</div>
          <div class="wp-fx-banner wp-fx-banner-win">{{ label }}</div>
        </template>

        <!-- 破防：被心魔打败 -->
        <template v-else>
          <div class="wp-fx-demon wp-fx-demon-in">👹</div>
          <div class="wp-fx-strike">💢</div>
          <div class="wp-fx-banner wp-fx-banner-lose">{{ label }}</div>
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'

const active = ref(false)
const mode = ref('win')
const label = ref('抗住了！')
let timer = null

function play(type, customLabel) {
  mode.value = type === 'lose' ? 'lose' : 'win'
  if (customLabel) {
    label.value = customLabel
  } else {
    label.value = mode.value === 'lose' ? '破防了…' : '抗住了！'
  }
  active.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    active.value = false
  }, 1700)
}

defineExpose({ play })
</script>

<style scoped>
.wp-fx {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  overflow: hidden;
}

.wp-fx-stage {
  position: relative;
  width: 320px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 胜利：打败心魔 ===== */
.wp-fx.win {
  background: radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0) 60%);
}

.wp-fx-hero {
  position: absolute;
  left: 36px;
  font-size: 76px;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
  animation: wp-hero-slash 0.7s ease-out both;
}

.wp-fx-demon-out {
  position: absolute;
  font-size: 84px;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4));
  animation: wp-demon-out 1.1s cubic-bezier(0.5, 0, 0.75, 0.3) both;
}

.wp-fx-boom {
  position: absolute;
  font-size: 96px;
  opacity: 0;
  animation: wp-boom 0.9s ease-out 0.35s both;
}

.wp-fx-spark {
  position: absolute;
  font-size: 34px;
  opacity: 0;
}
.wp-fx-spark-1 { animation: wp-spark-a 1s ease-out 0.5s both; }
.wp-fx-spark-2 { animation: wp-spark-b 1s ease-out 0.6s both; }
.wp-fx-spark-3 { animation: wp-spark-a 1s ease-out 0.75s both; }

.wp-fx-banner {
  position: absolute;
  bottom: 6px;
  padding: 10px 26px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 1.4rem;
  letter-spacing: 1px;
  white-space: nowrap;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
}
.wp-fx-banner-win {
  color: #fff;
  background: linear-gradient(135deg, #34d399, #059669);
  animation: wp-banner-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.45s both;
}

/* ===== 失败：被心魔打败 ===== */
.wp-fx.lose {
  background: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.2), rgba(127, 29, 29, 0) 62%);
  animation: wp-shake 0.5s ease-in-out both;
}

.wp-fx-demon-in {
  position: absolute;
  font-size: 92px;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
  animation: wp-demon-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.wp-fx-strike {
  position: absolute;
  top: 40px;
  right: 70px;
  font-size: 48px;
  opacity: 0;
  animation: wp-strike 0.8s ease-out 0.4s both;
}

.wp-fx-banner-lose {
  color: #fff;
  background: linear-gradient(135deg, #fb7185, #be123c);
  animation: wp-banner-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.45s both;
}

/* ===== 关键帧 ===== */
@keyframes wp-hero-slash {
  0% { transform: translateX(-30px) rotate(-40deg); opacity: 0; }
  40% { transform: translateX(0) rotate(8deg); opacity: 1; }
  100% { transform: translateX(0) rotate(0deg); opacity: 1; }
}

@keyframes wp-demon-out {
  0% { transform: translateX(0) scale(1) rotate(0); opacity: 1; }
  35% { transform: translateX(-6px) scale(1.05) rotate(-6deg); }
  100% { transform: translateX(160px) scale(0.2) rotate(220deg); opacity: 0; }
}

@keyframes wp-boom {
  0% { opacity: 0; transform: scale(0.4); }
  30% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0; transform: scale(1.5); }
}

@keyframes wp-spark-a {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: translate(70px, -60px) scale(1.1); }
}
@keyframes wp-spark-b {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: translate(-60px, -50px) scale(1.1); }
}

@keyframes wp-demon-in {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes wp-strike {
  0% { opacity: 0; transform: scale(0.4) rotate(-20deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(10deg); }
  100% { opacity: 0; transform: scale(1) rotate(0); }
}

@keyframes wp-banner-pop {
  0% { opacity: 0; transform: translateY(14px) scale(0.85); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes wp-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(7px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(4px); }
}

.wp-fx-fade-enter-active,
.wp-fx-fade-leave-active {
  transition: opacity 0.25s ease;
}
.wp-fx-fade-enter-from,
.wp-fx-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .wp-fx * { animation-duration: 0.001s !important; }
}
</style>
