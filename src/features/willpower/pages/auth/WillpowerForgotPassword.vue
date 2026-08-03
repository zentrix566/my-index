<template>
  <section class="wp-auth">
    <div class="wp-auth-card">
      <span class="wp-eyebrow">抵御心魔</span>
      <h1>找回密码</h1>
      <p class="wp-sub">输入用户名或邮箱，若已绑定邮箱我们会发送重置链接。</p>

      <form v-if="!sent" @submit.prevent="submit">
        <div class="wp-field">
          <label for="wp-id">用户名或邮箱</label>
          <input id="wp-id" v-model="identifier" type="text" placeholder="用户名 / 邮箱" />
        </div>

        <p v-if="error" class="wp-error">{{ error }}</p>

        <div class="wp-actions">
          <button class="wp-btn primary" type="submit" :disabled="loading">
            {{ loading ? '提交中…' : '发送重置邮件' }}
          </button>
        </div>
      </form>

      <p v-else class="wp-ok">{{ message }}</p>

      <p class="wp-switch">
        <RouterLink to="/willpower/login">返回登录</RouterLink>
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWillpowerAuth } from '../../composables/useWillpowerAuth.js'

const router = useRouter()
const { forgotPassword } = useWillpowerAuth()

const identifier = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)
const message = ref('')

async function submit() {
  error.value = ''
  if (!identifier.value.trim()) {
    error.value = '请输入用户名或邮箱'
    return
  }
  loading.value = true
  try {
    message.value = await forgotPassword(identifier.value.trim())
    sent.value = true
  } catch (err) {
    error.value = err.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>
