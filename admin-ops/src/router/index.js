import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/dashboard/index.vue'),
    meta: { title: '运营日报', icon: 'DataAnalysis' }
  },
  {
    path: '/trending',
    name: 'Trending',
    component: () => import('../views/trending/index.vue'),
    meta: { title: '热度榜单', icon: 'TrendCharts' }
  },
  {
    path: '/insights',
    name: 'Insights',
    component: () => import('../views/insights/index.vue'),
    meta: { title: '趋势洞察', icon: 'DataLine' }
  },
  {
    path: '/styles',
    name: 'Styles',
    component: () => import('../views/styles/index.vue'),
    meta: { title: '款式管理', icon: 'Grid' }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/users/index.vue'),
    meta: { title: '用户数据', icon: 'User' }
  },
  {
    path: '/recommend',
    name: 'Recommend',
    component: () => import('../views/recommend/index.vue'),
    meta: { title: '推荐位管理', icon: 'Promotion' }
  },
  {
    path: '/ai-assistant',
    name: 'AIAssistant',
    component: () => import('../views/ai-assistant/index.vue'),
    meta: { title: 'AI 运营助手', icon: 'ChatDotRound' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
