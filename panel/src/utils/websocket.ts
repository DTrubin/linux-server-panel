import { ref, computed, onUnmounted, getCurrentInstance } from 'vue'

export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: number
  sessionId?: string
  currentDirectory?: string
  exitCode?: number
}

export interface TypedMessageSender {
  send: (type: string, data?: any) => void
  close: () => void
}

/**
 * 创建类型化的消息发送器
 */
export function createTypedMessageSender(ws: WebSocket): TypedMessageSender {
  const send = (type: string, data?: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now()
      }
      ws.send(JSON.stringify(message))
    }
  }

  const close = () => {
    ws.close()
  }

  return { send, close }
}

/**
 * 终端WebSocket连接组合式函数
 */
export function useTerminalWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const messages = ref<WebSocketMessage[]>([])

  const connect = (url: string) => {
    if (ws.value) {
      ws.value.close()
    }

    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      isConnected.value = true
      console.log('终端WebSocket连接成功')
    }

    ws.value.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        messages.value.push(message)
      } catch (error) {
        console.error('解析WebSocket消息失败:', error)
      }
    }

    ws.value.onerror = (error) => {
      console.error('终端WebSocket错误:', error)
    }

    ws.value.onclose = () => {
      isConnected.value = false
      console.log('终端WebSocket已断开连接')
    }
  }

  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }

  const sendMessage = (type: string, data?: any) => {
    if (ws.value && isConnected.value) {
      const sender = createTypedMessageSender(ws.value)
      sender.send(type, data)
    }
  }

  // 组件卸载时自动断开连接 - 只在组件上下文中注册
  const instance = getCurrentInstance()
  if (instance) {
    onUnmounted(() => {
      disconnect()
    })
  }

  // 手动清理方法
  const cleanup = () => {
    disconnect()
  }

  return {
    ws: computed(() => ws.value),
    isConnected: computed(() => isConnected.value),
    messages: computed(() => messages.value),
    connect,
    disconnect,
    sendMessage,
    cleanup
  }
}
