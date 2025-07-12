import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'

/**
 * 文件监听WebSocket处理器
 */
class FileWatcher {
  constructor() {
    this.watchers = new Map() // 存储文件监听器 
    this.clients = new Map() // 存储客户端连接
  }

  /**
   * 处理新的WebSocket连接
   */
  handleConnection(ws, request) {
    console.log('文件监听WebSocket客户端连接')

    // 生成客户端ID
    const clientId = Math.random().toString(36).substr(2, 9)
    this.clients.set(clientId, {
      ws,
      watchedFiles: new Set()
    })

    // 处理消息
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(clientId, message)
      } catch (error) {
        console.error('解析WebSocket消息失败:', error)
        this.sendError(ws, '消息格式错误')
      }
    })

    // 处理连接关闭
    ws.on('close', () => {
      console.log('文件监听WebSocket客户端断开连接')
      this.handleDisconnection(clientId)
    })

    // 处理错误
    ws.on('error', (error) => {
      console.error('文件监听WebSocket错误:', error)
      this.handleDisconnection(clientId)
    })
  }

  /**
   * 处理客户端消息
   */
  handleMessage(clientId, message) {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'watch_file':
        this.watchFile(clientId, message.data.path)
        break
      case 'unwatch_file':
        this.unwatchFile(clientId, message.data.path)
        break
      default:
        console.warn('未知的消息类型:', message.type)
    }
  }

  /**
   * 开始监听文件
   */
  watchFile(clientId, filePath) {
    const client = this.clients.get(clientId)
    if (!client) return

    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        this.sendError(client.ws, `文件不存在: ${filePath}`)
        return
      }

      // 检查是否已经在监听
      if (client.watchedFiles.has(filePath)) {
        console.log(`文件已在监听中: ${filePath}`)
        return
      }

      // 创建文件监听器
      const watcher = chokidar.watch(filePath, {
        persistent: true,
        usePolling: false,
        interval: 1000,
        ignoreInitial: true
      })

      // 监听文件变化事件
      watcher.on('change', (path, stats) => {
        this.handleFileChange(clientId, path, 'append', stats)
      })

      watcher.on('unlink', (path) => {
        this.handleFileChange(clientId, path, 'delete')
      })

      watcher.on('error', (error) => {
        console.error(`文件监听错误 ${filePath}:`, error)
        this.sendError(client.ws, `文件监听错误: ${error.message}`)
      })

      // 存储监听器
      const watcherKey = `${clientId}:${filePath}`
      this.watchers.set(watcherKey, watcher)
      client.watchedFiles.add(filePath)

      console.log(`开始监听文件: ${filePath}`)
      this.sendMessage(client.ws, {
        type: 'watch_started',
        path: filePath
      })

    } catch (error) {
      console.error('创建文件监听器失败:', error)
      this.sendError(client.ws, `创建文件监听器失败: ${error.message}`)
    }
  }

  /**
   * 停止监听文件
   */
  unwatchFile(clientId, filePath) {
    const client = this.clients.get(clientId)
    if (!client) return

    const watcherKey = `${clientId}:${filePath}`
    const watcher = this.watchers.get(watcherKey)

    if (watcher) {
      watcher.close()
      this.watchers.delete(watcherKey)
      client.watchedFiles.delete(filePath)
      console.log(`停止监听文件: ${filePath}`)
    }
  }

  /**
   * 处理文件变化
   */
  async handleFileChange(clientId, filePath, changeType, stats) {
    const client = this.clients.get(clientId)
    if (!client) return

    try {
      let changeData = {
        type: 'file_change',
        path: filePath,
        changeType,
        timestamp: new Date().toISOString()
      }

      if (changeType === 'append' && stats) {
        // 读取新增的内容（简化版本，实际应该记录上次读取的位置）
        try {
          const fileSize = stats.size
          // 这里简化处理，实际应该只读取新增部分
          const content = fs.readFileSync(filePath, 'utf8')
          const lines = content.split('\n')
          const newLines = lines.slice(-10) // 只发送最后10行作为示例

          changeData.content = newLines.join('\n')
          changeData.size = fileSize
        } catch (readError) {
          console.error('读取文件内容失败:', readError)
        }
      } else if (changeType === 'delete') {
        changeData.size = 0
      }

      this.sendMessage(client.ws, changeData)

    } catch (error) {
      console.error('处理文件变化失败:', error)
    }
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId)
    if (!client) return

    // 停止所有文件监听
    for (const filePath of client.watchedFiles) {
      this.unwatchFile(clientId, filePath)
    }

    // 删除客户端记录
    this.clients.delete(clientId)
  }

  /**
   * 发送消息给客户端
   */
  sendMessage(ws, data) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  /**
   * 发送错误消息
   */
  sendError(ws, message) {
    this.sendMessage(ws, {
      type: 'error',
      message
    })
  }

  /**
   * 清理所有资源
   */
  cleanup() {
    // 关闭所有监听器
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()

    // 清理客户端连接
    this.clients.clear()
  }
}

// 创建全局实例
const fileWatcher = new FileWatcher()

export default fileWatcher
