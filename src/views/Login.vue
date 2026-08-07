<template>
  <div class="auth-page">
    <div class="auth-card">
      <RouterLink class="auth-back" :to="backTarget">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        {{ backLabel }}
      </RouterLink>

      <div class="auth-mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      </div>
      <p class="auth-eyebrow">{{ loginContext.eyebrow }}</p>
      <h1 class="auth-title">{{ mode === 'login' ? '欢迎回来' : '创建进度档案' }}</h1>
      <p class="auth-sub">{{ mode === 'login' ? loginContext.loginText : loginContext.registerText }}</p>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-field">
          <span>用户名</span>
          <span class="auth-input-shell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              v-model.trim="username"
              class="auth-input"
              type="text"
              placeholder="3–20 位，支持中文"
              autocomplete="username"
              required
            />
          </span>
        </label>

        <label class="auth-field">
          <span>密码</span>
          <span class="auth-input-shell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              v-model="password"
              class="auth-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="至少 6 位"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              required
            />
            <button class="auth-visibility" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </span>
        </label>

        <label v-if="mode === 'register'" class="auth-field">
          <span>确认密码</span>
          <span class="auth-input-shell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              v-model="confirm"
              class="auth-input"
              :type="showConfirm ? 'text' : 'password'"
              placeholder="再次输入密码"
              autocomplete="new-password"
              required
            />
            <button class="auth-visibility" type="button" :aria-label="showConfirm ? '隐藏确认密码' : '显示确认密码'" @click="showConfirm = !showConfirm">
              {{ showConfirm ? '隐藏' : '显示' }}
            </button>
          </span>
        </label>

        <label v-if="mode === 'register'" class="auth-field">
          <span>邮箱（注册后请在「账号中心」激活账号）</span>
          <span class="auth-input-shell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.485a2 2 0 0 1-2.06 0L2 7"/>
            </svg>
            <input
              v-model.trim="email"
              class="auth-input"
              type="email"
              placeholder="可选，绑定后可用邮件找回"
              autocomplete="email"
            />
          </span>
        </label>

        <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

        <button class="auth-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="auth-spinner" aria-hidden="true"></span>
          {{ loading ? '正在处理…' : mode === 'login' ? '登录并继续' : '创建账号并登录' }}
        </button>
      </form>

      <p class="auth-switch">
        {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
        <button type="button" @click="toggle">{{ mode === 'login' ? '立即注册' : '返回登录' }}</button>
      </p>
      <p v-if="mode === 'login'" class="auth-forgot">
        <RouterLink to="/forgot-password">忘记密码？</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'

const { user, login, register } = useAuth()
const route = useRoute()
const router = useRouter()

const safeRedirect = computed(() => {
  const target = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/projects'
})
const source = computed(() => {
  if (route.query.source === 'hearthstone' || safeRedirect.value.startsWith('/hearthstone')) return 'hearthstone'
  if (route.query.source === 'willpower' || safeRedirect.value.startsWith('/willpower')) return 'willpower'
  return 'site'
})
const loginContexts = {
  hearthstone: {
    eyebrow: 'Hearthstone Tracker',
    loginText: '登录后继续记录你的炉石成就进度。',
    registerText: '注册后即可跨设备保存和同步炉石成就进度。',
    backLabel: '返回成就查看器',
    backTarget: '/hearthstone'
  },
  willpower: {
    eyebrow: 'Willpower Tracker',
    loginText: '登录后继续记录心魔与正能量数据。',
    registerText: '注册后即可跨设备保存和同步心魔记录。',
    backLabel: '返回抵御心魔',
    backTarget: '/willpower'
  },
  site: {
    eyebrow: 'Zentrix Account',
    loginText: '登录后同步各项目的个人数据与使用进度。',
    registerText: '注册一个账号，即可在所有项目中保存和同步数据。',
    backLabel: '返回项目索引',
    backTarget: '/projects'
  }
}
const loginContext = computed(() => loginContexts[source.value])
const backLabel = computed(() => loginContext.value.backLabel)
const backTarget = computed(() => loginContext.value.backTarget)

const mode = ref('login')
const username = ref('')
const password = ref('')
const confirm = ref('')
const email = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

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
      await register(username.value, password.value, email.value)
    }
    // 未激活邮箱的新用户先去账号中心完善邮箱，其他用户返回登录前的页面。
    const target = user.value && !user.value.emailVerified ? '/settings' : safeRedirect.value
    router.push(target)
  } catch (e) {
    error.value = e.message || '操作失败'
  } finally {
    loading.value = false
  }
}

function toggle() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
  confirm.value = ''
  email.value = ''
  showPassword.value = false
  showConfirm.value = false
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
.auth-back:hover {
  color: #15803d;
}
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
.auth-title {
  margin: 0;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.2;
}
.auth-sub {
  margin: 8px 0 26px;
  color: #64748b;
  font-size: 14px;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.auth-field {
  display: grid;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 650;
}
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
.auth-input::placeholder {
  color: #94a3b8;
}
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
.auth-btn:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.auth-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }
.auth-switch {
  margin: 22px 0 0;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}
.auth-switch button {
  min-height: 44px;
  padding: 0 6px;
  border: 0;
  color: #d97706;
  background: transparent;
  cursor: pointer;
  font-weight: 700;
}
.auth-forgot {
  margin: 10px 0 0;
  text-align: center;
}
.auth-forgot a {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.auth-forgot a:hover { color: #15803d; }
.auth-back:focus-visible,
.auth-visibility:focus-visible,
.auth-btn:focus-visible,
.auth-switch button:focus-visible {
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
