<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  stations: { type: Array, default: () => [] },
  placeholder: { type: String, default: '选择或输入地铁站点' },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const open = ref(false)
const q = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    q.value = v
  }
)

// 过滤：空查询展示前 50 个，否则按包含匹配
const filtered = computed(() => {
  const t = q.value.trim()
  if (!t) return props.stations.slice(0, 50)
  return props.stations.filter((s) => s.includes(t)).slice(0, 50)
})

function onInput(e) {
  q.value = e.target.value
  emit('update:modelValue', e.target.value)
  open.value = true
}
function onFocus() {
  open.value = true
}
function onBlur() {
  // 延迟关闭，避免点击选项时先触发 blur 导致选择失败
  setTimeout(() => {
    open.value = false
  }, 150)
}
function select(name) {
  q.value = name
  emit('update:modelValue', name)
  open.value = false
}
function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div class="station-input" ref="root">
    <input
      class="si-field"
      :value="q"
      type="text"
      autocomplete="off"
      :placeholder="placeholder"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <ul v-if="open && filtered.length" class="si-list">
      <li class="si-header">地铁站点</li>
      <li
        v-for="s in filtered"
        :key="s"
        class="si-option"
        @mousedown.prevent="select(s)"
      >
        <span class="si-dot"></span>
        <span class="si-name">{{ s }}</span>
        <span class="si-tag">地铁站</span>
      </li>
    </ul>
    <div v-else-if="open" class="si-empty">无匹配站点</div>
  </div>
</template>

<style scoped>
.station-input {
  position: relative;
  width: 100%;
}
.si-field {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 15px;
  background: var(--color-bg);
  color: var(--color-text);
}
.si-field:focus {
  outline: none;
  border-color: var(--color-primary);
}
.si-list {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}
.si-header {
  padding: 6px 10px 4px;
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 1px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 2px;
}
.si-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.si-option:hover {
  background: var(--color-bg);
}
.si-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
}
.si-name {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
}
.si-tag {
  font-size: 11px;
  color: var(--color-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1px 6px;
}
.si-empty {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  padding: 10px 12px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-muted);
  font-size: 13px;
}
</style>
