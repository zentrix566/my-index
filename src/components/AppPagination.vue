<template>
  <nav class="app-pagination" aria-label="分页">
    <button class="app-pagination__btn" type="button" :disabled="page <= 1" @click="page = 1">首页</button>
    <button class="app-pagination__btn" type="button" :disabled="page <= 1" @click="page -= 1">上一页</button>
    <span class="app-pagination__status" aria-live="polite">第 {{ page }} / {{ pageCount }} 页<template v-if="info"> · {{ info }}</template></span>
    <label class="app-pagination__jump">
      跳至
      <input v-model.number="jumpInput" type="number" min="1" :max="pageCount" aria-label="跳转到指定页码" @keyup.enter="submitJump" />
      页
    </label>
    <button class="app-pagination__btn" type="button" @click="submitJump">跳转</button>
    <button class="app-pagination__btn" type="button" :disabled="page >= pageCount" @click="page += 1">下一页</button>
    <button class="app-pagination__btn" type="button" :disabled="page >= pageCount" @click="page = pageCount">末页</button>
  </nav>
</template>

<script setup>
import { ref, watch } from 'vue'

const page = defineModel('page', { type: Number, required: true })
const props = defineProps({
  pageCount: { type: Number, required: true },
  info: { type: String, default: '' }
})

const jumpInput = ref('')
// 翻页后清空残留的跳页输入，避免下次跳转误用旧页码
watch(page, () => { jumpInput.value = '' })

function submitJump() {
  const raw = Number(jumpInput.value)
  if (!Number.isFinite(raw) || raw < 1) {
    jumpInput.value = ''
    return
  }
  page.value = Math.min(Math.max(1, Math.floor(raw)), Math.max(1, props.pageCount))
  jumpInput.value = ''
}
</script>

<style scoped>
.app-pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; }
.app-pagination__btn { min-height: 34px; padding: 0 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; transition: filter .15s ease; }
.app-pagination__btn:hover:not(:disabled) { filter: brightness(.94); }
.app-pagination__btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.app-pagination__btn:disabled { opacity: .5; cursor: not-allowed; }
.app-pagination__status { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; }
.app-pagination__jump { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 600; white-space: nowrap; }
.app-pagination__jump input { width: 64px; min-height: 34px; padding: 0 8px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font: inherit; font-size: 13px; }
.app-pagination__jump input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
@media (prefers-reduced-motion: reduce) { .app-pagination__btn { transition: none; } }
</style>
