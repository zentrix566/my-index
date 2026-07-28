<template>
  <div class="ve-page">
    <div class="ve-card">
      <RouterLink class="ve-back" to="/hearthstone">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回成就查看器
      </RouterLink>

      <p class="ve-eyebrow">邮箱激活</p>

      <template v-if="status === 'done'">
        <div class="ve-icon ok" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>
        <h1 class="ve-title">激活成功</h1>
        <p class="ve-sub">你的邮箱已激活，现在已是<strong>正式用户</strong>，全部功能可用。</p>
        <div class="ve-actions">
          <RouterLink class="ve-btn" to="/settings">进入个人中心</RouterLink>
          <RouterLink class="ve-btn ghost" to="/hearthstone">去炉石成就</RouterLink>
        </div>
      </template>

      <template v-else-if="status === 'error'">
        <div class="ve-icon err" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </div>
        <h1 class="ve-title">激活失败</h1>
        <p class="ve-sub">{{ errorMsg }}</p>
        <div class="ve-actions">
          <RouterLink class="ve-btn" to="/settings">去个人中心</RouterLink>
        </div>
      </template>

      <template v-else>
        <div class="ve-spinner" aria-hidden="true"></div>
        <h1 class="ve-title">正在激活…</h1>
        <p class="ve-sub">请稍候，正在验证你的激活链接。</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../auth/useAuth.js'

const { verifyEmail } = useAuth()
const route = useRoute()

const status = ref('loading') // loading | done | error
const errorMsg = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token || typeof token !== 'string') {
    status.value = 'error'
    errorMsg.value = '链接缺少激活令牌，请从邮件中点击完整链接。'
    return
  }
  try {
    await verifyEmail(token)
    status.value = 'done'
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message || '激活失败，链接可能已过期。'
  }
})
</script>

<style scoped>
.ve-page {
  min-height: calc(100vh - 137px);
  display: grid;
  place-items: center;
  padding: 48px 24px;
  color: #e2e8f0;
  background:
    radial-gradient(760px 520px at 14% -6%, rgba(34, 197, 94, 0.16), transparent 60%),
    radial-gradient(680px 480px at 94% 8%, rgba(217, 119, 6, 0.1), transparent 60%),
    #0b1120;
}
.ve-card {
  width: 100%;
  max-width: 460px;
  padding: 36px 30px;
  text-align: center;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(12px);
}
.ve-back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 24px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.ve-back:hover { color: #22c55e; }
.ve-eyebrow {
  margin: 0 0 6px;
  color: #22c55e;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ve-title { margin: 0 0 10px; font-size: 26px; color: #f8fafc; }
.ve-sub { margin: 0 0 24px; font-size: 14px; line-height: 1.65; color: #94a3b8; }
.ve-sub strong { color: #4ade80; font-weight: 700; }
.ve-icon {
  display: grid;
  width: 64px; height: 64px;
  margin: 0 auto 18px;
  place-items: center;
  border-radius: 50%;
}
.ve-icon.ok { color: #4ade80; background: rgba(34, 197, 94, 0.12); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.18); }
.ve-icon.err { color: #f87171; background: rgba(239, 68, 68, 0.12); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.18); }
.ve-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.ve-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 22px;
  border-radius: 11px;
  background: linear-gradient(135deg, #15803d, #16a34a);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
  text-decoration: none;
  box-shadow: 0 10px 24px rgba(21, 128, 61, 0.3);
  transition: transform 0.2s ease, filter 0.2s ease;
}
.ve-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
.ve-btn.ghost {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  box-shadow: none;
}
.ve-btn.ghost:hover { border-color: #22c55e; color: #22c55e; }
.ve-spinner {
  width: 46px; height: 46px;
  margin: 0 auto 18px;
  border: 3px solid rgba(34, 197, 94, 0.22);
  border-top-color: #22c55e;
  border-radius: 50%;
  animation: ve-spin 0.8s linear infinite;
}
@keyframes ve-spin { to { transform: rotate(360deg); } }
@media (max-width: 520px) {
  .ve-page { padding: 24px 14px; }
  .ve-card { padding: 28px 20px; border-radius: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .ve-spinner { animation: none; }
  .ve-btn { transition: none; }
}
</style>
