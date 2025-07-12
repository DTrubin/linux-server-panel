import {
  DEFAULT_PRIMARY_COLOR,
  APP_VERSION,
  API_BASE_URL,
  DEFAULT_LANGUAGE
} from './constants'

// 默认主题色
export const DEFAULT_PRIMARY = DEFAULT_PRIMARY_COLOR

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  title: 'Linux服务器控制面板',
  version: APP_VERSION,
  baseURL: API_BASE_URL,
  timeout: 5000,
  retryDelay: 1000,
  retryCount: 3,
  layout: 'vertical',
  theme: 'light',
  themeColor: DEFAULT_PRIMARY,
  locale: DEFAULT_LANGUAGE,
  showLogo: true,
  showFooter: true,
  showTagsView: true,
  showBreadcrumb: true,
  sidebarLogo: true,
  tagsView: true,
  fixedHeader: true
}
