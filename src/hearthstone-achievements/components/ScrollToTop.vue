<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const visible = ref(false)
let listener = null

onMounted(() => {
  listener = () => {
    visible.value = window.scrollY > 300
  }
  window.addEventListener('scroll', listener)
})

onUnmounted(() => {
  if (listener) window.removeEventListener('scroll', listener)
})

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <button
    v-if="visible"
    class="hs-scroll-top"
    type="button"
    title="回到顶部"
    @click="scrollToTop"
  >
    ▲
    <span>顶部</span>
  </button>
</template>
