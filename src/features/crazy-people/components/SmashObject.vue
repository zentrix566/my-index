<script setup>
// 可击打物体：显示 emoji，被击打时抖动，破碎后换成碎裂 emoji；支持拖拽重新摆放
import { computed } from 'vue'

const props = defineProps({
  obj: { type: Object, required: true }
})

const emit = defineEmits(['drag-start'])

const glyph = computed(() => (props.obj.broken ? props.obj.brokenEmoji : props.obj.emoji))
const shaking = computed(() => props.obj.shakeTimer > 0)

// 血量比例，用于显示血条
const hpRatio = computed(() => Math.max(0, props.obj.hp) / props.obj.maxHp)

function onPointerDown(e) {
  if (props.obj.broken) return
  emit('drag-start', { id: props.obj.id, event: e })
}
</script>

<template>
  <div
    class="smash-object"
    :class="{ shaking, broken: obj.broken, draggable: !obj.broken }"
    :style="{
      transform: `translate(${obj.x}px, ${obj.y}px)`,
      fontSize: obj.size + 'px'
    }"
    @pointerdown.stop="onPointerDown"
  >
    <div v-if="!obj.broken" class="hp-bar">
      <div class="hp-fill" :style="{ width: hpRatio * 100 + '%' }"></div>
    </div>
    <span class="glyph">{{ glyph }}</span>
    <span v-if="obj.label && !obj.broken" class="obj-tag">{{ obj.label }}</span>
  </div>
</template>

<style scoped>
.smash-object {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  z-index: 5;
  user-select: none;
  will-change: transform;
}

.smash-object.draggable {
  cursor: grab;
}

.smash-object.draggable:active {
  cursor: grabbing;
}

.glyph {
  display: inline-block;
  line-height: 1;
}

.smash-object.shaking .glyph {
  animation: obj-shake 0.35s ease-out;
}

.smash-object.broken {
  opacity: 0.75;
}

.smash-object.broken .glyph {
  filter: grayscale(0.4);
  transform: rotate(-12deg);
  display: inline-block;
}

.hp-bar {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 3px;
  width: 34px;
  height: 5px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #40c057, #94d82d);
  transition: width 0.15s ease;
}

.obj-tag {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 2px;
  font-size: 10px;
  background: #1971c2;
  color: #fff;
  padding: 1px 5px;
  border-radius: 6px;
  white-space: nowrap;
}

@keyframes obj-shake {
  0% {
    transform: translateX(0) rotate(0);
  }
  20% {
    transform: translateX(-6px) rotate(-10deg);
  }
  40% {
    transform: translateX(6px) rotate(10deg);
  }
  60% {
    transform: translateX(-4px) rotate(-6deg);
  }
  80% {
    transform: translateX(4px) rotate(6deg);
  }
  100% {
    transform: translateX(0) rotate(0);
  }
}
</style>
