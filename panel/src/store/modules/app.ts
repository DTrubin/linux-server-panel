import { defineStore } from 'pinia'
import type { SizeType, LayoutType, ThemeType } from '@/types/app'
import { getConfig, setConfig } from '@/api/system'
import { DEFAULT_PRIMARY } from '@/config'

interface AppState {
  // 布局相关
  sidebar: {
    opened: boolean
  }
  layout: LayoutType
  device: 'desktop' | 'mobile'

  // 样式相关
  size: SizeType
  theme: ThemeType
  primaryColor: string

  // 功能相关
  showTagsView: boolean
  showFooter: boolean
  showSidebarLogo: boolean
  fixedHeader: boolean

  // 其他
  configLoaded: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebar: {
      opened: true
    },
    layout: 'vertical',
    device: 'desktop',
    size: 'medium',
    theme: 'light',
    primaryColor: DEFAULT_PRIMARY,
    showTagsView: true,
    showFooter: true,
    showSidebarLogo: true,
    fixedHeader: true,
    configLoaded: false
  }),

  getters: {
    getSidebarOpened(): boolean {
      return this.sidebar.opened
    },
    getLayout(): LayoutType {
      return this.layout
    },
    getDevice(): 'desktop' | 'mobile' {
      return this.device
    },
    getSize(): SizeType {
      return this.size
    },
    getTheme(): ThemeType {
      return this.theme
    },
    getPrimaryColor(): string {
      return this.primaryColor
    },
    getShowTagsView(): boolean {
      return this.showTagsView
    },
    getShowFooter(): boolean {
      return this.showFooter
    },
    getShowSidebarLogo(): boolean {
      return this.showSidebarLogo
    },
    getFixedHeader(): boolean {
      return this.fixedHeader
    },
    getConfigLoaded(): boolean {
      return this.configLoaded
    }
  },

  actions: {
    // 切换侧边栏状态
    toggleSidebar() {
      this.sidebar.opened = !this.sidebar.opened
    },

    // 切换设备类型
    toggleDevice(device: 'desktop' | 'mobile') {
      this.device = device
    },

    // 切换布局
    changeLayout(layout: LayoutType) {
      this.layout = layout
    },

    // 更改组件尺寸
    changeSize(size: SizeType) {
      this.size = size
      document.documentElement.setAttribute('data-size', size)
    },

    // 切换主题
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', this.theme)
    },

    // 设置主题
    setTheme(theme: ThemeType) {
      this.theme = theme
      document.documentElement.setAttribute('data-theme', theme)
    },

    // 设置主题色
    setPrimaryColor(color: string) {
      this.primaryColor = color
      document.documentElement.style.setProperty('--el-color-primary', color)
    },

    // 切换TagsView显示
    toggleTagsView(show: boolean) {
      this.showTagsView = show
    },

    // 切换页脚显示
    toggleFooter(show: boolean) {
      this.showFooter = show
    },

    // 切换侧边栏Logo显示
    toggleSidebarLogo(show: boolean) {
      this.showSidebarLogo = show
    },

    // 切换固定头部
    toggleFixedHeader(fixed: boolean) {
      this.fixedHeader = fixed
    },

    // 从服务器加载配置
    async loadConfig() {
      try {
        const { data } = await getConfig()
        this.layout = data.layout || 'vertical'
        this.size = data.size || 'medium'
        this.theme = data.theme || 'light'
        this.primaryColor = data.primaryColor || DEFAULT_PRIMARY
        this.showTagsView = data.showTagsView ?? true
        this.showFooter = data.showFooter ?? true
        this.showSidebarLogo = data.showSidebarLogo ?? true
        this.fixedHeader = data.fixedHeader ?? true

        // 应用配置到DOM
        document.documentElement.setAttribute('data-theme', this.theme)
        document.documentElement.setAttribute('data-size', this.size)
        document.documentElement.style.setProperty('--el-color-primary', this.primaryColor)

        this.configLoaded = true
      } catch (error) {
        console.error('Failed to load config:', error)
        this.configLoaded = true // 即使失败也标记为已加载
      }
    },

    // 保存配置到服务器
    async saveConfig() {
      try {
        await setConfig({
          layout: this.layout,
          size: this.size,
          theme: this.theme,
          primaryColor: this.primaryColor,
          showTagsView: this.showTagsView,
          showFooter: this.showFooter,
          showSidebarLogo: this.showSidebarLogo,
          fixedHeader: this.fixedHeader
        })
      } catch (error) {
        console.error('Failed to save config:', error)
        throw error
      }
    },

    // 重置为默认配置
    resetConfig() {
      this.layout = 'vertical'
      this.size = 'medium'
      this.theme = 'light'
      this.primaryColor = DEFAULT_PRIMARY
      this.showTagsView = true
      this.showFooter = true
      this.showSidebarLogo = true
      this.fixedHeader = true

      // 应用默认配置到DOM
      document.documentElement.setAttribute('data-theme', this.theme)
      document.documentElement.setAttribute('data-size', this.size)
      document.documentElement.style.setProperty('--el-color-primary', this.primaryColor)
    }
  }
})

