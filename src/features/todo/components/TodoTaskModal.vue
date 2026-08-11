<template>
  <div v-if="visible" class="todo-modal-mask" @click.self="close">
    <div class="todo-modal">
      <h3>{{ isEdit ? '编辑任务' : '新建任务' }}</h3>
      <div class="todo-field">
        <label>标题</label>
        <input
          v-model="form.title"
          class="todo-input"
          maxlength="200"
          placeholder="要做点什么？"
          @keyup.enter="submit"
        />
      </div>
      <div class="todo-field">
        <label>备注（可选）</label>
        <textarea
          v-model="form.note"
          class="todo-textarea"
          maxlength="2000"
          placeholder="补充说明、链接、想法…"
        ></textarea>
      </div>
      <div class="todo-row">
        <div class="todo-field">
          <label>日期</label>
          <input v-model="form.dueDate" type="date" class="todo-input" />
        </div>
        <div class="todo-field">
          <label>优先级</label>
          <select v-model="form.priority" class="todo-select">
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      </div>
      <div class="todo-field">
        <label>状态</label>
        <select v-model="form.status" class="todo-select">
          <option v-for="s in TASK_STATUS_LIST" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="todo-field">
        <label>分组</label>
        <select v-model="form.listId" class="todo-select">
          <option :value="''">未分组</option>
          <option v-for="l in lists" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
      </div>
      <p v-if="error" class="todo-error">{{ error }}</p>
      <div class="todo-modal-actions">
        <button class="todo-btn ghost" type="button" @click="close">取消</button>
        <button class="todo-btn primary" type="button" :disabled="busy" @click="submit">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getLastListId, setLastListId } from '../utils/lastList.js'
import { TASK_STATUS_LIST } from '../constants.js'

defineProps({
  lists: { type: Array, default: () => [] }
})

const emit = defineEmits(['save', 'close'])

const visible = ref(false)
const busy = ref(false)
const error = ref('')
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ title: '', note: '', dueDate: '', priority: 'medium', status: 'pending', listId: '' })

function open(initial = null) {
  error.value = ''
  busy.value = false
  isEdit.value = !!(initial && initial.id)
  editId.value = initial?.id || null
  form.value = {
    title: initial?.title || '',
    note: initial?.note || '',
    dueDate: initial?.dueDate || '',
    priority: initial?.priority || 'medium',
    status: initial?.status || 'pending',
    listId: initial?.listId || getLastListId()
  }
  visible.value = true
}

function close() {
  visible.value = false
  emit('close')
}

function submit() {
  if (!form.value.title.trim()) {
    error.value = '请输入任务标题'
    return
  }
  busy.value = true
  error.value = ''
  const payload = {
    title: form.value.title.trim(),
    note: form.value.note || '',
    dueDate: form.value.dueDate || null,
    priority: form.value.priority,
    status: form.value.status,
    listId: form.value.listId ? Number(form.value.listId) : null
  }
  if (payload.listId) setLastListId(payload.listId)
  emit('save', { payload, id: editId.value })
}

function markSaved() {
  busy.value = false
  close()
}

function markError(msg) {
  busy.value = false
  error.value = msg || '保存失败'
}

defineExpose({ open, close, markSaved, markError })
</script>
