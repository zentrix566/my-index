<script setup>
// 控制面板：混乱操作 + 实时统计 + 放置选择器
import { CHAOS_LEVELS, MAX_CHAOS, MOOD_LEVELS } from '../game/constants.js'

const props = defineProps({
  running: { type: Boolean, default: true },
  chaosLevel: { type: Number, default: 1 },
  mood: { type: Number, default: 0 },
  madmen: { type: Number, default: 0 },
  panicking: { type: Number, default: 0 },
  smashed: { type: Number, default: 0 },
  soundOn: { type: Boolean, default: false },
  placeKind: { type: String, default: 'object' }
})

const emit = defineEmits([
  'add-madman',
  'add-npc',
  'add-object',
  'add-cat',
  'add-guard',
  'chaos',
  'toggle',
  'reset',
  'toggle-sound',
  'update:placeKind'
])

const placeOptions = [
  { value: 'object', label: '📦 物体' },
  { value: 'npc', label: '🧑 路人' },
  { value: 'madman', label: '😈 疯子' },
  { value: 'cat', label: '🐈 猫' },
  { value: 'guard', label: '👮 保安' }
]

function chaosName() {
  return CHAOS_LEVELS[props.chaosLevel]?.name || ''
}

function moodEmoji() {
  return MOOD_LEVELS[props.mood]?.emoji || '🟢'
}
</script>

<template>
  <div class="panel">
    <div class="stats">
      <span class="stat">{{ moodEmoji() }} 氛围</span>
      <span class="stat">😡 疯子 <b>{{ madmen }}</b></span>
      <span class="stat">😱 惊慌 <b>{{ panicking }}</b></span>
      <span class="stat">💥 砸坏 <b>{{ smashed }}</b></span>
      <span class="stat">🔥 混乱 <b>Lv.{{ chaosLevel }}</b> {{ chaosName() }}</span>
    </div>
    <div class="buttons">
      <button class="btn danger" :disabled="chaosLevel >= MAX_CHAOS" @click="emit('chaos')">
        🔥 加剧混乱
      </button>
      <button class="btn" @click="emit('add-madman')">➕ 疯子</button>
      <button class="btn" @click="emit('add-npc')">🧑 路人</button>
      <button class="btn" @click="emit('add-object')">📦 物体</button>
      <button class="btn" @click="emit('add-cat')">🐈 猫</button>
      <button class="btn" @click="emit('add-guard')">👮 保安</button>
      <label class="place">
        点击生成：
        <select
          :value="placeKind"
          @change="emit('update:placeKind', $event.target.value)"
        >
          <option v-for="o in placeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <button class="btn" @click="emit('toggle')">{{ running ? '⏸ 暂停' : '▶ 继续' }}</button>
      <button class="btn" :class="{ on: soundOn }" @click="emit('toggle-sound')">
        {{ soundOn ? '🔊 声音开' : '🔇 声音关' }}
      </button>
      <button class="btn ghost" @click="emit('reset')">↺ 重置</button>
    </div>
  </div>
</template>

<style scoped>
.panel {
  width: 100%;
  margin: 0 auto 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.stat {
  font-size: 15px;
  color: #f1f3f5;
  background: rgba(0, 0, 0, 0.25);
  padding: 6px 12px;
  border-radius: 8px;
}

.stat b {
  color: #ffd43b;
  font-size: 17px;
}

.buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  cursor: pointer;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  background: #495057;
  color: #fff;
  transition: transform 0.08s ease, background 0.15s ease;
}

.btn:hover {
  background: #343a40;
}

.btn:active {
  transform: scale(0.94);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn.danger {
  background: #e8590c;
}

.btn.danger:hover:not(:disabled) {
  background: #d9480f;
}

.btn.ghost {
  background: transparent;
  border: 1px solid #868e96;
}

.btn.on {
  background: #2f9e44;
}

.btn.on:hover {
  background: #2b8a3e;
}

.place {
  font-size: 13px;
  color: #ced4da;
  display: flex;
  align-items: center;
  gap: 4px;
}

.place select {
  background: #495057;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
  cursor: pointer;
}
</style>
