/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// 扩展 NodeJS 类型
declare namespace NodeJS {
  interface Timeout {
    [Symbol.toPrimitive](): number
  }
}

// 全局配置类型
declare interface AppConfig {
  title: string
  version: string
  baseURL: string
  timeout: number
  retryDelay: number
  retryCount: number
  showLogo: boolean
  showFooter: boolean
  showTagsView: boolean
  showBreadcrumb: boolean
  sidebarLogo: boolean
  tagsView: boolean
  fixedHeader: boolean
  layout: 'vertical' | 'horizontal' | 'mix'
  theme: 'light' | 'dark' | 'auto'
  themeColor: string
  locale: string
}

// WebSocket 数据类型
declare interface WebSocketData {
  type: string
  data: unknown
  timestamp: number
}

// 权限类型
declare interface Permission {
  id: string
  code: string
  name: string
  type: 'menu' | 'button' | 'api'
  path?: string
  icon?: string
  children?: Permission[]
}

// 标签视图类型
declare interface TagView {
  name: string
  path: string
  title: string
  fullPath: string
  query?: Record<string, string | string[]>
  meta: {
    title: string
    icon?: string
    affix?: boolean
    noCache?: boolean
  }
}
