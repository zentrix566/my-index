<script setup>
// 房间舞台：分层渲染背景、残迹、物体、角色、碎片与特效
// 同时承载"上帝之手"交互：点击角色弹菜单、拖拽物体、点击空地生成
import { computed, ref } from 'vue'
import Actor from './Actor.vue'
import SmashObject from './SmashObject.vue'
import ActorMenu from './ActorMenu.vue'
import { ROOM, DECOR, MOOD_LEVELS, CHAOS_LEVELS } from '../game/constants.js'
import {
  spawnAt,
  moveObject,
  shooActor,
  calmActor,
  speedUpActor,
  removeActor
} from '../game/world.js'

const props = defineProps({
  world: { type: Object, required: true },
  placeKind: { type: String, default: 'object' }
})

const wrapRef = ref(null)
const menu = ref(null) // { id, x, y }
const dragId = ref(null)

// 把装饰物的相对坐标换算为像素
const decorItems = computed(() =>
  DECOR.map((d, i) => ({
    key: `decor-${i}`,
    emoji: d.emoji,
    size: d.size,
    layer: d.layer,
    x: d.fx * ROOM.width,
    y: d.fy * ROOM.height
  }))
)

// 抑屏偏移（整个房间随爆炸/击打/地震抖动）
const shakeStyle = computed(() => ({
  width: ROOM.width + 'px',
  height: ROOM.height + 'px',
  transform: `translate(${props.world.shakeX}px, ${props.world.shakeY}px)`,
  background: MOOD_LEVELS[props.world.mood]?.bg || '#2b2620'
}))

const isDoomsday = computed(() => CHAOS_LEVELS[props.world.chaosLevel]?.doomsday)

const wallHeight = ROOM.wallHeight

// 屏幕坐标 → 房间世界坐标（兼容响应式缩放）
function toWorld(clientX, clientY) {
  const rect = wrapRef.value.getBoundingClientRect()
  const scale = ROOM.width / rect.width
  return {
    x: (clientX - rect.left) * scale,
    y: (clientY - rect.top) * scale
  }
}

// 点击角色：弹出操作菜单
function onSelect(payload) {
  menu.value = { id: payload.id, x: payload.x, y: payload.y }
}

// 菜单动作
function onMenuAction(action) {
  if (!menu.value) return
  const id = menu.value.id
  if (action === 'shoo') shooActor(id)
  else if (action === 'calm') calmActor(id)
  else if (action === 'speed') speedUpActor(id)
  else if (action === 'remove') removeActor(id)
  menu.value = null
}

// 物体拖拽开始
function onDragStart({ id, event }) {
  dragId.value = id
  menu.value = null
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  onDragMove(event)
}

function onDragMove(e) {
  if (dragId.value == null) return
  const p = toWorld(e.clientX, e.clientY)
  moveObject(dragId.value, p.x, p.y)
}

function onDragEnd() {
  dragId.value = null
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
}

// 点击空白处：关闭已开菜单，否则在该点生成所选实体
function onStageDown(e) {
  if (menu.value) {
    menu.value = null
    return
  }
  const p = toWorld(e.clientX, e.clientY)
  if (p.y < ROOM.wallHeight) return // 别在墙面上生成
  spawnAt(props.placeKind, p.x, p.y)
}
</script>

