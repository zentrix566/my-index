<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2 class="auth-title">{{ mode === 'login' ? '登录' : '注册账号' }}</h2>
      <p class="auth-sub">登录后记录你自己的炉石成就进度</p>

      <form class="auth-form" @submit.prevent="submit">
        <input
          v-model.trim="username"
          class="auth-input"
          type="text"
          placeholder="用户名（3-20 位，支持中文）"
          autocomplete="username"
        />
        <input
          v-model="password"
          class="auth-input"
          type="password"
          placeholder="密码（至少 6 位）"
          autocomplete="current-password"
        />
        <input
          v-if="mode === 'register'"
          v-model="confirm"
          class="auth-input"
          type="password"
          placeholder="确认密码"
          autocomplete="new-password"
        />

        <p v-if="error" class="auth-error">{{ error }}</p>

        <button class="auth-btn" type="submit" :disabled="loading">
          {{ loading ? '处理中…' : mode === 'login' ? '登录' : '注册并登录' }}
        </button>
      </form>

      <p class="auth-switch">
        {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
        <a @click="toggle">{{ mode === 'login' ? '立即注册' : '去登录' }}</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'

const { login, register } = useAuth()
const router = useRouter()

const mode = ref('login')
const username = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  if (mode.value === 'register' && password.value !== confirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    if (mode.value === 'login') {
      await login(username.value, password.value)
    } else {
      await register(username.value, password.value)
    }
    router.push('/hearthstone')
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    loading.value = false
  }
}

function toggle() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}
</script>

<style scoped>
.auth-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.auth-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 14px;
  padding: 32px 28px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}
.auth-title {
  margin: 0;
  font-size: 22px;
  color: #1f2937;
}
.auth-sub {
  margin: 6px 0 22px;
  color: #6b7280;
  font-size: 13px;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.auth-input {
  height: 42px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.auth-input:focus {
  border-color: #6366f1;
}
.auth-error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
}
.auth-btn {
  height: 44px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.auth-btn:hover:not(:disabled) {
  background: #4f46e5;
}
.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.auth-switch {
  margin: 18px 0 0;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}
.auth-switch a {
  color: #6366f1;
  cursor: pointer;
  font-weight: 600;
}
</style>
