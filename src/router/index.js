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
import About from '../views/About.vue'

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
  { path: '/about', name: 'about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
