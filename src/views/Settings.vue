<template>
  <div class="pc-page">
    <div class="pc-shell">
      <RouterLink class="pc-back" to="/hearthstone">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回成就查看器
      </RouterLink>

      <header class="pc-head">
        <div>
          <p class="pc-eyebrow">个人中心</p>
          <h1 class="pc-title">{{ user?.username || '账号' }}</h1>
        </div>
        <span class="pc-status" :class="user?.emailVerified ? 'ok' : 'warn'">
          <span class="pc-dot" aria-hidden="true"></span>
          {{ user?.emailVerified ? '已激活 · 正式用户' : '未激活' }}
        </span>
      </header>

      <!-- 账号激活 -->
      <section class="pc-card">
        <h2 class="pc-card-title">账号激活</h2>

        <div v-if="user?.emailVerified" class="pc-verified">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <div>
            <p class="pc-verified-title">邮箱已激活</p>
            <p class="pc-verified-sub">{{ user.email || '你已是正式用户，可正常使用全部功能。' }}</p>
          </div>
        </div>

        <template v-else>
          <p class="pc-hint">
            <template v-if="user?.email">激活邮件已发送至 <strong>{{ user.email }}</strong>，请查收并点击链接完成激活。</template>
            <template v-else>新用户请先设置邮箱并激活，激活后即为正式用户。</template>
          </p>

          <form class="pc-form" @submit.prevent="saveEmail">
            <span class="pc-input-shell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.485a2 2 0 0 1-2.06 0L2 7"/>
              </svg>
              <input
                v-model.trim="email"
                class="pc-input"
                type="email"
                placeholder="输入邮箱，用于激活账号"
                autocomplete="email"
              />
            </span>
            <div class="pc-actions">
              <button class="pc-btn" type="submit" :disabled="emailLoading">
                <span v-if="emailLoading" class="pc-spinner" aria-hidden="true"></span>
                {{ emailLoading ? '发送中…' : (user?.email ? '重新发送激活邮件' : '发送激活链接') }}
              </button>
              <button v-if="user?.email" class="pc-link-btn" type="button" :disabled="emailLoading" @click="clearEmail">解绑</button>
            </div>
          </form>

          <div class="pc-email-state" v-if="emailMsg">
            <span class="pc-state-dot" :class="emailOk ? 'ok' : 'err'" aria-hidden="true"></span>
            {{ emailMsg }}
          </div>
        </template>
      </section>

      <!-- 登录密码 -->
      <section class="pc-card">
        <h2 class="pc-card-title">{{ user?.hasPassword ? '修改密码' : '设置密码' }}</h2>

        <form class="pc-form pc-form-col" @submit.prevent="savePassword">
          <label class="pc-field" v-if="user?.hasPassword">
            <span>当前密码</span>
            <span class="pc-input-shell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                v-model="currentPassword"
                class="pc-input"
                :type="showC ? 'text' : 'password'"
                placeholder="请输入当前密码"
                autocomplete="current-password"
                :required="user?.hasPassword"
              />
              <button class="pc-visibility" type="button" :aria-label="showC ? '隐藏' : '显示'" @click="showC = !showC">{{ showC ? '隐藏' : '显示' }}</button>
            </span>
          </label>

          <label class="pc-field">
            <span>{{ user?.hasPassword ? '新密码' : '设置密码' }}</span>
            <span class="pc-input-shell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                v-model="newPassword"
                class="pc-input"
                :type="showN ? 'text' : 'password'"
                placeholder="至少 6 位"
                autocomplete="new-password"
                required
              />
              <button class="pc-visibility" type="button" :aria-label="showN ? '隐藏' : '显示'" @click="showN = !showN">{{ showN ? '隐藏' : '显示' }}</button>
            </span>
          </label>

          <label class="pc-field">
            <span>确认密码</span>
            <span class="pc-input-shell">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                v-model="confirmPassword"
                class="pc-input"
                :type="showN2 ? 'text' : 'password'"
                placeholder="再次输入密码"
                autocomplete="new-password"
                required
              />
              <button class="pc-visibility" type="button" :aria-label="showN2 ? '隐藏' : '显示'" @click="showN2 = !showN2">{{ showN2 ? '隐藏' : '显示' }}</button>
            </span>
          </label>

          <button class="pc-btn" type="submit" :disabled="pwLoading">
            <span v-if="pwLoading" class="pc-spinner" aria-hidden="true"></span>
            {{ pwLoading ? '更新中…' : (user?.hasPassword ? '更新密码' : '设置密码') }}
          </button>
        </form>

        <div class="pc-email-state" v-if="pwMsg">
          <span class="pc-state-dot" :class="pwOk ? 'ok' : 'err'" aria-hidden="true"></span>
          {{ pwMsg }}
        </div>
      </section>

      <!-- 成就仪表盘 -->
      <section class="pc-card pc-card-charts">
        <div class="pc-card-head">
          <div>
            <h2 class="pc-card-title">成就仪表盘</h2>
            <p class="pc-hint pc-hint-mb">以图表汇总你的炉石成就进度，按版本、职业、类型与难度多维度展示。</p>
          </div>
          <button
            type="button"
            class="pc-toggle"
            :class="{ on: hardcore }"
            role="switch"
            :aria-checked="hardcore"
            :title="'硬核模式：统计全部 ' + totalExpansions + ' 个版本（含更多版本），而非仅核心 ' + coreExpansions + ' 个版本。'"
            @click="hardcore = !hardcore"
          >
            <span class="pc-toggle-track"><span class="pc-toggle-thumb"></span></span>
            <span class="pc-toggle-label">硬核模式{{ hardcore ? '：开' : '：关' }}</span>
          </button>
        </div>
        <ProfileCharts :hardcore="hardcore" />
      </section>

      <div class="pc-footer">
        <button class="pc-link-btn" type="button" @click="doLogout">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'
