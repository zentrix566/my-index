<template>
  <form class="notes-editor" @submit.prevent="$emit('save')">
    <div class="notes-editor__head"><h2>{{ note.id ? '编辑记录' : '记下一条' }}</h2></div>
    <div class="notes-form-grid">
      <label>月份<input v-model="note.monthKey" type="month" /></label>
      <label>分类<select v-model="note.category"><option value="idea">想法</option><option value="vibe_coding">Vibe Coding</option><option value="memo">备忘</option></select></label>
      <label v-if="note.category === 'vibe_coding'">状态<select v-model="note.status"><option value="">未定</option><option value="done">已完成</option><option value="impossible">不可能</option><option value="uncertain">不确定</option></select></label>
    </div>
    <label>标题<input ref="titleInput" v-model="note.title" maxlength="200" placeholder="一句话留下这个念头" /></label>
    <label>详情<textarea v-model="note.content" rows="5" maxlength="10000" placeholder="背景、延伸、为什么现在想到它……" /></label>
    <label>标签 <span class="notes-label-hint">用逗号分隔，例如：历史, 产品灵感</span><input v-model="tagsText" maxlength="300" placeholder="给这条记录几个检索入口" /></label>
    <p v-if="error" class="notes-error" role="alert">{{ error }}</p>
    <p v-else-if="draftMessage" class="notes-draft-hint" role="status">{{ draftMessage }}</p>
    <div class="notes-editor__footer"><button class="notes-button" type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存记录' }}</button><div class="notes-editor__secondary"><button class="notes-button notes-button--quiet" type="button" :disabled="saving" @click="$emit('cancel')">取消</button><button class="notes-button notes-button--close" type="button" :disabled="saving" @click="$emit('cancel')">关闭</button></div></div>
  </form>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const note = defineModel('note', { required: true })
const titleInput = ref(null)
const props = defineProps({ saving: Boolean, error: { type: String, default: '' }, draftKey: { type: String, default: '' } })
defineEmits(['save', 'cancel'])
const draftMessage = ref('')
const tagsText = computed({
  get: () => (note.value.tags || []).join(', '),
  set: (value) => { note.value.tags = [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))] }
})
watch(() => note.value.category, (category) => { if (category !== 'vibe_coding') note.value.status = '' })
watch(note, (value) => {
  if (!props.draftKey) return
  try {
    localStorage.setItem(props.draftKey, JSON.stringify({ ...value, tags: value.tags || [], savedAt: new Date().toISOString() }))
    draftMessage.value = '草稿已自动保存在本机'
  } catch { /* 浏览器隐私模式下可正常编辑，只是不保存草稿。 */ }
}, { deep: true })
onMounted(() => {
  if (props.draftKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(props.draftKey) || 'null')
      if (saved?.title || saved?.content || saved?.tags?.length) {
        const { savedAt, ...draft } = saved
        Object.assign(note.value, { ...draft, tags: draft.tags || [] })
        draftMessage.value = '已恢复本机草稿，会继续自动保存'
      }
    } catch { /* 忽略已损坏的本地草稿。 */ }
  }
  nextTick(() => titleInput.value?.focus())
})
</script>
