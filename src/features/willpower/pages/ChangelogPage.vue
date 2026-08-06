<template>
  <section class="wp-page">
    <div class="wp-container">
      <header class="wp-header">
        <div>
          <span class="wp-eyebrow">抵御心魔</span>
          <h1>更新日志</h1>
          <p>每次迭代都为了让「守住」变得更顺手。</p>
        </div>
        <RouterLink class="wp-btn ghost" to="/willpower">回到今日心魔</RouterLink>
      </header>

      <WpNav />

      <div v-for="entry in changelog" :key="entry.date" class="wp-card wp-changelog-entry">
        <div class="wp-changelog-date">{{ entry.date }}</div>
        <h2 class="wp-changelog-title">{{ entry.title }}</h2>
        <ul class="wp-changelog-list">
          <li v-for="(item, i) in entry.items" :key="i">{{ item }}</li>
        </ul>
      </div>

      <p v-if="!changelog.length" class="wp-empty">暂无更新记录。</p>
    </div>

    <WpToastHost />
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import changelogData from '../../../data/willpower-changelog.js'
import { useAuth } from '../../../auth/useAuth.js'
import WpNav from '../components/WpNav.vue'
import WpToastHost from '../components/WpToastHost.vue'

const router = useRouter()
const { user, init } = useAuth()
const changelog = ref(changelogData)

onMounted(async () => {
  await init()
  // 更新日志允许未登录浏览
})
</script>
