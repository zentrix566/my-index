<script setup>
// 通用角色：疯子 / NPC / 猫 / 保安。根据 kind/variant/state 显示不同 emoji 与动画
import { computed } from 'vue'
import SpeechBubble from './SpeechBubble.vue'
import {
  MADMAN_FACES,
  MADMAN_VARIANTS,
  NPC_VARIANTS,
  NPC_PANIC_FACE,
  CAT_FACES,
  GUARD_FACE,
  GUARD_PIN_FACE,
  SANITY
} from '../game/constants.js'

const props = defineProps({
  actor: { type: Object, required: true }
})

const emit = defineEmits(['select'])

const isMadman = computed(() => props.actor.kind === 'madman')
const isNpc = computed(() => props.actor.kind === 'npc')
const isCat = computed(() => props.actor.kind === 'cat')
const isGuard = computed(() => props.actor.kind === 'guard')

// 当前应显示的 emoji
const face = computed(() => {
  const a = props.actor
  if (a.kind === 'madman') {
    const faces = (MADMAN_VARIANTS[a.variant] && MADMAN_VARIANTS[a.variant].faces) || MADMAN_FACES
    return faces[a.state] || faces.walk || MADMAN_FACES.walk
  }
  if (a.kind === 'cat') return CAT_FACES[a.state] || CAT_FACES.walk
  if (a.kind === 'guard') return a.state === 'pin' ? GUARD_PIN_FACE : GUARD_FACE
  return a.state === 'panic' ? NPC_PANIC_FACE : a.face
})

// 角色底部标签
const tag = computed(() => {
  const a = props.actor
  if (a.kind === 'madman') return `疯子·${(MADMAN_VARIANTS[a.variant] || {}).label || ''}`
  if (a.kind === 'guard') return '保安'
  if (a.kind === 'cat') return null
  const v = NPC_VARIANTS[a.variant]
  return v && a.variant !== 'normal' ? v.label : null
})

const tagClass = computed(() => {
  const a = props.actor
  if (a.kind === 'madman') return 'tag-mad'
  if (a.kind === 'guard') return 'tag-guard'
  return 'tag-npc'
})

// 头顶状态小图标：吃瓜掏手机、忧郁飘乌云
const statusIcon = computed(() => {
  const a = props.actor
  if (a.kind === 'npc' && a.state === 'watch') return '📱'
  if (a.kind === 'madman' && a.variant === 'gloom') return '🌧️'
  if (a.kind === 'madman' && a.pinned) return '🔒'
  return null
})

// 理智条（仅疯子/NPC 显示）
const showSanity = computed(() => isMadman.value || isNpc.value)
const sanityRatio = computed(() => Math.max(0, Math.min(1, props.actor.sanity / SANITY.max)))

const isPanic = computed(() => props.actor.state === 'panic')
const isScream = computed(() => props.actor.state === 'scream')
const isSmash = computed(() => props.actor.state === 'smash')
const isStunned = computed(() => props.actor.state === 'stunned' || props.actor.pinned)
</script>

<template>
  <div
    class="actor"
    :class="{
      madman: isMadman,
      cat: isCat,
      guard: isGuard,
      panic: isPanic,
      scream: isScream,
      smash: isSmash,
      stunned: isStunned
    }"
    :style="{
      transform: `translate(${actor.x}px, ${actor.y}px)`,
      fontSize: actor.size + 'px'
    }"
    @pointerdown.stop="emit('select', { id: actor.id, x: actor.x, y: actor.y })"
  >
    <SpeechBubble :text="actor.bubble" :panic="isPanic || isMadman" />

    <div v-if="showSanity" class="sanity-bar">
      <div
        class="sanity-fill"
        :class="{ mad: isMadman }"
        :style="{ width: sanityRatio * 100 + '%' }"
      ></div>
    </div>

    <span v-if="statusIcon" class="status-icon">{{ statusIcon }}</span>
    <span class="glyph">{{ face }}</span>
    <span v-if="tag" class="tag" :class="tagClass">{{ tag }}</span>
  </div>
</template>

<style scoped>
.actor {
  position: absolute;
  top: 0;
  left: 0;
  /* 让 x/y 表示中心点 */
  margin-left: -0.5em;
  margin-top: -0.5em;
  will-change: transform;
  z-index: 10;
  user-select: none;
  cursor: pointer;
}

.actor.madman {
  z-index: 20;
}

.actor.guard {
  z-index: 22;
}

.glyph {
  display: inline-block;
  line-height: 1;
}

.tag {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 2px;
  font-size: 11px;
  color: #fff;
  padding: 1px 5px;
  border-radius: 6px;
  white-space: nowrap;
}

.tag-mad {
  background: #e03131;
}

.tag-guard {
  background: #1971c2;
}

.tag-npc {
  background: #7048e8;
}

.status-icon {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(6px);
  margin-bottom: -6px;
  font-size: 0.5em;
  animation: float-icon 1.2s ease-in-out infinite;
}

.sanity-bar {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 3px;
  width: 34px;
  height: 4px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 3px;
  overflow: hidden;
}

.sanity-fill {
  height: 100%;
  background: linear-gradient(90deg, #4dabf7, #74c0fc);
  transition: width 0.2s ease;
}

/* 疯子的理智条走红色，回满即恢复 */
.sanity-fill.mad {
  background: linear-gradient(90deg, #f03e3e, #ff922b);
}

/* 疯子平时晃动 */
.actor.madman .glyph {
  animation: madman-wiggle 0.4s ease-in-out infinite;
}

/* 被击晕/按住：呆滞轻晃 */
.actor.stunned .glyph {
  animation: stunned-sway 0.6s ease-in-out infinite;
  filter: saturate(0.5);
}

/* 猫奔跑时快速晃 */
.actor.cat .glyph {
  animation: madman-wiggle 0.3s ease-in-out infinite;
}

/* 嘶吼：放大抖动 */
.actor.scream .glyph {
  animation: scream-shake 0.18s linear infinite;
}

/* 击打：向前一顿 */
.actor.smash .glyph {
  animation: smash-punch 0.25s ease-out;
}

/* NPC 惊慌：快速抖动 */
.actor.panic .glyph {
  animation: panic-tremble 0.12s linear infinite;
}

@keyframes madman-wiggle {
  0%,
  100% {
    transform: rotate(-6deg);
  }
  50% {
    transform: rotate(6deg);
  }
}

@keyframes stunned-sway {
  0%,
  100% {
    transform: rotate(-10deg) translateY(0);
  }
  50% {
    transform: rotate(10deg) translateY(-2px);
  }
}

@keyframes scream-shake {
  0% {
    transform: scale(1.2) rotate(-8deg);
  }
  50% {
    transform: scale(1.3) rotate(8deg);
  }
  100% {
    transform: scale(1.2) rotate(-8deg);
  }
}

@keyframes smash-punch {
  0% {
    transform: scale(1) rotate(0);
  }
  40% {
    transform: scale(1.25) rotate(-14deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes panic-tremble {
  0% {
    transform: translateX(-2px);
  }
  50% {
    transform: translateX(2px);
  }
  100% {
    transform: translateX(-2px);
  }
}

@keyframes float-icon {
  0%,
  100% {
    transform: translateX(6px) translateY(0);
  }
  50% {
    transform: translateX(6px) translateY(-3px);
  }
}
</style>