import { expansions, originalExpansions } from '../features/hearthstone/data/expansions.js'
import ProfileCharts from './ProfileCharts.vue'

const { user, init, setEmail, changePassword, setPassword, logout } = useAuth()
const router = useRouter()

// 硬核模式：开启后仪表盘统计全部版本（含更多版本），否则仅核心版本
const hardcore = ref(false)
const totalExpansions = expansions.length
const coreExpansions = originalExpansions.length

const email = ref(user.value?.email || '')
const emailLoading = ref(false)
const emailMsg = ref('')
const emailOk = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwLoading = ref(false)
const pwMsg = ref('')
const pwOk = ref(false)

const showC = ref(false)
const showN = ref(false)
const showN2 = ref(false)

onMounted(async () => {
  await init()
  if (!user.value) {
    router.replace('/login')
    return
  }
  email.value = user.value.email || ''
})

async function saveEmail() {
  emailMsg.value = ''
  emailLoading.value = true
  try {
    const data = await setEmail(email.value)
    emailOk.value = true
    if (data.needsActivation) {
      emailMsg.value = '激活链接已发送，请查收邮箱（30 分钟内有效）。'
    } else if (email.value) {
      emailMsg.value = '邮箱已保存'
    } else {
      emailMsg.value = '已解绑邮箱'
    }
  } catch (e) {
    emailOk.value = false
    emailMsg.value = e.message || '操作失败'
  } finally {
    emailLoading.value = false
  }
}

async function clearEmail() {
  email.value = ''
  await saveEmail()
}

async function savePassword() {
  pwMsg.value = ''
  if (newPassword.value.length < 6) {
    pwOk.value = false
    pwMsg.value = '新密码至少 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwOk.value = false
    pwMsg.value = '两次输入的密码不一致'
    return
  }
  pwLoading.value = true
  try {
    if (user.value?.hasPassword) {
      await changePassword(currentPassword.value, newPassword.value)
    } else {
      await setPassword(newPassword.value)
    }
    pwOk.value = true
    pwMsg.value = user.value?.hasPassword ? '密码已更新' : '密码已设置'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    pwOk.value = false
    pwMsg.value = e.message || '操作失败'
  } finally {
    pwLoading.value = false
  }
}

async function doLogout() {
  await logout()
  router.push('/login')
}
</script>

