<script setup>
// 角色操作菜单：点击角色后弹出，提供驱赶/安抚/加速/删除
defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
})

const emit = defineEmits(['action', 'close'])

const actions = [
  { key: 'shoo', label: '驱赶', icon: '🏃' },
  { key: 'calm', label: '安抚', icon: '😌' },
  { key: 'speed', label: '加速', icon: '⚡' },
  { key: 'remove', label: '删除', icon: '❌' }
]
</script>

<template>
  <div class="actor-menu" :style="{ transform: `translate(${x}px, ${y}px)` }" @pointerdown.stop>
    <button
      v-for="a in actions"
      :key="a.key"
      class="menu-btn"
      @click="emit('action', a.key)"
    >
      <span class="ic">{{ a.icon }}</span>{{ a.label }}
    </button>
  </div>
</template>

<style scoped>
.actor-menu {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: 24px;
  margin-top: -30px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgba(20, 20, 24, 0.92);
  border: 1px solid #495057;
  border-radius: 8px;
  padding: 5px;
  z-index: 60;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: #f1f3f5;
  font-size: 13px;
  padding: 4px 10px 4px 6px;
  border-radius: 5px;
  white-space: nowrap;
  text-align: left;
}

.menu-btn:hover {
  background: #364fc7;
}

.ic {
  font-size: 15px;
}
</style>
