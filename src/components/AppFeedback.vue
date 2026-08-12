<template>
  <Teleport to="body">
    <div class="app-toast-host" aria-live="polite" aria-relevant="additions">
      <TransitionGroup name="app-toast">
        <div v-for="toast in toasts" :key="toast.id" class="app-toast-item" :class="`is-${toast.type}`" role="status">
          <span class="app-toast-dot" aria-hidden="true"></span>
          <span class="app-toast-message">{{ toast.message }}</span>
          <button v-if="toast.action" type="button" :disabled="toast.busy" @click="runAction(toast)">
            {{ toast.busy ? '处理中…' : toast.actionLabel }}
          </button>
          <button class="app-toast-close" type="button" aria-label="关闭提示" @click="dismiss(toast.id)">×</button>
        </div>
      </TransitionGroup>
    </div>

    <Transition name="app-dialog">
      <div v-if="confirmation" class="app-confirm-backdrop" @click.self="resolveConfirmation(false)">
        <section class="app-confirm" role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title">
          <h2 id="app-confirm-title">{{ confirmation.title }}</h2>
          <p>{{ confirmation.message }}</p>
          <div class="app-confirm-actions">
            <button type="button" @click="resolveConfirmation(false)">{{ confirmation.cancelLabel }}</button>
            <button type="button" :class="{ danger: confirmation.danger }" @click="resolveConfirmation(true)">
              {{ confirmation.confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useFeedback } from '../composables/useFeedback.js'

const { toasts, confirmation, dismiss, runAction, resolveConfirmation } = useFeedback()

function handleKeydown(event) {
  if (event.key === 'Escape' && confirmation.value) resolveConfirmation(false)
}

watch(confirmation, (value) => {
  document.body.classList.toggle('has-app-dialog', Boolean(value))
}, { flush: 'post' })

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.classList.remove('has-app-dialog')
})
</script>