<template>
  <div
    ref="wrapRef"
    class="stage-wrap"
    :class="{ doomsday: isDoomsday }"
    :style="{ width: ROOM.width + 'px', height: ROOM.height + 'px' }"
    @pointerdown="onStageDown"
  >
    <div class="stage" :style="shakeStyle">
      <!-- 背景：墙面 + 地板 + 地毯 -->
      <div class="wall" :style="{ height: wallHeight + 'px' }"></div>
      <div class="baseboard" :style="{ top: wallHeight + 'px' }"></div>
      <div class="floor" :style="{ top: wallHeight + 'px' }"></div>
      <div class="rug"></div>

      <!-- 装饰层：贴墙 -->
      <div
        v-for="d in decorItems"
        v-show="d.layer === 'wall'"
        :key="d.key"
        class="decor wall-decor"
        :style="{ transform: `translate(${d.x}px, ${d.y}px)`, fontSize: d.size + 'px' }"
      >
        {{ d.emoji }}
      </div>

      <!-- 地板残迹（永久） -->
      <div
        v-for="mk in world.marks"
        :key="mk.id"
        class="mark"
        :style="{ transform: `translate(${mk.x}px, ${mk.y}px) rotate(${mk.rot}deg)` }"
      >
        {{ mk.emoji }}
      </div>

      <!-- 装饰层：落地（在残迹之上，物体之下） -->
      <div
        v-for="d in decorItems"
        v-show="d.layer === 'floor'"
        :key="d.key + '-f'"
        class="decor floor-decor"
        :style="{ transform: `translate(${d.x}px, ${d.y}px)`, fontSize: d.size + 'px' }"
      >
        {{ d.emoji }}
      </div>

      <SmashObject v-for="o in world.objects" :key="o.id" :obj="o" @drag-start="onDragStart" />
      <Actor v-for="a in world.actors" :key="a.id" :actor="a" @select="onSelect" />

      <!-- 飞溅碎片 -->
      <div
        v-for="d in world.debris"
        :key="d.id"
        class="debris"
        :style="{
          transform: `translate(${d.x}px, ${d.y}px) rotate(${d.rot}deg)`,
          opacity: d.life
        }"
      >
        {{ d.emoji }}
      </div>

      <!-- 击打/爆炸等短暂特效 -->
      <div
        v-for="fx in world.effects"
        :key="fx.id"
        class="effect"
        :style="{ transform: `translate(${fx.x}px, ${fx.y}px)` }"
      >
        {{ fx.emoji }}
      </div>

      <!-- 角色操作菜单 -->
      <ActorMenu
        v-if="menu"
        :x="menu.x"
        :y="menu.y"
        @action="onMenuAction"
      />
    </div>

    <!-- 末日红色氛围罩 -->
    <div v-if="isDoomsday" class="doom-overlay"></div>
  </div>
</template>

<style scoped>
.stage-wrap {
  position: relative;
  margin: 0 auto;
  max-width: 100%;
  border: 12px solid #4a3423;
  border-radius: 10px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  touch-action: none;
}

.stage-wrap.doomsday {
  border-color: #7a1f1f;
}

.stage {
  position: relative;
  overflow: hidden;
  background: #2b2620;
  transition: background 1.2s ease;
}

.doom-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(150, 0, 0, 0.35) 100%);
  animation: doom-pulse 2s ease-in-out infinite;
  z-index: 55;
}

@keyframes doom-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* 墙面：带竖条墙纸质感 */
.wall {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background:
    repeating-linear-gradient(
      90deg,
      #6d5a7e 0px,
      #6d5a7e 26px,
      #63517440 26px,
      #635174 52px
    ),
    linear-gradient(#7a6690, #5f4f78);
  box-shadow: inset 0 -12px 20px rgba(0, 0, 0, 0.25);
}

/* 踢脚线 */
.baseboard {
  position: absolute;
  left: 0;
  width: 100%;
  height: 10px;
  background: #3a2c1e;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

/* 地板：木纹 + 网格 */
.floor {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: #d9b380;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.06) 0px,
      rgba(0, 0, 0, 0.06) 2px,
      transparent 2px,
      transparent 46px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(120, 72, 20, 0.18) 0px,
      rgba(120, 72, 20, 0.18) 2px,
      transparent 2px,
      transparent 120px
    );
}

/* 中央地毯 */
.rug {
  position: absolute;
  left: 50%;
  top: 58%;
  width: 46%;
  height: 46%;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse at center, #b5462f 0%, #8f3423 60%, #6d2519 100%);
  border: 8px solid #e8c17a;
  border-radius: 50%;
  opacity: 0.55;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.35);
}

.decor {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
}

.wall-decor {
  z-index: 3;
}

.floor-decor {
  z-index: 4;
  opacity: 0.95;
}

.mark {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  font-size: 24px;
  line-height: 1;
  opacity: 0.5;
  z-index: 3;
  pointer-events: none;
  user-select: none;
}

.debris {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  font-size: 20px;
  line-height: 1;
  z-index: 45;
  pointer-events: none;
  user-select: none;
}

.effect {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  font-size: 34px;
  z-index: 50;
  pointer-events: none;
  animation: effect-pop 0.5s ease-out forwards;
}

@keyframes effect-pop {
  0% {
    opacity: 0;
    scale: 0.4;
  }
  30% {
    opacity: 1;
    scale: 1.3;
  }
  100% {
    opacity: 0;
    scale: 1.6;
    translate: 0 -18px;
  }
}
</style>
