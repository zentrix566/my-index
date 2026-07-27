// requestAnimationFrame 主循环封装，支持暂停/继续

import { ref, onMounted, onUnmounted } from 'vue'

// 传入每帧回调 (dt 秒)，返回控制方法与运行状态
export function useGameLoop(onTick) {
  const running = ref(true)
  let rafId = null
  let lastTime = 0

  function frame(now) {
    const dt = lastTime ? (now - lastTime) / 1000 : 0
    lastTime = now
    if (running.value) onTick(dt)
    rafId = requestAnimationFrame(frame)
  }

  function pause() {
    running.value = false
  }

  function resume() {
    // 重置时间基准，避免暂停期间累积出巨大的 dt
    lastTime = 0
    running.value = true
  }

  function toggle() {
    running.value ? pause() : resume()
  }

  onMounted(() => {
    rafId = requestAnimationFrame(frame)
  })

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })

  return { running, pause, resume, toggle }
}
