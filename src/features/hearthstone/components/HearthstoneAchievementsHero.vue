<template>
  <section class="hs-hero" aria-labelledby="hs-page-title">
    <div class="section-heading">
      <p class="eyebrow">
        <span class="hs-live-dot" aria-hidden="true"></span>
        Hearthstone Tracker
      </p>
      <h1 id="hs-page-title">炉石传说成就档案</h1>
    </div>

    <div class="hs-hero-side">
      <div class="hs-hero-metrics" aria-label="成就档案概览">
        <div><strong>{{ achievementCount }}</strong><span>收录成就</span></div>
        <div><strong>{{ expansionCount }}</strong><span>游戏版本</span></div>
      </div>
      <div class="hs-intro-actions">
        <div class="hs-action-group hs-account-actions" aria-label="账号操作">
          <span v-if="user" class="hs-user-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {{ user.username }}
          </span>
          <button v-if="user" type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/changelog?category=hearthstone')">查看更新</button>
          <button v-if="user" type="button" class="hs-btn hs-btn-ghost" @click="$emit('navigate', '/settings?section=hearthstone')">炉石档案</button>
          <button v-if="user" type="button" class="hs-btn hs-btn-ghost" @click="$emit('logout')">退出登录</button>
          <button v-else type="button" class="hs-btn hs-btn-primary" @click="$emit('navigate', { path: '/login', query: { redirect: '/hearthstone', source: 'hearthstone' } })">登录或注册</button>
        </div>

      </div>
      <p class="hs-intro-text">
        {{ user ? '当前进度会自动保存到你的账号。' : '未登录可浏览全部内容；登录后即可记录并同步个人进度。' }}
      </p>
    </div>

    <HearthstoneToolNav @navigate="(to) => $emit('navigate', to)" />

  </section>
</template>

<script setup>
import HearthstoneToolNav from './HearthstoneToolNav.vue'

defineProps({
  user: { type: Object, default: null },
  hsTheme: { type: String, required: true },
  achievementCount: { type: Number, required: true },
  expansionCount: { type: Number, required: true }
})

defineEmits(['navigate', 'logout'])
</script>

<style scoped>
.hs-intro-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.hs-account-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--hs-border);
}
</style>
