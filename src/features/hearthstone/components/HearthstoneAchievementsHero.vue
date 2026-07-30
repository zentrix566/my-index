<template>
  <section class="hs-hero" aria-labelledby="hs-page-title">
    <div class="section-heading">
      <p class="eyebrow">
        <span class="hs-live-dot" aria-hidden="true"></span>
        Hearthstone Tracker
      </p>
      <h1 id="hs-page-title">炉石传说成就查看器</h1>
      <p>把分散的成就目标整理成清晰的行动清单。按版本与职业筛选、记录完成进度，并快速找到下一项值得冲刺的成就。</p>
    </div>

    <div class="hs-hero-side">
      <div class="hs-intro-actions">
        <template v-if="user">
          <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/settings')">个人中心</button>
          <span class="hs-user-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {{ user.username }}
          </span>
          <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('logout')">退出登录</button>
        </template>
        <button v-else type="button" class="hs-btn hs-btn-primary" @click="$emit('navigate', '/login')">
          登录或注册
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
          </svg>
        </button>
        <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/hearthstone/changelog')">查看更新</button>
        <button type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/hearthstone/deck')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13h6"/><path d="M9 17h3"/>
          </svg>
          卡组代码解析
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