<style scoped>
.pc-page {
  min-height: calc(100vh - 137px);
  padding: 48px 24px;
  color: #e2e8f0;
  background:
    radial-gradient(900px 520px at 12% -8%, rgba(34, 197, 94, 0.16), transparent 60%),
    radial-gradient(760px 520px at 96% 4%, rgba(217, 119, 6, 0.12), transparent 60%),
    radial-gradient(680px 480px at 60% 110%, rgba(56, 189, 248, 0.10), transparent 60%),
    #0b1120;
}
.pc-shell {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
}
.pc-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 22px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.pc-back:hover { color: #22c55e; }

.pc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}
.pc-eyebrow {
  margin: 0 0 4px;
  color: #22c55e;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.pc-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  color: #f8fafc;
}
.pc-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
}
.pc-status.ok {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.35);
}
.pc-status.warn {
  color: #fbbf24;
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.35);
}
.pc-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px currentColor;
  opacity: 0.55;
}

.pc-card {
  padding: 22px;
  margin-bottom: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}
.pc-card-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
}
.pc-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 4px;
}
.pc-card-head .pc-card-title { margin-bottom: 4px; }

/* 硬核模式 ON/OFF 开关 */
.pc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
  padding: 7px 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.4);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.pc-toggle:hover { border-color: rgba(34, 197, 94, 0.5); color: #cbd5e1; }
.pc-toggle.on {
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(34, 197, 94, 0.12);
}
.pc-toggle-track {
  position: relative;
  width: 34px;
  height: 18px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.3);
  transition: background 0.2s ease;
  flex: none;
}
.pc-toggle.on .pc-toggle-track { background: #22c55e; }
.pc-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}
.pc-toggle.on .pc-toggle-thumb { transform: translateX(16px); }
.pc-toggle-label { line-height: 1; }
.pc-hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
}
.pc-hint strong { color: #e2e8f0; font-weight: 600; }
.pc-hint-mb { margin-bottom: 18px; }

.pc-verified {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.10);
  border: 1px solid rgba(34, 197, 94, 0.28);
}
.pc-verified-title { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: #bbf7d0; }
.pc-verified-sub { margin: 0; font-size: 13px; color: #cbd5e1; }

.pc-form { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.pc-form-col { flex-direction: column; align-items: stretch; }
.pc-input-shell {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 13px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 11px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.5);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  flex: 1;
  min-width: 240px;
}
.pc-input-shell:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}
.pc-input {
  width: 100%;
  height: 46px;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  outline: 0;
  color: #f1f5f9;
  background: transparent;
  font-size: 14px;
}
.pc-input::placeholder { color: #64748b; }
.pc-field { display: grid; gap: 7px; font-size: 13px; font-weight: 650; color: #cbd5e1; }
.pc-visibility {
  min-width: 44px; min-height: 36px;
  border: 0; color: #d97706; background: transparent;
  font-size: 12px; font-weight: 700; cursor: pointer;
}
.pc-actions { display: flex; align-items: center; gap: 10px; }
.pc-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 48px; padding: 0 22px;
  border: none; border-radius: 11px;
  background: linear-gradient(135deg, #15803d, #16a34a);
  color: #fff; font-size: 14px; font-weight: 750; cursor: pointer;
  box-shadow: 0 10px 24px rgba(21, 128, 61, 0.3);
  transition: transform 0.2s ease, filter 0.2s ease;
}
.pc-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.pc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.pc-link-btn {
  min-height: 36px; border: 0; color: #d97706; background: transparent;
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.pc-email-state {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; font-size: 13px; font-weight: 600;
}
.pc-state-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.pc-state-dot.ok { background: #22c55e; }
.pc-state-dot.err { background: #ef4444; }

.pc-footer {
  margin-top: 4px;
  padding-top: 16px;
  text-align: right;
}
.pc-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: pc-spin 0.7s linear infinite;
}
@keyframes pc-spin { to { transform: rotate(360deg); } }

.pc-back:focus-visible,
.pc-btn:focus-visible,
.pc-link-btn:focus-visible,
.pc-visibility:focus-visible {
  outline: 3px solid rgba(34, 197, 94, 0.5);
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .pc-page { padding: 24px 14px; }
  .pc-card { padding: 18px 16px; }
  .pc-title { font-size: 24px; }
  .pc-head { flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-btn { transition: none; }
  .pc-spinner { animation: none; }
}
</style>
