<template>
  <section class="hs-hero" aria-labelledby="hs-page-title">
    <div class="section-heading">
      <p class="eyebrow">
        <span class="hs-live-dot" aria-hidden="true"></span>
        Hearthstone Tracker
      </p>
      <h1 id="hs-page-title">炉石传说成就查看器</h1>
      <p class="hs-contact-line">
        炉石成就QQ群 849150123 · 邮箱 <a href="mailto:1987247500@qq.com">1987247500@qq.com</a>
      </p>
    </div>

    <div class="hs-hero-side">
      <div class="hs-intro-actions">
        <template v-if="user">
          <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/settings?section=hearthstone')">炉石档案</button>
          <span class="hs-user-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {{ user.username }}
          </span>
          <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('logout')">退出登录</button>
        </template>
        <button
          v-else
          type="button"
          class="hs-btn hs-btn-primary"
          @click="$emit('navigate', { path: '/login', query: { redirect: '/hearthstone', source: 'hearthstone' } })"
        >
          登录或注册
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
          </svg>
        </button>
        <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/changelog?category=hearthstone')">查看更新</button>
        <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/hearthstone/deck')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13h6"/><path d="M9 17h3"/>
          </svg>
          卡组代码解析
        </button>
        <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/hearthstone/xp')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/>
          </svg>
          战令计算器
        </button>
        <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/hearthstone/frog')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>
          </svg>
          卡牌蛙生
        </button>
        <button
          type="button"
          class="hs-btn hs-btn-ghost hs-theme-toggle"
          :aria-label="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
          :title="hsTheme === 'dark' ? '切换到明亮主题' : '切换到暗色主题'"
          @click="$emit('toggle-theme')"
        >
          <svg v-if="hsTheme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
          </svg>
          <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
          {{ hsTheme === 'dark' ? '明亮' : '暗色' }}
        </button>
        <button
          type="button"
          class="hs-btn hs-btn-ghost hs-contact-btn"
          title="发送邮件给作者"
          @click="$emit('contact')"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          联系作者
        </button>
      </div>
      <p class="hs-intro-text">
        {{ user ? '当前进度会自动保存到你的账号。' : '未登录可浏览全部内容；登录后即可记录并同步个人进度。' }}
      </p>
    </div>

    <div class="hs-hero-metrics" aria-label="数据概览">
      <div><strong>{{ achievementCount }}</strong><span>收录成就</span></div>
      <div><strong>{{ expansionCount }}</strong><span>游戏版本</span></div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  user: { type: Object, default: null },
  hsTheme: { type: String, required: true },
  achievementCount: { type: Number, required: true },
  expansionCount: { type: Number, required: true }
})

defineEmits(['navigate', 'logout', 'toggle-theme', 'contact'])
</script>

<style scoped>
.hs-contact-line {
  max-width: 760px;
  margin-top: 10px;
  color: var(--hs-text-soft);
  font-size: 14px;
  line-height: 1.7;
}
.hs-contact-line a {
  color: var(--hs-link);
  font-weight: 600;
  text-decoration: none;
}
.hs-contact-line a:hover {
  text-decoration: underline;
}
</style>
