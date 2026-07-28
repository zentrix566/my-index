<template>
  <div class="auth-page">
    <div class="auth-card">
      <RouterLink class="auth-back" to="/login">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回登录
      </RouterLink>

      <div class="auth-mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <p class="auth-eyebrow">重置密码</p>
      <h1 class="auth-title">{{ done ? '密码已更新' : '设置新密码' }}</h1>
      <p class="auth-sub">
        {{ done
          ? '你的密码已成功重置，并已自动登录。'
          : '请输入你的新密码，链接仅可使用一次。' }}
      </p>

      <template v-if="!done">
        <p v-if="invalid" class="auth-error" role="alert">{{ invalidMsg }}</p>

        <form v-if="token" class="auth-form" @submit.prevent="submit">
          <label class="auth-field">
            <span>新密码</span>
            <span class="auth-input-shell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                v-model="password"
                class="auth-input"
                :type="showP ? 'text' : 'password'"
                placeholder="至少 6 位"
                autocomplete="new-password"
                required
              />
              <button class="auth-visibility" type="button" :aria-label="showP ? '隐藏密码' : '显示密码'" @click="showP = !showP">
                {{ showP ? '隐藏' : '显示' }}
              </button>
            </span>
          </label>

          <label class="auth-field">
            <span>确认新密码</span>
            <span class="auth-input-shell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                v-model="confirm"
                class="auth-input"
                :type="showC ? 'text' : 'password'"
                placeholder="再次输入新密码"
                autocomplete="new-password"
                required
              />
              <button class="auth-visibility" type="button" :aria-label="showC ? '隐藏确认密码' : '显示确认密码'" @click="showC = !showC">
                {{ showC ? '隐藏' : '显示' }}
              </button>
            </span>
          </label>

          <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

          <button class="auth-btn" type="submit" :disabled="loading">
            <span v-if="loading" class="auth-spinner" aria-hidden="true"></span>
            {{ loading ? '正在处理…' : '重置密码' }}
          </button>
        </form>

        <div v-if="!token" class="auth-done">
          <button class="auth-btn auth-btn-ghost" type="button" @click="goForgot">重新申请重置</button>
        </div>
      </template>

      <div v-else class="auth-done">
        <button class="auth-btn" type="button" @click="goHome">进入站点</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'

const { resetPassword } = useAuth()
const router = useRouter()
const route = useRoute()

const token = ref(typeof route.query.token === 'string' ? route.query.token : '')
const password = ref('')
const confirm = ref('')
const error = ref('')
const invalid = ref(!token.value)
const invalidMsg = ref(token.value ? '' : '重置链接无效或已过期，请重新申请。')
const loading = ref(false)
const done = ref(false)
const showP = ref(false)
const showC = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = '密码至少 6 位'
    return
  }
  if (password.value !== confirm.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await resetPassword(token.value, password.value)
    done.value = true
  } catch (e) {
    // 链接可能此时才被判定失效（如过期/已用）
    if (/无效|过期/.test(e.message || '')) {
      invalid.value = true
      invalidMsg.value = e.message
    } else {
      error.value = e.message || '操作失败'
    }
  } finally {
    loading.value = false
  }
}

function goForgot() {
  router.push('/forgot-password')
}
function goHome() {
  router.push('/hearthstone')
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 137px);
  display: grid;
  place-items: center;
  padding: 48px 24px;
  color: #0f172a;
  background:
    radial-gradient(circle at 20% 10%, rgba(21, 128, 61, 0.10), transparent 30%),
    radial-gradient(circle at 90% 85%, rgba(217, 119, 6, 0.08), transparent 30%),
    #f1f5f9;
}
.auth-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 34px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(18px);
}
.auth-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 30px;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.auth-back:hover { color: #15803d; }
.auth-mark {
  display: grid;
  width: 54px;
  height: 54px;
  margin-bottom: 18px;
  place-items: center;
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 16px;
  color: #d97706;
  background: linear-gradient(145deg, rgba(217, 119, 6, 0.12), rgba(21, 128, 61, 0.1));
}
.auth-eyebrow {
  margin: 0 0 5px;
  color: #16a34a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.auth-title { margin: 0; color: #0f172a; font-size: 28px; line-height: 1.2; }
.auth-sub { margin: 8px 0 26px; color: #64748b; font-size: 14px; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.auth-field { display: grid; gap: 7px; color: #334155; font-size: 13px; font-weight: 650; }
.auth-input-shell {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 13px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 11px;
  color: #475569;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.auth-input-shell:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.14);
}
.auth-input {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  outline: 0;
  color: #0f172a;
  background: transparent;
  font-size: 14px;
}
.auth-input::placeholder { color: #94a3b8; }
.auth-visibility {
  min-width: 44px;
  min-height: 36px;
  border: 0;
  color: #d97706;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.auth-error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 9px;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 13px;
}
.auth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 4px;
  border: none;
  border-radius: 11px;
  background: linear-gradient(135deg, #15803d, #166534);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(21, 128, 61, 0.22);
  transition: transform 0.2s ease, filter 0.2s ease;
}
.auth-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-btn-ghost { background: linear-gradient(135deg, #475569, #334155); box-shadow: none; }
.auth-done { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
.auth-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }
.auth-back:focus-visible,
.auth-visibility:focus-visible,
.auth-btn:focus-visible {
  outline: 3px solid rgba(21, 128, 61, 0.5);
  outline-offset: 3px;
}
@media (max-width: 520px) {
  .auth-page { padding: 24px 14px; }
  .auth-card { padding: 26px 20px; border-radius: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .auth-btn { transition: none; }
  .auth-spinner { animation: none; }
}
</style>
