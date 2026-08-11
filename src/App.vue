<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="site-header" :class="{ 'site-header--hidden': headerHidden }">
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
          <li class="nav-dropdown nav-project-menu">
            <details ref="personalMenu" @toggle="handleDropdownToggle('personal')">
              <summary>
                个人项目
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div class="nav-dropdown-menu">
                <RouterLink
                  v-for="app in featuredPersonalApps"
                  :key="app.to"
                  :to="app.to"
                  @click="closeNavigationMenus"
                >
                  {{ app.title }}
                </RouterLink>
                <RouterLink to="/projects#personal-projects" @click="closeNavigationMenus">
                  更多项目 →
                </RouterLink>
              </div>
            </details>
          </li>
          <li class="nav-dropdown nav-project-menu">
            <details ref="workMenu" @toggle="handleDropdownToggle('work')">
              <summary>
                工作项目
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div class="nav-dropdown-menu">
                <RouterLink
                  v-for="project in workProjectLinks"
                  :key="project.slug"
                  :to="`/projects/${project.slug}`"
                  @click="closeNavigationMenus"
                >
                  {{ project.title }}
                </RouterLink>
              </div>
            </details>
          </li>
          <li><RouterLink to="/changelog" @click="closeMenu">更新日志</RouterLink></li>
          <li><RouterLink to="/about" @click="closeMenu">关于</RouterLink></li>
          <li>
            <button
              class="nav-theme-toggle"
              type="button"
              :aria-label="theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式'"
              :title="theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式'"
              @click="toggleTheme"
            >
              <svg v-if="theme === 'dark'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
              <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
              {{ theme === 'dark' ? '白天' : '黑夜' }}
            </button>
          </li>
          <li v-if="!user">
            <RouterLink class="nav-login" :to="loginTarget" @click="closeMenu">登录 / 注册</RouterLink>
          </li>
          <li v-else class="nav-dropdown nav-account">
            <details ref="accountMenu" @toggle="handleDropdownToggle('account')">
              <summary>
                <span class="nav-account-name">{{ displayName }}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div class="nav-dropdown-menu nav-account-menu">
                <RouterLink to="/settings" @click="closeNavigationMenus">账号中心</RouterLink>
                <RouterLink v-if="user.isOwner" to="/admin" @click="closeNavigationMenus">站点后台</RouterLink>
                <button type="button" @click="doLogout">退出登录</button>
              </div>
            </details>
          </li>
        </ul>
      </nav>
    </header>

    <main id="main-content" tabindex="-1">
      <RouterView />
    </main>

    <footer class="site-footer">
      <p>© {{ year }} Zentrix. Built as a Vue-powered personal index.</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from './auth/useAuth.js'
import { useTheme } from './composables/useTheme.js'
import { projects } from './data/projects.js'
import { vueApps } from './data/vueApps.js'

const year = new Date().getFullYear()
const isMenuOpen = ref(false)
const headerHidden = ref(false)
const lastScrollY = ref(0)
const workMenu = ref(null)
const personalMenu = ref(null)
const accountMenu = ref(null)
const route = useRoute()
const router = useRouter()
const { user, init, logout } = useAuth()
const { theme, toggleTheme } = useTheme()
const workProjectLinks = projects.filter((project) => project.group === '工作项目')

// 顶栏「个人项目」下拉只展示精选入口，其余统一收进「更多项目」
const featuredPersonalApps = [
  { title: '炉石传说成就查看器', to: '/hearthstone' },
  { title: '日常管理', to: '/todo' },
  { title: '蛙生模拟器', to: '/hearthstone/frog' },
  { title: '黄粱一梦', to: '/dream' }
]

const displayName = computed(() => user.value?.displayName || user.value?.username || '账号')
const loginTarget = computed(() => ({
  path: '/login',
  query: route.path === '/login' ? {} : { redirect: route.fullPath }
}))

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const navigationMenus = { work: workMenu, personal: personalMenu, account: accountMenu }

const closeNavigationMenus = () => {
  closeMenu()
  Object.values(navigationMenus).forEach((menu) => {
    if (menu.value) menu.value.open = false
  })
}

const handleDropdownToggle = (activeMenu) => {
  const active = navigationMenus[activeMenu]?.value
  if (!active?.open) return
  Object.entries(navigationMenus).forEach(([name, menu]) => {
    if (name !== activeMenu && menu.value) menu.value.open = false
  })
}

const doLogout = async () => {
  await logout()
  closeNavigationMenus()
  await router.push('/')
}

const handleKeydown = (event) => {
  if (event.key === 'Escape') closeNavigationMenus()
}

const handleDocumentClick = (event) => {
  if (!event.target.closest('.nav-dropdown')) closeNavigationMenus()
}

// 滚动时自动隐藏/显示顶栏：往下滚隐藏，往上滚显示（首页不隐藏）
const SCROLL_THRESHOLD = 8
const handleScroll = () => {
  const y = window.scrollY
  if (y <= 0) { headerHidden.value = false; lastScrollY.value = y; return }
  const delta = y - lastScrollY.value
  if (Math.abs(delta) < SCROLL_THRESHOLD) return
  // 首页始终显示顶栏；子页面才自动隐藏
  if (route.path !== '/') {
    headerHidden.value = delta > 0
  } else {
    headerHidden.value = false
  }
  lastScrollY.value = y
}

watch(() => route.fullPath, closeNavigationMenus)

onMounted(() => {
  init()
  lastScrollY.value = window.scrollY
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleDocumentClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.site-header--hidden {
  transform: translateY(-100%);
}
</style>
