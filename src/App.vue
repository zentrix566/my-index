<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="site-header">
      <nav class="nav-container" aria-label="主导航">
        <RouterLink class="logo" to="/">Zentrix Index</RouterLink>
        <button
          class="menu-toggle"
          type="button"
          :aria-label="isMenuOpen ? '收起导航' : '展开导航'"
          :aria-expanded="isMenuOpen"
          @click="toggleMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <ul class="nav-links" :class="{ active: isMenuOpen }">
          <li><RouterLink to="/" @click="closeMenu">首页</RouterLink></li>
          <li><RouterLink to="/projects" @click="closeMenu">工作项目</RouterLink></li>
          <li><RouterLink to="/vue-apps" @click="closeMenu">个人项目</RouterLink></li>
          <li><RouterLink to="/about" @click="closeMenu">关于</RouterLink></li>
        </ul>
      </nav>
    </header>

    <main id="main-content" tabindex="-1">
      <RouterView />
    </main>

    <footer class="site-footer">
      <p>© {{ year }} Zentrix. Built as a Vue-powered personal index.</p>
      <p class="footer-links">
        <RouterLink to="/stats">访问统计</RouterLink>
        <a
          v-for="link in friendLinks"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
        >{{ link.name }}</a>
      </p>
    </footer>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { friendLinks } from './data/friendLinks'

const year = new Date().getFullYear()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
</style>
