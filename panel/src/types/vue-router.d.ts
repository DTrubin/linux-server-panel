import 'vue-router'
import type { RoleType } from './auth'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: RoleType[]
    permission?: string
    permissions?: string[]
    icon?: string
    hideSidebar?: boolean
    showTagsView?: boolean
    showFooter?: boolean
    keepAlive?: boolean
    layout?: 'default' | 'none' | boolean
  }
}
