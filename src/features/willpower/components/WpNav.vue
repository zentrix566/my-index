<template>
  <div class="wp-nav-wrap">
    <!-- 账号状态栏：品牌 + 个人中心 / 更新日志 / 同步状态 / 退出登录 同一行 -->
    <div class="wp-account-bar">
      <RouterLink to="/willpower" class="wp-brand">抵御心魔</RouterLink>
      <div class="wp-account-actions">
        <RouterLink to="/willpower/profile" class="wp-account-link">个人中心</RouterLink>
        <RouterLink to="/willpower/changelog" class="wp-account-link">更新日志</RouterLink>
        <!-- 同步状态指示器 -->
        <span
          class="wp-sync-dot"
          :class="syncStatus"
          :title="syncTitle"
          @click="onSyncClick"
        >{{ syncLabel }}</span>
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

const props = defineProps({
  /** 同步状态：idle | syncing | synced | error */
  syncStatus: { type: String, default: 'idle' }
})

const router = useRouter()
const { user, logout: doLogout } = useWillpowerAuth()
const username = computed(() => user.value?.displayName || user.value?.username || '')

const syncLabel = computed(() => {
  switch (props.syncStatus) {
    case 'syncing': return '同步中...'
    case 'synced': return '已同步'
    case 'error': return '同步失败'
    default: return ''
  }
})

const syncTitle = computed(() => {
  switch (props.syncStatus) {
    case 'syncing': return '数据正在写入服务器'
    case 'synced': return '所有数据已保存到服务器'
    case 'error': return '上次同步失败，点击重试'
    default: return ''
  }
})

function onSyncClick() {
  if (props.syncStatus === 'error') {
    // 通知父组件重试（通过自定义事件）
    // 父组件 WillpowerHome 监听此事件并触发 refreshOverview
    window.dispatchEvent(new CustomEvent('wp-retry-sync'))
  }
}

async function logout() {
  await doLogout()
  router.replace('/willpower/login')
}
</script>
