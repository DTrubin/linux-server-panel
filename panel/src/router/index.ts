import { createRouter, createWebHashHistory, type Router } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'
import { ChartManager } from '@/utils/chartManager'
import { globalWebSocketManager } from '@/utils/globalWebSocketManager'
import { staticRoutes, dynamicRoutes } from './routes'

// 合并所有路由
const allRoutes = [...staticRoutes, ...dynamicRoutes]

const router: Router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: allRoutes // 直接加载所有路由
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  document.title = to.meta?.title + 'Linux Server Panel'

  // 管理系统资源 WebSocket 连接需求
  if (to.name === 'Dashboard') {
    // 进入仪表盘页面，标记需要系统资源数据
    globalWebSocketManager.requireSystemResource('Dashboard')
  }

  // 不需要认证的页面，放行
  if (to.meta === undefined || to.meta.requiresAuth === false) {
    return next()
  }

  const authStore = useAuthStore()
  // 有 token，放行
  if (authStore.token) {
    return next()
  }

  // 没有 token，重定向到登录页
  return next({ name: 'Login', query: { redirect: to.fullPath } })
})

// 全局后置守卫，清理图表资源和管理 WebSocket 连接
router.afterEach((to, from) => {
  // 处理离开仪表盘的情况
  if (from.name === 'Dashboard' && to.name !== 'Dashboard') {
    // 取消系统资源数据需求
    globalWebSocketManager.unrequireSystemResource('Dashboard')

    // 延迟清理图表实例，确保组件已经卸载
    setTimeout(() => {
      const chartCount = ChartManager.getChartCount()
      if (chartCount > 0) {
        ChartManager.destroyAllCharts()
      }
    }, 100)
  }
})

// 全局错误处理
router.onError((error) => {
  console.error('Router error:', error)
})

export default router
