// 组件尺寸类型
export type SizeType = 'large' | 'default' | 'small' | 'medium'

// 布局类型
export type LayoutType = 'vertical' | 'horizontal' | 'mix'

// 主题类型
export type ThemeType = 'light' | 'dark'

// 应用配置
export interface AppConfig {
  layout: LayoutType
  size: SizeType
  theme: ThemeType
  primaryColor: string
  showTagsView: boolean
  showFooter: boolean
  showSidebarLogo: boolean
  fixedHeader: boolean
}
