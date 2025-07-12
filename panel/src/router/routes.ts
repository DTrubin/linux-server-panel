import type { RouteRecordRaw } from 'vue-router'

// 静态路由 - 不需要权限验证的基础路由
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/panel/home',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      layout: 'none'
    }
  },
  // 错误页面
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/403View.vue'),
    meta: {
      title: '访问被拒绝',
      requiresAuth: false,
      layout: 'none'
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/404View.vue'),
    meta: {
      title: '页面未找到',
      requiresAuth: false,
      layout: 'none'
    }
  },
  // 重定向页面
  {
    path: '/redirect/:path(.*)',
    name: 'Redirect',
    component: () => import('@/views/RedirectView.vue'),
    meta: {
      title: '重定向',
      requiresAuth: true
    }
  },
  // 捕获所有未匹配的路由
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

// 动态路由 - 需要根据权限动态添加的路由
export const dynamicRoutes: RouteRecordRaw[] = [
  // 主布局路由 - 包含侧边栏和头部的完整布局
  {
    path: '/panel',
    name: 'Panel',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      requiresAuth: true
    },
    children: [
      // 首页模块
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/HomeView.vue'),
        meta: {
          title: '首页',
          requiresAuth: true,
          icon: 'HomeFilled'
        }
      },
      // 仪表盘模块
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: {
          title: '仪表板',
          requiresAuth: true,
          icon: 'Odometer'
        }
      },
      // 终端
      {
        path: 'terminal',
        name: 'ServerTerminal',
        component: () => import('@/views/TerminalView.vue'),
        meta: {
          title: '终端',
          requiresAuth: true,
          icon: 'Monitor'
        }
      },
      // 文件管理模块
      {
        path: 'files',
        name: 'FileManager',
        component: () => import('@/views/FileManager.vue'),
        meta: {
          title: '文件管理',
          requiresAuth: true,
          icon: 'Folder'
        },
        children: [
        ]
      },
      // 任务调度模块
      {
        path: 'tasks',
        name: 'TaskScheduler',
        component: () => import('@/views/TaskScheduler.vue'),
        meta: {
          title: '任务调度',
          requiresAuth: true,
          icon: 'Timer'
        }
      },
      // 日志管理模块
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/LogView.vue'),
        meta: {
          title: '日志管理',
          requiresAuth: true,
          icon: 'Document'
        }
      },
      // 关于模块
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/AboutView.vue'),
        meta: {
          title: '关于',
          requiresAuth: true,
          icon: 'InfoFilled'
        }
      }
    ]
  },
  // 用户信息
  {
    path: '/profile',
    name: 'UserProfile',
    component: () => import('@/views/ProfileView.vue'),
    meta: {
      title: '用户信息',
      requiresAuth: true,
      icon: 'User'
    }
  }
]

// 默认导出静态路由，用于初始化路由
const routes: RouteRecordRaw[] = staticRoutes
// 合并静态路由和动态路由
routes.push(...dynamicRoutes)

export default routes
