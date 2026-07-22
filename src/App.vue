<template>
  <div class="app-shell">
    <header class="site-header">
      <nav class="nav-container" aria-label="主导航">
        <RouterLink class="logo" to="/">Zentrix Index</RouterLink>
        <button class="menu-toggle" type="button" aria-label="展开导航" :aria-expanded="isMenuOpen" @click="toggleMenu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <ul class="nav-links" :class="{ active: isMenuOpen }">
          <li><RouterLink to="/" @click="closeMenu">首页</RouterLink></li>
          <li><RouterLink to="/projects" @click="closeMenu">项目</RouterLink></li>
          <li><RouterLink to="/vue-apps" @click="closeMenu">Vue 项目</RouterLink></li>
          <li><RouterLink to="/about" @click="closeMenu">关于</RouterLink></li>
        </ul>
      </nav>
    </header>

    <main>
      <RouterView />
    </main>

    <footer class="site-footer">
      <p>© {{ year }} Zentrix. Built as a Vue-powered personal index.</p>
      <p class="footer-links">
        <RouterLink to="/stats">访问统计</RouterLink>
      </p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const year = new Date().getFullYear()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}
</script>

<style scoped>
</style>
