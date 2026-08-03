<template>
  <div class="wp-nav-wrap">
    <!-- 账号状态栏：品牌 + 个人中心 / 更新日志 / 退出登录 同一行 -->
    <div class="wp-account-bar">
      <RouterLink to="/willpower" class="wp-brand">抵御心魔</RouterLink>
      <div class="wp-account-actions">
        <RouterLink to="/willpower/profile" class="wp-account-link">个人中心</RouterLink>
        <RouterLink to="/willpower/changelog" class="wp-account-link">更新日志</RouterLink>
        <template v-if="username">
          <span class="wp-account-user">{{ username }}</span>
          <button class="wp-account-link wp-logout" type="button" @click="logout">退出登录</button>
        </template>
        <RouterLink v-else to="/willpower/login" class="wp-account-link">登录</RouterLink>
      </div>
    </div>

    <!-- 主导航：今日心魔 / 今日正能量 / 日历 / AI 分析 / 成就 -->
    <nav class="wp-nav">
      <RouterLink to="/willpower">今日心魔</RouterLink>
      <RouterLink to="/willpower/positive">今日正能量</RouterLink>
      <RouterLink to="/willpower/calendar">日历</RouterLink>
      <RouterLink to="/willpower/ai">AI 分析</RouterLink>
      <RouterLink to="/willpower/achievements">成就</RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWillpowerAuth } from '../composables/useWillpowerAuth.js'

const router = useRouter()
const { user, logout: doLogout } = useWillpowerAuth()
const username = computed(() => user.value?.displayName || user.value?.username || '')

async function logout() {
  await doLogout()
  router.replace('/willpower/login')
}
</script>
