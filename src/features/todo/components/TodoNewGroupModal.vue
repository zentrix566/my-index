<template>
  <div v-if="visible" class="todo-modal-mask" @click.self="close">
    <div class="todo-modal">
      <h3>新建分组</h3>
      <div class="todo-field">
        <label>名称</label>
        <input v-model="name" class="todo-input" maxlength="20" placeholder="如：工作、学习、生活" @keyup.enter="submit" />
      </div>
      <div class="todo-field">
        <label>图标（可选 emoji）</label>
        <input v-model="icon" class="todo-input" maxlength="4" placeholder="📁" />
      </div>
      <div class="todo-field">
        <label>颜色</label>
        <div class="todo-color-row">
          <span
            v-for="c in colors"
            :key="c"
            class="todo-color-dot"
            :class="{ sel: color === c }"
            :style="{ background: c }"
            @click="color = c"
          ></span>
        </div>
      </div>
      <p v-if="error" class="todo-error">{{ error }}</p>
      <div class="todo-modal-actions">
        <button class="todo-btn ghost" type="button" @click="close">取消</button>
        <button class="todo-btn primary" type="button" :disabled="busy" @click="submit">创建</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import todoApi from '../api/todo.js'

const emit = defineEmits(['created'])
const visible = ref(false)
const name = ref('')
const icon = ref('📁')
const color = ref('#3b82f6')
const busy = ref(false)
const error = ref('')
const colors = ['#3b82f6', '#ef4444', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

function open() {
  visible.value = true
  error.value = ''
  name.value = ''
  icon.value = '📁'
  color.value = '#3b82f6'
}
function close() {
  visible.value = false
}
async function submit() {
  if (!name.value.trim()) {
    error.value = '请输入分组名称'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await todoApi.createList({ name: name.value.trim(), icon: icon.value || '📁', color: color.value })
    emit('created')
    close()
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

defineExpose({ open })
</script>
