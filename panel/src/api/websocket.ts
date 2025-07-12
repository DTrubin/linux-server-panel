import type { SystemResources, PerformanceHistory } from '@/types/system'

/**
 * WebSocket 连接管理
 */

import {
  WS_RECONNECT_INTERVAL,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_HEARTBEAT_INTERVAL,
  WS_TIMEOUT
} from '@/config/constants'

// WebSocket 消息类型
export type WebSocketMessageType =
  | 'system_status'
  | 'performance_data'
  | 'alert'
  | 'log'
  | 'task_status'
  | 'file_operation'
  | 'terminal_output'
  | 'backup_progress'

// WebSocket 消息接口
export interface WebSocketMessage {
  type: WebSocketMessageType
  data: unknown
  timestamp: string
  id?: string
}

// 系统状态消息
export interface SystemStatusMessage extends WebSocketMessage {
  type: 'system_status'
  data: SystemResources
}

// 性能数据消息
export interface PerformanceDataMessage extends WebSocketMessage {
  type: 'performance_data'
  data: PerformanceHistory
}

// 告警消息
export interface AlertMessage extends WebSocketMessage {
  type: 'alert'
  data: {
    id: string
    level: 'info' | 'warning' | 'error' | 'critical'
    title: string
    message: string
    timestamp: string
  }
}

// 日志消息
export interface LogMessage extends WebSocketMessage {
  type: 'log'
  data: {
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical'
    service?: string
    message: string
    timestamp: string
  }
}

// 任务状态消息
export interface TaskStatusMessage extends WebSocketMessage {
  type: 'task_status'
  data: {
    taskId: string
    executionId: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    progress?: number
    message?: string
  }
}

// 文件操作消息
export interface FileOperationMessage extends WebSocketMessage {
  type: 'file_operation'
  data: {
    operation: 'upload' | 'download' | 'copy' | 'move' | 'delete' | 'compress' | 'extract'
    path: string
    status: 'started' | 'progress' | 'completed' | 'failed'
    progress?: number
    message?: string
  }
}

// 终端输出消息
export interface TerminalOutputMessage extends WebSocketMessage {
  type: 'terminal_output'
  data: {
    sessionId: string
    output: string
    type: 'stdout' | 'stderr'
  }
}

// 备份进度消息
export interface BackupProgressMessage extends WebSocketMessage {
  type: 'backup_progress'
  data: {
    backupId: string
    status: 'started' | 'progress' | 'completed' | 'failed'
    progress?: number
    currentFile?: string
    message?: string
  }
}

// WebSocket 连接配置
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  timeout?: number
}

// WebSocket 连接状态
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

// WebSocket 事件监听器
export type WebSocketEventListener<T = unknown> = (data: T) => void

// WebSocket 客户端类
export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private reconnectAttempts = 0
  private heartbeatTimer?: number
  private reconnectTimer?: number
  private status: WebSocketStatus = 'disconnected'
  private listeners: Map<WebSocketMessageType, Set<WebSocketEventListener>> = new Map()
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set()

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      reconnectInterval: config.reconnectInterval || WS_RECONNECT_INTERVAL,
      maxReconnectAttempts: config.maxReconnectAttempts || WS_MAX_RECONNECT_ATTEMPTS,
      heartbeatInterval: config.heartbeatInterval || WS_HEARTBEAT_INTERVAL,
      timeout: config.timeout || WS_TIMEOUT
    }
  }

  // 连接 WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.setStatus('connecting')

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols)

        const timeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, this.config.timeout)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.setStatus('connected')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = () => {
          clearTimeout(timeout)
          this.setStatus('disconnected')
          this.stopHeartbeat()
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          this.setStatus('error')
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        this.setStatus('error')
        reject(error)
      }
    })
  }

  // 断开连接
  disconnect(): void {
    this.stopReconnect()
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.setStatus('disconnected')
  }

  // 发送消息
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      throw new Error('WebSocket is not connected')
    }
  }

  // 订阅消息类型
  subscribe<T = unknown>(type: WebSocketMessageType, listener: WebSocketEventListener<T>): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener as WebSocketEventListener)
  }

  // 取消订阅
  unsubscribe<T = unknown>(type: WebSocketMessageType, listener: WebSocketEventListener<T>): void {
    const typeListeners = this.listeners.get(type)
    if (typeListeners) {
      typeListeners.delete(listener as WebSocketEventListener)
    }
  }

  // 监听连接状态变化
  onStatusChange(listener: (status: WebSocketStatus) => void): void {
    this.statusListeners.add(listener)
  }

  // 移除状态监听器
  offStatusChange(listener: (status: WebSocketStatus) => void): void {
    this.statusListeners.delete(listener)
  }

  // 获取当前状态
  getStatus(): WebSocketStatus {
    return this.status
  }

  // 处理接收到的消息
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      const typeListeners = this.listeners.get(message.type)

      if (typeListeners) {
        typeListeners.forEach(listener => {
          try {
            listener(message.data)
          } catch (error) {
            console.error('Error in WebSocket message handler:', error)
          }
        })
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  // 设置连接状态
  private setStatus(status: WebSocketStatus): void {
    if (this.status !== status) {
      this.status = status
      this.statusListeners.forEach(listener => {
        try {
          listener(status)
        } catch (error) {
          console.error('Error in status change handler:', error)
        }
      })
    }
  }

  // 尝试重连
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn('Maximum reconnect attempts reached')
      return
    }

    this.setStatus('reconnecting')
    this.reconnectAttempts++

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
      this.connect().catch(() => {
        // 重连失败会触发 onclose，继续重连逻辑
      })
    }, this.config.reconnectInterval)
  }

  // 停止重连
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    this.reconnectAttempts = 0
  }

  // 开始心跳
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'system_status',
          data: { type: 'ping' },
          timestamp: new Date().toISOString()
        })
      }
    }, this.config.heartbeatInterval)
  }

  // 停止心跳
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }
}

// 创建 WebSocket 客户端实例
export const createWebSocketClient = (config: WebSocketConfig): WebSocketClient => {
  return new WebSocketClient(config)
}

// WebSocket URL 构建器
export const buildWebSocketUrl = (baseUrl: string, token?: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = new URL(baseUrl, `${protocol}//${window.location.host}`)

  if (token) {
    url.searchParams.set('token', token)
  }

  return url.toString()
}

// 默认 WebSocket 配置
export const defaultWebSocketConfig: Partial<WebSocketConfig> = {
  reconnectInterval: WS_RECONNECT_INTERVAL,
  maxReconnectAttempts: WS_MAX_RECONNECT_ATTEMPTS,
  heartbeatInterval: WS_HEARTBEAT_INTERVAL,
  timeout: WS_TIMEOUT
}
