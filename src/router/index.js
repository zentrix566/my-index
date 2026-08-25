import { createRouter, createWebHistory } from 'vue-router'
import {
  loadAIOpsPage,
  loadCrazyPeoplePage,
  loadDeckCodeViewerPage,
  loadSubwayPage,
  loadHearthstoneAchievementsPage,
  loadHearthstoneCollectionPage,
  loadTavernPassXpPage,
  loadEventCalculatorPage,
  loadFrogSuspectCardPage,
  loadFrogReviewPage,
  loadCardLookupPage,
  loadHearthstoneWheelPage,
  loadAlteracPuzzleAssistantPage,
  loadHearthstoneGuidePage,
  loadAgeCalculatorPage,
  loadWillpowerHome,
  loadWillpowerAchievements,
  loadWillpowerProfile,
  loadWillpowerPositive,
  loadWillpowerCalendar,
  loadWillpowerData,
  loadWillpowerAiAnalysis,
  loadDreamPage,
  loadTodoHome,
  loadTodoCalendar,
  loadTodoManage,
  loadTodoAi,
  loadTodoGroups,
  loadTodoProfile,
  loadHistoryTimelinePage,
  loadWorldTimelinePage,
  loadBiographyPage
} from '../features/index.js'
import { useAuth } from '../auth/useAuth.js'

