import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SystemResourceData, ResourceHistory } from '@/types/systemResource'
import { environmentManager } from '@/config/environment'

export const useSystemResourceStore = defineStore('systemResource', () => {
  // 当前系统资源数据
  const currentResource = ref<SystemResourceData>({
    cpu: {
      usage: 0,
      model: '未知型号',
      cores: 0,
      threads: 0,
      frequency: 0,
      loadAverage: []
    },
    memory: {
      usage: 0,
      total: 0,
      used: 0,
      available: 0,
      cached: 0,
      free: 0,
      buffers: 0
    },
    disk: {
      usage: 0,
      total: 0,
      used: 0,
      free: 0,
      filesystems: []
    },

    network: {
      interfaces: [{
        name: '未知接口',
        type: '未知类型',
        status: '未知状态',
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
        errorsIn: 0,
        errorsOut: 0
      }]
    },
    swap: {
      total: 0,
      used: 0,
      free: 0,
      usage: 0
    },
    timestamp: '0',
    hostname: 'unknown',
    os: 'unknown',
    kernel: 'unknown',
    uptime: 0
  })

  // 历史数据，用于图表绘制
  const resourceHistory = ref<ResourceHistory>({
    cpu: [],
    memory: [],
    disk: [],
    network: {
      rx: [],
      tx: []
    }
  })

  // WebSocket 连接状态
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref<string | null>(null)

  // WebSocket 实例
  let ws: WebSocket | null = null
  let reconnectTimer: number | null = null
  let heartbeatTimer: number | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  let isManualDisconnect = false // 标记是否为手动断开

  // 网络速度计算相关
  let lastNetworkData: { bytesIn: number; bytesOut: number; timestamp: number } | null = null

  // 从 sessionStorage 加载数据
  function loadFromSession() {
    try {
      const savedData = sessionStorage.getItem('systemResource')
      const savedHistory = sessionStorage.getItem('systemResourceHistory')

      if (savedData) {
        const parsedData = JSON.parse(savedData)
        // 验证数据结构
        if (parsedData && typeof parsedData === 'object') {
          currentResource.value = parsedData
        }
      }

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        // 验证历史数据结构
        if (parsedHistory &&
          Array.isArray(parsedHistory.cpu) &&
          Array.isArray(parsedHistory.memory) &&
          Array.isArray(parsedHistory.disk) &&
          parsedHistory.network &&
          Array.isArray(parsedHistory.network.rx) &&
          Array.isArray(parsedHistory.network.tx)) {
          resourceHistory.value = parsedHistory
        }
      }
    } catch (error) {
      console.error('从 sessionStorage 加载数据失败:', error)
      // 重置为默认值
      resourceHistory.value = {
        cpu: [],
        memory: [],
        disk: [],
        network: {
          rx: [],
          tx: []
        }
      }
    }
  }

  // 保存数据到 sessionStorage
  function saveToSession() {
    try {
      if (currentResource.value) {
        sessionStorage.setItem('systemResource', JSON.stringify(currentResource.value))
      }
      sessionStorage.setItem('systemResourceHistory', JSON.stringify(resourceHistory.value))
    } catch (error) {
      console.error('保存数据到 sessionStorage 失败:', error)
    }
  }

  // 更新历史数据
  function updateHistory(data: SystemResourceData) {
    try {
      const time = new Date(data.timestamp).toLocaleTimeString()
      const maxHistoryLength = 50 // 保持最近50个数据点

      // 更新 CPU 历史
      if (typeof data.cpu?.usage === 'number') {
        resourceHistory.value.cpu.push({ time, value: data.cpu.usage })
        if (resourceHistory.value.cpu.length > maxHistoryLength) {
          resourceHistory.value.cpu.shift()
        }
      }

      // 更新内存历史
      if (typeof data.memory?.usage === 'number') {
        resourceHistory.value.memory.push({ time, value: data.memory.usage })
        if (resourceHistory.value.memory.length > maxHistoryLength) {
          resourceHistory.value.memory.shift()
        }
      }

      // 更新磁盘历史
      if (typeof data.disk?.usage === 'number') {
        resourceHistory.value.disk.push({ time, value: data.disk.usage })
        if (resourceHistory.value.disk.length > maxHistoryLength) {
          resourceHistory.value.disk.shift()
        }
      }

      // 更新网络历史
      if (data.network?.interfaces?.[0]) {
        const primaryInterface = data.network.interfaces[0]
        const networkSpeeds = calculateNetworkSpeed(data)
        resourceHistory.value.network.rx.push({ time, value: networkSpeeds.speedIn })
        resourceHistory.value.network.tx.push({ time, value: networkSpeeds.speedOut })
        if (resourceHistory.value.network.rx.length > maxHistoryLength) {
          resourceHistory.value.network.rx.shift()
          resourceHistory.value.network.tx.shift()
        }
      }

      // 保存到 sessionStorage
      saveToSession()
    } catch (error) {
      console.error('更新历史数据失败:', error)
    }
  }

  // 建立 WebSocket 连接
  function connect() {
    if (isConnecting.value || isConnected.value) {
      return
    }

    isConnecting.value = true
    error.value = null
    isManualDisconnect = false // 重置手动断开标志

    try {
      // 使用环境管理器获取WebSocket地址
      const wsUrl = environmentManager.buildWebSocketUrl('/monitor/system-resources')

      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        isConnected.value = true
        isConnecting.value = false
        reconnectAttempts = 0
        error.value = null

        // 发送初始化请求
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'init_request',
            timestamp: new Date().toISOString()
          }))
        }

        // 开始心跳
        startHeartbeat()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          // 处理不同类型的消息
          switch (message.type) {
            case 'monitor_connected':
              break

            case 'system_status':
              // 更新当前系统资源数据
              if (message.data) {
                const data = message.data
                // 转换为前端期望的格式
                const systemResourceData: SystemResourceData = {
                  cpu: {
                    usage: data.cpu?.usage || 0,
                    model: data.cpu?.model || '',
                    cores: data.cpu?.cores || 0,
                    threads: data.cpu?.threads || 0,
                    frequency: data.cpu?.frequency || 0,
                    loadAverage: data.cpu?.loadAverage || []
                  },
                  memory: {
                    usage: data.memory?.usage || 0,
                    total: data.memory?.total || 0,
                    used: data.memory?.used || 0,
                    available: data.memory?.available || 0,
                    cached: data.memory?.cached || 0,
                    free: data.memory?.free || 0,
                    buffers: data.memory?.buffers || 0
                  },
                  disk: {
                    usage: data.disk?.usage || 0,
                    total: data.disk?.total || 0,
                    used: data.disk?.used || 0,
                    free: data.disk?.free || 0,
                    filesystems: data.disk?.filesystems || []
                  },
                  network: {
                    interfaces: data.network?.interfaces || []
                  },
                  swap: {
                    total: data.swap?.total || 0,
                    used: data.swap?.used || 0,
                    free: data.swap?.free || 0,
                    usage: data.swap?.usage || 0
                  },
                  timestamp: message.timestamp || new Date().toISOString(),
                  hostname: data.hostname || '',
                  os: data.os || '',
                  kernel: data.kernel || '',
                  uptime: data.uptime || 0
                }

                currentResource.value = systemResourceData
                updateHistory(systemResourceData)
              }
              break

            case 'performance_data':
              // 处理性能历史数据
              if (message.data) {
                // 可以选择是否使用服务器的历史数据来替换本地数据
              }
              break

            case 'alert':
              // 处理告警消息
              break

            case 'pong':
              // 处理心跳响应
              break

            default:
              console.warn('未知消息类型:', message.type)
          }

        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket 连接错误:', event)
        error.value = 'WebSocket 连接错误'
      }

      ws.onclose = (event) => {
        isConnected.value = false
        isConnecting.value = false
        stopHeartbeat()

        // 只有在非手动断开的情况下才进行自动重连
        if (!isManualDisconnect && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect()
        } else if (isManualDisconnect) {
          reconnectAttempts = 0 // 重置重连次数
        } else {
          error.value = '连接失败，已达到最大重试次数'
        }
      }

    } catch (err) {
      console.error('创建 WebSocket 连接失败:', err)
      isConnecting.value = false
      error.value = '创建连接失败'
    }
  }

  // 开始心跳
  function startHeartbeat() {
    // 清除之前的心跳定时器
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
    }

    // 每30秒发送一次心跳
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }))
      }
    }, 30000)
  }

  // 停止心跳
  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  // 计划重连
  function scheduleReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }

    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // 指数退避，最大30秒

    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }  // 断开连接
  function disconnect() {
    // 设置手动断开标志，防止自动重连
    isManualDisconnect = true

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (ws) {
      ws.close()
      ws = null
    }

    isConnected.value = false
    isConnecting.value = false
    reconnectAttempts = 0

    // 停止心跳
    stopHeartbeat()
  }

  // 清理历史数据（用于内存管理）
  function clearHistory() {
    resourceHistory.value = {
      cpu: [],
      memory: [],
      disk: [],
      network: {
        rx: [],
        tx: []
      }
    }

    // 清理 sessionStorage 中的历史数据
    try {
      sessionStorage.removeItem('systemResourceHistory')
    } catch (error) {
      console.error('清理 sessionStorage 历史数据失败:', error)
    }
  }

  // 重置所有状态（用于路由切换时的内存清理）
  function reset() {
    disconnect()
    clearHistory()
    error.value = null
  }

  // 获取指定类型的历史数据
  const getCpuHistory = computed(() => resourceHistory.value?.cpu || [])
  const getMemoryHistory = computed(() => resourceHistory.value?.memory || [])
  const getDiskHistory = computed(() => resourceHistory.value?.disk || [])
  const getNetworkHistory = computed(() => resourceHistory.value?.network || { rx: [], tx: [] })

  // 计算网络速度
  const computeSpeed = (rate: number) => {
    if (rate === 0) return '0 b/s'
    if (rate < 1024) return rate.toFixed(2) + ' b/s'
    rate /= 1024
    if (rate < 1024) return rate.toFixed(2) + ' kb/s'
    rate /= 1024
    if (rate < 1024) return rate.toFixed(2) + ' mb/s'
    rate /= 1024
    return rate.toFixed(2) + ' gb/s'
  }

  const getRxSpeed = computed(() => computeSpeed(getNetworkHistory.value.rx[getNetworkHistory.value.rx.length - 1]?.value ?? 0))
  const getTxSpeed = computed(() => computeSpeed(getNetworkHistory.value.tx[getNetworkHistory.value.tx.length - 1]?.value ?? 0))

  // 获取当前网络速度
  const getCurrentNetworkSpeed = computed(() => {
    if (!currentResource.value?.network.interfaces?.[0]) {
      return { speedIn: 0, speedOut: 0 }
    }
    return calculateNetworkSpeed(currentResource.value)
  })

  // 连接状态计算属性
  const connectionStatus = computed(() => {
    if (error.value) return { type: 'danger' as const, text: '连接异常' }
    if (isConnected.value) return { type: 'success' as const, text: '实时连接' }
    if (isConnecting.value) return { type: 'warning' as const, text: '连接中...' }
    return { type: 'info' as const, text: '未连接' }
  })

  // 计算网络传输速度
  function calculateNetworkSpeed(currentData: SystemResourceData) {
    const currentInterface = currentData.network.interfaces[0]
    if (!currentInterface || !lastNetworkData) {
      // 初始化或没有上一次数据
      if (currentInterface) {
        lastNetworkData = {
          bytesIn: currentInterface.bytesIn,
          bytesOut: currentInterface.bytesOut,
          timestamp: new Date(currentData.timestamp).getTime()
        }
      }
      return { speedIn: 0, speedOut: 0 }
    }

    const currentTime = new Date(currentData.timestamp).getTime()
    const timeDiff = (currentTime - lastNetworkData.timestamp) / 1000 // 转换为秒

    if (timeDiff <= 0) return { speedIn: 0, speedOut: 0 }

    const speedIn = Math.max(0, (currentInterface.bytesIn - lastNetworkData.bytesIn) / timeDiff)
    const speedOut = Math.max(0, (currentInterface.bytesOut - lastNetworkData.bytesOut) / timeDiff)

    // 更新最后一次的数据
    lastNetworkData = {
      bytesIn: currentInterface.bytesIn,
      bytesOut: currentInterface.bytesOut,
      timestamp: currentTime
    }

    return { speedIn, speedOut }
  }

  return {
    // 状态
    currentResource,
    resourceHistory,
    isConnected,
    isConnecting,
    error,

    // 计算属性
    getCpuHistory,
    getMemoryHistory,
    getDiskHistory,
    getNetworkHistory,
    getCurrentNetworkSpeed,
    connectionStatus,
    getRxSpeed,
    getTxSpeed,

    // 方法
    connect,
    disconnect,
    clearHistory,
    reset,
    loadFromSession,
    saveToSession
  }
})
