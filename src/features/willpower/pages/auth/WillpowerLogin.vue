<template>
  <section class="wp-auth">
    <div class="wp-auth-card">
      <span class="wp-eyebrow">抵御心魔</span>
      <h1>登录心魔账本</h1>
      <p class="wp-sub">记录你每一次守得住的瞬间。</p>

      <form @submit.prevent="submit">
        <div class="wp-field">
          <label for="wp-user">用户名</label>
          <input id="wp-user" v-model="username" type="text" autocomplete="username" placeholder="3-20 位字母/数字/中文" />
        </div>
        <div class="wp-field">
          <label for="wp-pass">密码</label>
          <input id="wp-pass" v-model="password" type="password" autocomplete="current-password" placeholder="6-128 位" />
        </div>

        <p v-if="error" class="wp-error">{{ error }}</p>

        <div class="wp-actions">
          <button class="wp-btn primary" type="submit" :disabled="loading">
            {{ loading ? '登录中…' : '登录' }}
          </button>
        </div>
      </form>

      <p class="wp-switch">
        还没有账本？<RouterLink to="/willpower/register">注册一个</RouterLink>
      </p>
      <p class="wp-switch">
        <RouterLink to="/willpower/forgot-password">忘记密码？</RouterLink>
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWillpowerAuth } from '../../composables/useWillpowerAuth.js'

const router = useRouter()
const { user, init, login } = useWillpowerAuth()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  await init()
  if (user.value) router.replace('/willpower')
})

async function submit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    router.replace('/willpower')
  } catch (err) {
    error.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
