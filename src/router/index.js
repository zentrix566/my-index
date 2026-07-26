import { createRouter, createWebHistory } from 'vue-router'

// 路由级懒加载：每个页面单独成 chunk，首屏只加载当前路由所需的代码，
// 避免炉石等大型页面把整包（4.8MB）拖进首页/关于页等轻量页面。
const Home = () => import('../views/Home.vue')
const Projects = () => import('../views/Projects.vue')
const ProjectDetail = () => import('../views/ProjectDetail.vue')
const VueApps = () => import('../views/VueApps.vue')
const IntervalTraining = () => import('../views/IntervalTraining.vue')
const Countdown = () => import('../views/Countdown.vue')
const AIOpsConsole = () => import('../views/AIOpsConsole.vue')
const CrazyPeople = () => import('../crazy-people/CrazyPeople.vue')
const WorldCupKick = () => import('../views/WorldCupKick.vue')
const JiangyinBattle = () => import('../views/JiangyinBattle.vue')
const DominoFall = () => import('../views/DominoFall.vue')
const HearthstoneAchievements = () => import('../views/HearthstoneAchievements.vue')
const DeckCodeViewer = () => import('../views/DeckCodeViewer.vue')
const About = () => import('../views/About.vue')
const Stats = () => import('../views/Stats.vue')
const Login = () => import('../views/Login.vue')
const Changelog = () => import('../views/Changelog.vue')

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
  { path: '/hearthstone/deck', name: 'hearthstone-deck', component: DeckCodeViewer, meta: { title: '炉石卡组代码解析 | Zentrix' } },
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
