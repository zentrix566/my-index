import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Projects from '../views/Projects.vue'
import ProjectDetail from '../views/ProjectDetail.vue'
import IntervalTraining from '../views/IntervalTraining.vue'
import Lab from '../views/Lab.vue'
import About from '../views/About.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/projects', name: 'projects', component: Projects },
  {
    path: '/projects/:slug.html',
    redirect: (to) => `/projects/${String(to.params.slug).replace(/\.html$/, '')}`
  },
  { path: '/projects/:slug', name: 'project-detail', component: ProjectDetail },
  { path: '/life/interval-training.html', redirect: '/interval-training' },
  { path: '/interval-training', name: 'interval-training', component: IntervalTraining },
  { path: '/lab', name: 'lab', component: Lab },
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
