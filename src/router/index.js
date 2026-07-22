import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Projects from '../views/Projects.vue'
import ProjectDetail from '../views/ProjectDetail.vue'
import VueApps from '../views/VueApps.vue'
import IntervalTraining from '../views/IntervalTraining.vue'
import Countdown from '../views/Countdown.vue'
import AIOpsConsole from '../views/AIOpsConsole.vue'
import CrazyPeople from '../crazy-people/CrazyPeople.vue'
import WorldCupKick from '../views/WorldCupKick.vue'
import JiangyinBattle from '../views/JiangyinBattle.vue'
import DominoFall from '../views/DominoFall.vue'
import HearthstoneAchievements from '../views/HearthstoneAchievements.vue'
import About from '../views/About.vue'
import Stats from '../views/Stats.vue'
import Login from '../views/Login.vue'
import Changelog from '../views/Changelog.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/projects', name: 'projects', component: Projects },
  {
    path: '/projects/:slug.html',
    redirect: (to) => `/projects/${String(to.params.slug).replace(/\.html$/, '')}`
  },
  { path: '/projects/:slug', name: 'project-detail', component: ProjectDetail },
  { path: '/vue-apps', name: 'vue-apps', component: VueApps },
  { path: '/life/interval-training.html', redirect: '/interval-training' },
  { path: '/interval-training', name: 'interval-training', component: IntervalTraining },
  { path: '/lab', redirect: '/countdown' },
  { path: '/countdown', name: 'countdown', component: Countdown },
  { path: '/aiops', name: 'aiops', component: AIOpsConsole },
  { path: '/crazy-people', name: 'crazy-people', component: CrazyPeople },
  { path: '/worldcup', name: 'worldcup', component: WorldCupKick },
  { path: '/jiangyin', name: 'jiangyin', component: JiangyinBattle },
  { path: '/domino', name: 'domino', component: DominoFall },
  { path: '/hearthstone', name: 'hearthstone-achievements', component: HearthstoneAchievements, meta: { title: '炉石传说成就查看器 | Zentrix' } },
  { path: '/hearthstone/changelog', name: 'hearthstone-changelog', component: Changelog, meta: { title: '炉石成就查看器 · 更新日志 | Zentrix' } },
  { path: '/stats', name: 'stats', component: Stats },
  { path: '/about', name: 'about', component: About },
  { path: '/changelog', redirect: '/hearthstone/changelog' },
  { path: '/login', name: 'login', component: Login }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 页面访问上报：每次路由切换后向后端发送 PV 统计
router.afterEach((to) => {
  // 按路由设置页面标题，未指定时回退到默认标题
  document.title = to.meta?.title || 'Zentrix | 个人索引'
  // 不统计重定向路由本身
  if (to.matched.length === 0) return
  const path = to.fullPath || '/'
  try {
    const url = `/api/track?path=${encodeURIComponent(path)}`
    // 优先使用 sendBeacon，不阻塞页面切换
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url)
    } else {
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {})
    }
  } catch {
    // 静默失败，不影响用户体验
  }
})

export default router
