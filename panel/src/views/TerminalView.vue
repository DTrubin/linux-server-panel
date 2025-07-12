<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useTerminalWebSocket, type WebSocketMessage } from '@/utils/websocket'
import { environmentManager } from '@/config/environment'

// 响应式数据
const terminalContainer = ref<HTMLElement>()
const terminalOutput = ref<HTMLElement>()
const terminalInput = ref<HTMLInputElement>()

const isConnecting = ref(false)
const isConnected = ref(false)
const sessionId = ref('')
const connectedAt = ref<Date | null>(null)
const currentServer = ref('localhost')
const currentPrompt = ref('$ ')
const currentCommand = ref('')
const cursorBlink = ref(true)
const showSessionPanel = ref(false)

const terminalHistory = ref<string[]>([])
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

const terminalSize = reactive({
  cols: 80,
  rows: 24
})

// WebSocket 连接
const { isConnected: wsConnected, messages, connect, disconnect, sendMessage } = useTerminalWebSocket()

// 计算属性
const terminalUrl = (() => {
  return environmentManager.buildWebSocketUrl(`/terminal/`)
})()

// 格式化终端行
const formatTerminalLine = (line: string) => {
  return line
}

// 格式化日期
const formatDate = (date: Date | null) => {
  if (!date) return '-'
  return date.toLocaleString('zh-CN')
}

// 连接终端
const connectTerminal = async () => {
  if (isConnecting.value || isConnected.value) return

  try {
    isConnecting.value = true
    terminalHistory.value.push('正在连接终端...')

    connect(terminalUrl)

    // 等待连接建立
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('连接超时')), 10000)

      const checkConnection = () => {
        if (wsConnected.value) {
          clearTimeout(timeout)
          resolve(true)
        } else {
          setTimeout(checkConnection, 100)
        }
      }
      checkConnection()
    })

    isConnected.value = true
    connectedAt.value = new Date()

    ElMessage.success('终端连接成功')

    // 聚焦到输入框
    nextTick(() => {
      terminalInput.value?.focus()
    })

  } catch (error) {
    console.error('终端连接失败:', error)
    ElMessage.error('终端连接失败')
    const errorMessage = error instanceof Error ? error.message : String(error)
    terminalHistory.value.push(`连接失败: ${errorMessage}`)
  } finally {
    isConnecting.value = false
  }
}

// 断开终端连接
const disconnectTerminal = () => {
  disconnect()
  isConnected.value = false
  connectedAt.value = null
  sessionId.value = ''
  terminalHistory.value.push('终端连接已断开')
}

// 清空终端
const clearTerminal = () => {
  terminalHistory.value = []
}

// 发送命令
const sendCommand = (command: string) => {
  if (!isConnected.value || !command.trim()) return

  // 添加到历史记录
  if (command.trim() && commandHistory.value[commandHistory.value.length - 1] !== command.trim()) {
    commandHistory.value.push(command.trim())
    if (commandHistory.value.length > 100) {
      commandHistory.value.shift()
    }
  }

  // 发送到服务器（不要在前端显示用户输入，让终端自然回显）
  sendMessage('terminal_input', command + '\n')

  // 清空输入
  currentCommand.value = ''
  historyIndex.value = -1

  // 滚动到底部
  scrollToBottom()
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault()
      sendCommand(currentCommand.value)
      break

    case 'ArrowUp':
      event.preventDefault()
      navigateHistory('up')
      break

    case 'ArrowDown':
      event.preventDefault()
      navigateHistory('down')
      break

    case 'Tab':
      event.preventDefault()
      // TODO: 实现自动补全
      break

    case 'c':
      if (event.ctrlKey) {
        event.preventDefault()
        sendMessage('terminal_input', '\x03') // Ctrl+C
      }
      break

    case 'd':
      if (event.ctrlKey) {
        event.preventDefault()
        sendMessage('terminal_input', '\x04') // Ctrl+D
      }
      break
  }
}

// 处理粘贴事件
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedText = event.clipboardData?.getData('text') || ''
  currentCommand.value += pastedText
}

// 导航命令历史
const navigateHistory = (direction: 'up' | 'down') => {
  if (commandHistory.value.length === 0) return

  if (direction === 'up') {
    if (historyIndex.value === -1) {
      historyIndex.value = commandHistory.value.length - 1
    } else if (historyIndex.value > 0) {
      historyIndex.value--
    }
  } else {
    if (historyIndex.value === -1) return
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++
    } else {
      historyIndex.value = -1
      currentCommand.value = ''
      return
    }
  }

  if (historyIndex.value >= 0) {
    currentCommand.value = commandHistory.value[historyIndex.value]
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (terminalOutput.value) {
      terminalOutput.value.scrollTop = terminalOutput.value.scrollHeight
    }
  })
}

