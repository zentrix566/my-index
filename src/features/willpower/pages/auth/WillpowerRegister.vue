<template>
  <section class="wp-auth">
    <div class="wp-auth-card">
      <span class="wp-eyebrow">抵御心魔</span>
      <h1>创建心魔账本</h1>
      <p class="wp-sub">独立的账号体系，与本站其他项目互不相通。</p>

      <form @submit.prevent="submit">
        <div class="wp-field">
          <label for="wp-user">用户名</label>
          <input id="wp-user" v-model="username" type="text" autocomplete="username" placeholder="3-20 位字母/数字/中文" />
        </div>
        <div class="wp-field">
          <label for="wp-email">邮箱（可选，用于找回密码）</label>
          <input id="wp-email" v-model="email" type="email" autocomplete="email" placeholder="you@example.com" />
        </div>
        <div class="wp-field">
          <label for="wp-pass">密码</label>
          <input id="wp-pass" v-model="password" type="password" autocomplete="new-password" placeholder="6-128 位" />
        </div>
        <div class="wp-field">
          <label for="wp-pass2">确认密码</label>
          <input id="wp-pass2" v-model="password2" type="password" autocomplete="new-password" placeholder="再输入一次" />
        </div>

        <p v-if="error" class="wp-error">{{ error }}</p>

        <div class="wp-actions">
          <button class="wp-btn primary" type="submit" :disabled="loading">
            {{ loading ? '创建中…' : '创建并进入' }}
          </button>
        </div>
      </form>

      <p class="wp-switch">
        已有账本？<RouterLink to="/willpower/login">去登录</RouterLink>
      </p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWillpowerAuth } from '../../composables/useWillpowerAuth.js'

const router = useRouter()
const { user, init, register } = useWillpowerAuth()

const username = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  await init()
  if (user.value) router.replace('/willpower')
})

async function submit() {
  error.value = ''
  if (password.value !== password2.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await register(username.value.trim(), password.value, email.value.trim() || undefined)
    router.replace('/willpower')
  } catch (err) {
    error.value = err.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>
