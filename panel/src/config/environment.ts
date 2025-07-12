// 环境配置管理器
// 用于根据部署环境动态配置API和WebSocket地址

interface EnvironmentConfig {
  apiBaseUrl: string
  wsBaseUrl: string
  isDevelopment: boolean
  protocol: 'http' | 'https'
  host: string
  port: number
  wsPort: number
}

class EnvironmentManager {
  private config: EnvironmentConfig

  constructor() {
    this.config = this.detectEnvironment()
  }

  /**
   * 检测当前环境并生成配置
   */
  private detectEnvironment(): EnvironmentConfig {
    const isDevelopment = import.meta.env.DEV
    const currentUrl = new URL(window.location.href)

    // 获取运行时配置（如果存在）
    const runtimeConfig = window.APP_CONFIG || {}

    if (isDevelopment) {
      // 开发环境：使用固定的本地地址
      return {
        apiBaseUrl: this.buildApiUrl('http', '127.0.0.1', 3000),
        wsBaseUrl: this.buildWsUrl('ws', '127.0.0.1', 3000),
        isDevelopment: true,
        protocol: 'http',
        host: '127.0.0.1',
        port: 3000,
        wsPort: 3000
      }
    } else {
      // 生产环境：优先使用运行时配置，然后使用当前页面的地址
      const protocol = (runtimeConfig.API_PROTOCOL as 'http' | 'https') ||
                      (currentUrl.protocol === 'https:' ? 'https' : 'http')
      const wsProtocol = (runtimeConfig.WS_PROTOCOL as 'ws' | 'wss') ||
                        (currentUrl.protocol === 'https:' ? 'wss' : 'ws')
      const host = runtimeConfig.API_HOST || currentUrl.hostname
      const wsHost = runtimeConfig.WS_HOST || currentUrl.hostname
      const port = runtimeConfig.API_PORT ?
                   parseInt(runtimeConfig.API_PORT) :
                   (parseInt(currentUrl.port) || (protocol === 'https' ? 443 : 80))
      const wsPort = runtimeConfig.WS_PORT ?
                     parseInt(runtimeConfig.WS_PORT) :
                     (parseInt(currentUrl.port) || (wsProtocol === 'wss' ? 443 : 80))

      return {
        apiBaseUrl: this.buildApiUrl(protocol, host, port),
        wsBaseUrl: this.buildWsUrl(wsProtocol, wsHost, wsPort),
        isDevelopment: false,
        protocol,
        host,
        port,
        wsPort
      }
    }
  }

  /**
   * 构建API URL
   */
  private buildApiUrl(protocol: string, host: string, port: number): string {
    const portSuffix = this.shouldIncludePort(protocol, port) ? `:${port}` : ''
    return `${protocol}://${host}${portSuffix}/api`
  }

  /**
   * 构建WebSocket URL
   */
  private buildWsUrl(protocol: string, host: string, port: number): string {
    const portSuffix = this.shouldIncludePort(protocol.replace('ws', 'http'), port) ? `:${port}` : ''
    return `${protocol}://${host}${portSuffix}`
  }

  /**
   * 判断是否需要包含端口号
   */
  private shouldIncludePort(protocol: string, port: number): boolean {
    const defaultPorts = {
      'http': 80,
      'https': 443
    }
    return port !== defaultPorts[protocol as keyof typeof defaultPorts]
  }

  /**
   * 获取API基础URL
   */
  getApiBaseUrl(): string {
    return this.config.apiBaseUrl
  }

  /**
   * 获取WebSocket基础URL
   */
  getWsBaseUrl(): string {
    return this.config.wsBaseUrl
  }

  /**
   * 获取完整配置
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config }
  }

  /**
   * 是否为开发环境
   */
  isDevelopment(): boolean {
    return this.config.isDevelopment
  }

  /**
   * 构建WebSocket完整URL
   * @param endpoint WebSocket端点路径
   * @param token 认证token（可选）
   */
  buildWebSocketUrl(endpoint: string, token?: string): string {
    const baseUrl = `${this.config.wsBaseUrl}${endpoint}`
    if (token) {
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}token=${encodeURIComponent(token)}`
    }
    return baseUrl
  }

  /**
   * 更新配置（用于运行时配置更新）
   */
  updateConfig(overrides: Partial<EnvironmentConfig>): void {
    this.config = { ...this.config, ...overrides }
  }
}

// 创建全局环境管理器实例
export const environmentManager = new EnvironmentManager()

// 导出配置获取函数（向后兼容）
export const getApiBaseUrl = () => environmentManager.getApiBaseUrl()
export const getWsBaseUrl = () => environmentManager.getWsBaseUrl()
export const getEnvironmentConfig = () => environmentManager.getConfig()

// 默认导出
export default environmentManager
