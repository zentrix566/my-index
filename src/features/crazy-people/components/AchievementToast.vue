<script setup>
// 成就解锁弹窗：监听世界的 pendingToast，弹出后自动消失
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  toast: { type: Object, default: null }
})

const emit = defineEmits(['consumed'])

const current = ref(null)
let timer = null

watch(
  () => props.toast,
  (t) => {
    if (!t) return
    current.value = t
    emit('consumed')
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      current.value = null
    }, 3200)
  }
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <transition name="toast">
    <div v-if="current" class="ach-toast">
      <span class="emoji">{{ current.emoji }}</span>
      <div class="body">
        <div class="title">成就解锁 · {{ current.name }}</div>
        <div class="desc">{{ current.desc }}</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.ach-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #f59f00, #e8590c);
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 200;
  max-width: 320px;
}

.emoji {
  font-size: 34px;
}

.title {
  font-size: 15px;
  font-weight: 800;
}

.desc {
  font-size: 12.5px;
  opacity: 0.9;
  margin-top: 2px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}
</style>
