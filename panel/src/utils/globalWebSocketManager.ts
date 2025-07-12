import { ref } from 'vue'

/**
 * 全局 WebSocket 连接管理器
 * 确保系统资源 WebSocket 只在需要时连接
 */
export class GlobalWebSocketManager {
  private static instance: GlobalWebSocketManager
  private activePages = ref(new Set<string>())
  private systemResourceRequired = ref(false)

  public static getInstance(): GlobalWebSocketManager {
    if (!GlobalWebSocketManager.instance) {
      GlobalWebSocketManager.instance = new GlobalWebSocketManager()
    }
    return GlobalWebSocketManager.instance
  }

  /**
   * 注册页面需要系统资源数据
   * @param pageName 页面名称
   */
  public requireSystemResource(pageName: string): void {
    this.activePages.value.add(pageName)
    this.updateSystemResourceRequirement()
  }

  /**
   * 取消页面对系统资源数据的需求
   * @param pageName 页面名称
   */
  public unrequireSystemResource(pageName: string): void {
    this.activePages.value.delete(pageName)
    this.updateSystemResourceRequirement()
  }

  /**
   * 检查是否需要系统资源数据
   */
  public isSystemResourceRequired(): boolean {
    return this.systemResourceRequired.value
  }

  /**
   * 获取需要系统资源的页面列表
   */
  public getActivePages(): string[] {
    return Array.from(this.activePages.value)
  }

  /**
   * 更新系统资源需求状态
   */
  private updateSystemResourceRequirement(): void {
    const previousState = this.systemResourceRequired.value
    this.systemResourceRequired.value = this.activePages.value.size > 0

    if (previousState !== this.systemResourceRequired.value) {
      this.handleSystemResourceRequirementChange()
    }
  }

  /**
   * 处理系统资源需求变化
   */
  private async handleSystemResourceRequirementChange(): Promise<void> {
    try {
      const { useSystemResourceStore } = await import('@/store/modules/systemResource')
      const systemResourceStore = useSystemResourceStore()

      if (this.systemResourceRequired.value) {
        // 需要连接
        if (!systemResourceStore.isConnected && !systemResourceStore.isConnecting) {
          systemResourceStore.connect()
        }
      } else {
        // 不需要连接
        if (systemResourceStore.isConnected) {
          systemResourceStore.disconnect()
        }
      }
    } catch (error) {
      console.error('处理系统资源需求变化失败:', error)
    }
  }

  /**
   * 强制刷新连接状态
   */
  public async forceRefreshConnection(): Promise<void> {
    await this.handleSystemResourceRequirementChange()
  }

  /**
   * 强制断开所有连接
   */  public async forceDisconnectAll(): Promise<void> {
    try {
      const { useSystemResourceStore } = await import('@/store/modules/systemResource')
      const systemResourceStore = useSystemResourceStore()

      // 清除所有页面需求
      this.activePages.value.clear()
      this.systemResourceRequired.value = false

      // 强制断开连接
      if (systemResourceStore.isConnected || systemResourceStore.isConnecting) {
        systemResourceStore.disconnect()
      }
    } catch (error) {
      console.error('强制断开连接失败:', error)
    }
  }

  /**
   * 重置所有状态
   */
  public reset(): void {
    this.activePages.value.clear()
    this.systemResourceRequired.value = false
  }

  /**
   * 获取管理器状态信息
   */
  public getStatus(): {
    activePages: string[]
    systemResourceRequired: boolean
    activePagesCount: number
  } {
    return {
      activePages: this.getActivePages(),
      systemResourceRequired: this.systemResourceRequired.value,
      activePagesCount: this.activePages.value.size
    }
  }
}

// 导出单例实例
export const globalWebSocketManager = GlobalWebSocketManager.getInstance()