// 路由级懒加载：每个页面单独成 chunk，首屏只加载当前路由所需的代码，
// 避免炉石等大型页面把整包（4.8MB）拖进首页/关于页等轻量页面。
const Home = () => import('../views/Home.vue')
const Projects = () => import('../views/Projects.vue')
const ProjectDetail = () => import('../views/ProjectDetail.vue')
const About = () => import('../views/About.vue')
const Login = () => import('../views/Login.vue')
const ForgotPassword = () => import('../views/ForgotPassword.vue')
const ResetPassword = () => import('../views/ResetPassword.vue')
const Settings = () => import('../views/Settings.vue')
const VerifyEmail = () => import('../views/VerifyEmail.vue')
const Admin = () => import('../views/Admin.vue')
const Changelog = () => import('../views/Changelog.vue')

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/projects', name: 'projects', component: Projects },
  {
    path: '/projects/:slug.html',
    redirect: (to) => `/projects/${String(to.params.slug).replace(/\.html$/, '')}`
  },
  // OpsAgentAI 已合并进 CI/CD 流水线实践，旧链接重定向
  { path: '/projects/opsagentai', redirect: '/projects/cicd-architecture' },
  { path: '/projects/:slug', name: 'project-detail', component: ProjectDetail },
  { path: '/vue-apps', redirect: '/projects' },
  { path: '/aiops', name: 'aiops', component: loadAIOpsPage },
  { path: '/crazy-people', name: 'crazy-people', component: loadCrazyPeoplePage },
  { path: '/age-calculator', name: 'age-calculator', component: loadAgeCalculatorPage, meta: { title: '年龄计算器 | Zentrix' } },
  { path: '/subway', name: 'subway', component: loadSubwayPage, meta: { title: '北京地铁 · 站站距离' } },
  { path: '/hearthstone', name: 'hearthstone-achievements', component: loadHearthstoneAchievementsPage, meta: { title: '炉石传说成就查看器 | Zentrix' } },
  { path: '/hearthstone/guide', name: 'hearthstone-guide', component: loadHearthstoneGuidePage, meta: { title: '炉石功能手册 | Zentrix' } },
  { path: '/hearthstone/collection', name: 'hearthstone-collection', component: loadHearthstoneCollectionPage, meta: { title: '炉石外观收藏 | Zentrix' } },
  { path: '/hearthstone/wheel', name: 'hearthstone-wheel', component: loadHearthstoneWheelPage, meta: { title: '暗月宝藏模拟器 | Zentrix' } },
  { path: '/hearthstone/alterac-puzzle', name: 'hearthstone-alterac-puzzle', component: loadAlteracPuzzleAssistantPage, meta: { title: '奥特兰克谜题助手 | Zentrix' } },
  { path: '/hearthstone/deck', name: 'hearthstone-deck', component: loadDeckCodeViewerPage, meta: { title: '炉石卡组代码解析 | Zentrix' } },
  { path: '/hearthstone/changelog', redirect: '/changelog?category=hearthstone' },
  { path: '/hearthstone/xp', name: 'hearthstone-xp', component: loadTavernPassXpPage, meta: { title: '战令经验计算器 | Zentrix' } },
  { path: '/hearthstone/event', name: 'hearthstone-event', component: loadEventCalculatorPage, meta: { title: '活动计算器 | Zentrix' } },
  { path: '/hearthstone/frog', name: 'hearthstone-frog', component: loadFrogSuspectCardPage, meta: { title: '蛙生模拟器 | Zentrix' } },
  { path: '/hearthstone/frog/review', name: 'hearthstone-frog-review', component: loadFrogReviewPage, meta: { title: '卡牌修改验收台 | Zentrix' } },
  { path: '/hearthstone/lookup', name: 'hearthstone-lookup', component: loadCardLookupPage, meta: { title: '炉石卡牌查询 | Zentrix' } },
  { path: '/stats', redirect: '/admin?tab=stats' },
  { path: '/willpower', name: 'willpower', component: loadWillpowerHome, meta: { requiresAuth: true, title: '抵御心魔 | Zentrix' } },
  { path: '/willpower/achievements', name: 'willpower-achievements', component: loadWillpowerAchievements, meta: { requiresAuth: true, title: '成就殿堂 | 抵御心魔' } },
  { path: '/willpower/positive', name: 'willpower-positive', component: loadWillpowerPositive, meta: { requiresAuth: true, title: '今日正能量 | 抵御心魔' } },
  { path: '/willpower/calendar', name: 'willpower-calendar', component: loadWillpowerCalendar, meta: { requiresAuth: true, title: '抵御日历 | 抵御心魔' } },
  { path: '/willpower/data', name: 'willpower-data', component: loadWillpowerData, meta: { requiresAuth: true, title: '数据看板 | 抵御心魔' } },
  { path: '/willpower/ai', name: 'willpower-ai', component: loadWillpowerAiAnalysis, meta: { requiresAuth: true, title: 'AI 分析 | 抵御心魔' } },
  { path: '/willpower/changelog', redirect: '/changelog?category=willpower' },
  { path: '/willpower/profile', name: 'willpower-profile', component: loadWillpowerProfile, meta: { requiresAuth: true, title: '心魔档案 | 抵御心魔' } },
  // ========== 日程管理（统一登录，独立数据库）==========
  { path: '/todo', name: 'todo', component: loadTodoHome, meta: { requiresAuth: true, title: '日程管理 | Zentrix' } },
  { path: '/todo/done', name: 'todo-done', component: loadTodoHome, meta: { requiresAuth: true } },
  { path: '/todo/list/:listId', name: 'todo-list', component: loadTodoHome, meta: { requiresAuth: true } },
  { path: '/todo/calendar', name: 'todo-calendar', component: loadTodoCalendar, meta: { requiresAuth: true, title: '日历视图 | 日程管理' } },
  { path: '/todo/manage', name: 'todo-manage', component: loadTodoManage, meta: { requiresAuth: true, title: '日程管理 | 日程管理' } },
  { path: '/todo/ai', name: 'todo-ai', component: loadTodoAi, meta: { requiresAuth: true, title: '日程 AI 分析 | 日程管理' } },
  { path: '/todo/groups', name: 'todo-groups', component: loadTodoGroups, meta: { requiresAuth: true, title: '分组设置 | 日程管理' } },
  { path: '/todo/profile', name: 'todo-profile', component: loadTodoProfile, meta: { requiresAuth: true, title: '个人中心 | 日程管理' } },
  { path: '/todo/changelog', redirect: '/changelog?category=todo' },
  { path: '/todo/login', redirect: '/login?redirect=/todo&source=todo' },
  { path: '/dream', name: 'dream', component: loadDreamPage, meta: { title: '黄粱一梦 | Zentrix' } },
  // ========== 历史时间线（纯本地数据，无后端依赖）==========
  { path: '/history', name: 'history', component: loadHistoryTimelinePage, meta: { title: '历史时间线 | Zentrix' } },
  { path: '/world-history', name: 'world-history', component: loadWorldTimelinePage, meta: { title: '世界历史时间线 | Zentrix' } },
  // ========== 人物生平（服务端代理 DeepSeek，密钥仅服务端）==========
  { path: '/biography', name: 'biography', component: loadBiographyPage, meta: { title: '人物生平 | Zentrix' } },
  // 心魔独立认证已并入主站，/login 等统一走主站账号体系
  { path: '/willpower/login', redirect: '/login?redirect=/willpower&source=willpower' },
  { path: '/willpower/register', redirect: '/login?redirect=/willpower&source=willpower' },
  { path: '/willpower/forgot-password', redirect: '/forgot-password' },
  { path: '/willpower/reset-password', redirect: '/reset-password' },
  { path: '/about', name: 'about', component: About },
  { path: '/changelog', name: 'changelog', component: Changelog, meta: { title: '更新日志 | Zentrix' } },
  { path: '/login', name: 'login', component: Login },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword },
  { path: '/reset-password', name: 'reset-password', component: ResetPassword },
  { path: '/verify-email', name: 'verify-email', component: VerifyEmail },
  { path: '/settings', name: 'settings', component: Settings, meta: { requiresAuth: true, title: '账号中心 | Zentrix' } },
  // 所有者专属后台：页面内校验 isOwner，非所有者会被送回账号中心
  { path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true, title: '站点后台 | Zentrix' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, top: 88, behavior: 'smooth' }
    }
    return { top: 0 }
  }
})

const auth = useAuth()

router.beforeEach(async (to) => {
  window.dispatchEvent(new CustomEvent('route-loading'))
  if (!to.meta.requiresAuth) return true
  await auth.init()
  if (auth.user.value) return true
  return {
    path: '/login',
    query: { redirect: to.fullPath, source: to.path.startsWith('/todo') ? 'todo' : 'willpower' }
  }
})

router.onError((error) => {
  console.error('路由页面加载失败', error)
  window.dispatchEvent(new CustomEvent('route-error'))
})

// 页面访问上报：每次路由切换后向后端发送 PV 统计
router.afterEach((to) => {
  // 按路由设置页面标题，未指定时回退到默认标题
  document.title = to.meta?.title || 'Zentrix | 个人索引'
  // 通知顶栏进度条收尾，详见 App.vue 的 begin/finishRouteProgress
  window.dispatchEvent(new CustomEvent('route-finish'))
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