// 更新终端大小
const updateTerminalSize = () => {
  if (!terminalContainer.value) return

  const container = terminalContainer.value
  const rect = container.getBoundingClientRect()

  // 基于容器大小计算行列数
  const charWidth = 9 // 调整字符宽度估计
  const lineHeight = 22 // 调整行高估计

  const cols = Math.floor((rect.width - 40) / charWidth)
  const rows = Math.floor((rect.height - 120) / lineHeight) // 给输入行留更多空间

  if (cols !== terminalSize.cols || rows !== terminalSize.rows) {
    terminalSize.cols = Math.max(cols, 60) // 最小列数增加到60
    terminalSize.rows = Math.max(rows, 15) // 最小行数增加到15

    // 发送窗口大小变化
    if (isConnected.value) {
      sendMessage('terminal_resize', {
        cols: terminalSize.cols,
        rows: terminalSize.rows
      })
    }
  }
}

// 光标闪烁
let cursorInterval: number | null = null
const startCursorBlink = () => {
  cursorInterval = setInterval(() => {
    cursorBlink.value = !cursorBlink.value
  }, 500)
}

const stopCursorBlink = () => {
  if (cursorInterval) {
    clearInterval(cursorInterval)
    cursorInterval = null
  }
}

// 监听 WebSocket 消息
watch(messages, (newMessages) => {
  const latestMessage = newMessages[newMessages.length - 1]
  if (!latestMessage) return

  handleWebSocketMessage(latestMessage)
}, { deep: true })

