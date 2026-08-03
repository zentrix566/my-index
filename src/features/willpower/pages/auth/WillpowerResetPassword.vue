<template>
  <section class="wp-auth">
    <div class="wp-auth-card">
      <span class="wp-eyebrow">抵御心魔</span>
      <h1>重置密码</h1>
      <p class="wp-sub">为该账本设置一个新密码。</p>

      <form v-if="!done" @submit.prevent="submit">
        <div class="wp-field">
          <label for="wp-pass">新密码</label>
          <input id="wp-pass" v-model="password" type="password" autocomplete="new-password" placeholder="6-128 位" />
        </div>
        <div class="wp-field">
          <label for="wp-pass2">确认新密码</label>
          <input id="wp-pass2" v-model="password2" type="password" autocomplete="new-password" placeholder="再输入一次" />
        </div>

        <p v-if="error" class="wp-error">{{ error }}</p>

        <div class="wp-actions">
          <button class="wp-btn primary" type="submit" :disabled="loading || !token">
            {{ loading ? '重置中…' : '重置并登录' }}
          </button>
        </div>
      </form>

      <p v-else class="wp-ok">密码已重置，正在进入账本…</p>

      <p class="wp-switch">
        <RouterLink to="/willpower/login">返回登录</RouterLink>
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWillpowerAuth } from '../../composables/useWillpowerAuth.js'

const route = useRoute()
const router = useRouter()
const { resetPassword } = useWillpowerAuth()

const token = ref('')
const password = ref('')
const password2 = ref('')
const error = ref('')
const loading = ref(false)
const done = ref(false)

onMounted(() => {
  token.value = route.query.token || ''
  if (!token.value) error.value = '重置链接无效：缺少令牌。'
})

async function submit() {
  error.value = ''
  if (password.value !== password2.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await resetPassword(token.value, password.value)
    done.value = true
    setTimeout(() => router.replace('/willpower'), 700)
  } catch (err) {
    error.value = err.message || '重置失败'
  } finally {
    loading.value = false
  }
}
</script>
