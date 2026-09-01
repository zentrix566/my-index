<template>
  <form class="notes-editor" @submit.prevent="$emit('save')">
    <div class="notes-editor__head"><h2>{{ note.id ? '编辑记录' : '记下一条' }}</h2></div>
    <div class="notes-form-grid">
      <label>月份<input v-model="note.monthKey" type="month" /></label>
      <label>分类<select v-model="note.category"><option value="idea">想法</option><option value="vibe_coding">Vibe Coding</option><option value="memo">备忘</option><option value="dream">梦</option></select></label>
      <label v-if="note.category === 'vibe_coding'">状态<select v-model="note.status"><option value="">未定</option><option value="done">已完成</option><option value="impossible">不可能</option><option value="uncertain">不确定</option></select></label>
    </div>
    <label>标题<input ref="titleInput" v-model="note.title" maxlength="200" placeholder="一句话留下这个念头" /></label>
    <label>详情<textarea v-model="note.content" rows="5" maxlength="10000" placeholder="背景、延伸、为什么现在想到它……" /></label>
    <label>标签 <span class="notes-label-hint">用逗号分隔，例如：历史, 产品灵感</span><input v-model="tagsText" maxlength="300" placeholder="给这条记录几个检索入口" /></label>
    <section class="notes-image-field" aria-labelledby="notes-image-title">
      <div class="notes-image-field__heading"><div><h3 id="notes-image-title">图片</h3><p>最多 12 张，单张不超过 8 MB，支持 JPG、PNG、GIF、WebP。</p></div><label class="notes-image-field__add"><input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple :disabled="saving || imageCount >= 12" @change="addImages" /><span>添加图片</span></label></div>
      <div v-if="imageCount" class="notes-image-grid"><figure v-for="image in images" :key="image.id"><img :src="image.url" :alt="image.fileName" loading="lazy" /><figcaption>{{ image.fileName }}</figcaption><button type="button" :disabled="saving" :aria-label="`移除图片：${image.fileName}`" @click="removeSavedImage(image.id)">移除</button></figure><figure v-for="file in pendingImages" :key="`${file.name}-${file.lastModified}`" class="notes-image-grid__pending"><img :src="previewUrl(file)" :alt="file.name" /><figcaption>{{ file.name }}</figcaption><button type="button" :disabled="saving" :aria-label="`取消上传：${file.name}`" @click="removePendingImage(file)">取消</button></figure></div>
      <p v-if="imageMessage" class="notes-image-field__message" role="status">{{ imageMessage }}</p>
    </section>
    <p v-if="error" class="notes-error" role="alert">{{ error }}</p>
    <p v-else-if="draftMessage" class="notes-draft-hint" role="status">{{ draftMessage }}</p>
    <div class="notes-editor__footer"><div class="notes-editor__secondary"><button class="notes-button notes-button--quiet" type="button" :disabled="saving" @click="$emit('cancel')">取消</button><button class="notes-button notes-button--close" type="button" :disabled="saving" @click="$emit('cancel')">关闭</button></div><button class="notes-button notes-editor__save" type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存记录' }}</button></div>
  </form>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const note = defineModel('note', { required: true })
const titleInput = ref(null)
const props = defineProps({ saving: Boolean, error: { type: String, default: '' }, draftKey: { type: String, default: '' } })
defineEmits(['save', 'cancel'])
const draftMessage = ref('')
const imageMessage = ref('')
const previewUrls = new Map()
const tagsText = computed({
  get: () => (note.value.tags || []).join(', '),
  set: (value) => { note.value.tags = [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))] }
})
watch(() => note.value.category, (category) => { if (category !== 'vibe_coding') note.value.status = '' })
const images = computed(() => note.value.images || [])
const pendingImages = computed(() => note.value.pendingImages || [])
const imageCount = computed(() => images.value.length + pendingImages.value.length)
function previewUrl(file) {
  if (!previewUrls.has(file)) previewUrls.set(file, URL.createObjectURL(file))
  return previewUrls.get(file)
}
function addImages(event) {
  const selected = Array.from(event.target.files || [])
  event.target.value = ''
  const remaining = 12 - imageCount.value
  const valid = selected.filter((file) => file.size <= 8 * 1024 * 1024)
  imageMessage.value = valid.length !== selected.length ? '已跳过超过 8 MB 的图片。' : ''
  if (valid.length > remaining) imageMessage.value = `每条记录最多 12 张图片，已保留前 ${remaining} 张。`
  note.value.pendingImages = [...pendingImages.value, ...valid.slice(0, remaining)]
}
function removeSavedImage(imageId) {
  note.value.removedImageIds = [...new Set([...(note.value.removedImageIds || []), imageId])]
  note.value.images = images.value.filter((image) => image.id !== imageId)
}
function removePendingImage(file) {
  URL.revokeObjectURL(previewUrls.get(file))
  previewUrls.delete(file)
  note.value.pendingImages = pendingImages.value.filter((item) => item !== file)
}
watch(note, (value) => {
  if (!props.draftKey) return
  try {
    const { images, pendingImages, removedImageIds, ...draft } = value
    localStorage.setItem(props.draftKey, JSON.stringify({ ...draft, tags: value.tags || [], savedAt: new Date().toISOString() }))
    draftMessage.value = '草稿已自动保存在本机'
  } catch { /* 浏览器隐私模式下可正常编辑，只是不保存草稿。 */ }
}, { deep: true })
onMounted(() => {
  if (props.draftKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(props.draftKey) || 'null')
      if (saved?.title || saved?.content || saved?.tags?.length) {
        const { savedAt, ...draft } = saved
        Object.assign(note.value, { ...draft, tags: draft.tags || [], images: [], pendingImages: [], removedImageIds: [] })
        draftMessage.value = '已恢复本机草稿，会继续自动保存'
      }
    } catch { /* 忽略已损坏的本地草稿。 */ }
  }
  nextTick(() => titleInput.value?.focus())
})
onBeforeUnmount(() => previewUrls.forEach((url) => URL.revokeObjectURL(url)))
</script>