// 处理 WebSocket 消息
const handleWebSocketMessage = (message: WebSocketMessage) => {
  switch (message.type) {
    case 'terminal_connected':
      sessionId.value = message.sessionId || ''
      if (message.data) {
        terminalHistory.value.push(message.data)
      }
      // 设置初始提示符
      if (message.currentDirectory) {
        // 通过路径格式判断是否为Windows
        if (message.currentDirectory.includes('\\') || message.currentDirectory.match(/^[A-Z]:/)) {
          currentPrompt.value = `PS ${message.currentDirectory}> `
        } else {
          currentPrompt.value = `${message.currentDirectory}$ `
        }
      }
      scrollToBottom()
      break

    case 'terminal_data':
      if (message.data) {
        const data = message.data.toString()

        // 检测并更新提示符
        const lines = data.split('\n')
        for (const line of lines) {
          const trimmedLine = line.trim()

          // 检测PowerShell提示符
          if (trimmedLine.match(/^PS\s+.+>\s*$/)) {
            currentPrompt.value = trimmedLine + ' '
          }
          // 检测Linux/Unix提示符
          else if (trimmedLine.match(/^.+[@#$]\s*$/)) {
            currentPrompt.value = trimmedLine
          }
          // 检测包含路径的提示符
          else if (trimmedLine.includes(':') && (trimmedLine.includes('$') || trimmedLine.includes('>'))) {
            currentPrompt.value = trimmedLine + ' '
          }
        }

        // 直接将服务器输出添加到终端历史
        terminalHistory.value.push(data)
        scrollToBottom()
      }
      break

    case 'terminal_exit':
      terminalHistory.value.push(message.data || '终端已退出')
      isConnected.value = false
      ElMessage.warning('终端进程已退出')
      break

    case 'error':
      terminalHistory.value.push(`错误: ${message.data}`)
      ElMessage.error('终端错误')
      break
  }
}

// 监听连接状态变化
watch(wsConnected, (connected) => {
  if (connected) {
    startCursorBlink()
  } else {
    stopCursorBlink()
    isConnected.value = false
  }
})

// 组件生命周期
onMounted(() => {
  // 监听窗口大小变化
  window.addEventListener('resize', updateTerminalSize)
  updateTerminalSize()

  // 自动连接
  nextTick(() => {
    connectTerminal()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTerminalSize)
  stopCursorBlink()
  disconnectTerminal()
})
</script>

<template>
  <div class="terminal-view">
    <!-- 工具栏 -->
    <div class="terminal-toolbar">
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="connectTerminal" :disabled="isConnecting || isConnected">
          <i class="fas fa-plug"></i>
          {{ isConnected ? '已连接' : '连接终端' }}
        </button>

        <button class="btn btn-danger" @click="disconnectTerminal" :disabled="!isConnected">
          <i class="fas fa-times"></i>
          断开连接
        </button>

        <button class="btn btn-warning" @click="clearTerminal">
          <i class="fas fa-eraser"></i>
          清屏
        </button>
      </div>

      <div class="toolbar-right">
        <div class="status-indicator">
          <span class="status-dot" :class="{
            'connected': isConnected,
            'connecting': isConnecting,
            'disconnected': !isConnected && !isConnecting
          }"></span>
          <span class="status-text">
            {{ isConnecting ? '连接中...' : isConnected ? '已连接' : '未连接' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 终端容器 -->
    <div class="terminal-container" ref="terminalContainer">
      <div class="terminal-output" ref="terminalOutput">
        <div v-for="(line, index) in terminalHistory" :key="index" class="terminal-line"
          v-html="formatTerminalLine(line)"></div>
      </div>

      <!-- 命令输入行 -->
      <div class="terminal-input-line" v-if="isConnected">
        <span class="terminal-prompt">{{ currentPrompt }}</span>
        <input ref="terminalInput" v-model="currentCommand" class="terminal-input" @keydown="handleKeyDown"
          @paste="handlePaste" :disabled="!isConnected" autocomplete="off" spellcheck="false" />
        <span class="terminal-cursor" :class="{ blink: cursorBlink }">│</span>
      </div>
    </div>

    <!-- 会话信息面板 -->
    <div class="session-panel" v-if="showSessionPanel">
      <div class="panel-header">
        <h3>会话信息</h3>
        <button class="btn-close" @click="showSessionPanel = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="panel-content">
        <div class="session-info">
          <div class="info-item">
            <label>会话ID:</label>
            <span>{{ sessionId }}</span>
          </div>
          <div class="info-item">
            <label>连接时间:</label>
            <span>{{ formatDate(connectedAt) }}</span>
          </div>
          <div class="info-item">
            <label>服务器:</label>
            <span>{{ currentServer }}</span>
          </div>
          <div class="info-item">
            <label>终端大小:</label>
            <span>{{ terminalSize.cols }}x{{ terminalSize.rows }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #ffffff;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.terminal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #005a9e;
}

.btn-danger {
  background: #d73a49;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #b02a37;
}

.btn-warning {
  background: #f9826c;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #e8704b;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
}

.status-dot.connected {
  background: #28a745;
}

.status-dot.connecting {
  background: #ffc107;
  animation: pulse 1.5s infinite;
}

.status-dot.disconnected {
  background: #dc3545;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.terminal-output {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #1e1e1e;
  font-size: 14px;
  line-height: 1.4;
  font-family: 'Consolas', 'Monaco', 'Courier New', '微软雅黑', monospace;
}

.terminal-line {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 1.4em;
}

/* 特殊内容样式 */
.terminal-line:has-text("可用驱动器:") {
  color: #ffc107;
  font-weight: bold;
}

.terminal-line:has-text("提示:") {
  color: #28a745;
}

.terminal-input-line {
  display: flex;
  align-items: center;
  padding: 0 16px 16px;
  background: #1e1e1e;
}

.terminal-prompt {
  color: #4fc3f7;
  margin-right: 8px;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
}

.terminal-cursor {
  color: #ffffff;
  margin-left: 2px;
}

.terminal-cursor.blink {
  animation: blink 1s infinite;
}

@keyframes blink {

  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

.session-panel {
  position: absolute;
  top: 60px;
  right: 16px;
  width: 300px;
  background: #2d2d2d;
  border: 1px solid #3e3e3e;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #3e3e3e;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
}

.btn-close {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
}

.btn-close:hover {
  background: #3e3e3e;
}

.panel-content {
  padding: 16px;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.info-item label {
  color: #a0a0a0;
}

/* 滚动条样式 */
.terminal-output::-webkit-scrollbar {
  width: 8px;
}

.terminal-output::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminal-view {
    height: 100%;
  }

  .terminal-toolbar {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    padding: 8px;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }

  .btn {
    font-size: 11px;
    padding: 4px 8px;
  }

  .terminal-prompt {
    max-width: 120px;
    font-size: 12px;
  }

  .terminal-input {
    font-size: 12px;
  }

  .session-panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: auto;
    border-radius: 0;
  }
}
</style>
