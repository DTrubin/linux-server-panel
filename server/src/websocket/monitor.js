import si from 'systeminformation';

// 存储监控WebSocket连接
const monitorConnections = new Map()

// 性能数据历史记录 (最近60个数据点) 
export const performanceHistory = {
  cpu: [],
  memory: [],
  disk: [],
  network: {
    in: [],
    out: []
  }
}

// 监控间隔ID
let monitorInterval = null

/**
 * 获取系统资源数据
 */
export async function getSystemResources() {
  try {
    const [cpu, mem, disk, network, load, osInfo] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.currentLoad(),
      si.osInfo()
    ])

    // 计算总磁盘使用率
    const totalDisk = disk.reduce((acc, d) => {
      acc.size += d.size || 0
      acc.used += d.used || 0
      return acc
    }, { size: 0, used: 0 })

    // 获取网络接口数据
    const primaryInterface = network.find(n => n.iface && !n.iface.includes('lo')) || network[0] || {}

    const systemResources = {
      cpu: {
        cores: cpu.cores || 0,
        threads: cpu.processors || 0,
        model: cpu.brand || 'Unknown',
        usage: Math.round(load.currentLoad || 0),
        loadAverage: [
          load.avgLoad || 0,
          load.avgLoad || 0,
          load.avgLoad || 0
        ],
        frequency: cpu.speed || 0
      },
      memory: {
        total: mem.total || 0,
        used: mem.used || 0,
        free: mem.free || 0,
        available: mem.available || 0,
        buffers: mem.buffcache || 0,
        cached: mem.cached || 0,
        usage: Math.round(((mem.used || 0) / (mem.total || 1)) * 100)
      },
      swap: {
        total: mem.swaptotal || 0,
        used: mem.swapused || 0,
        free: mem.swapfree || 0,
        usage: Math.round(((mem.swapused || 0) / (mem.swaptotal || 1)) * 100)
      },
      disk: {
        total: totalDisk.size,
        used: totalDisk.used,
        free: totalDisk.size - totalDisk.used,
        usage: Math.round((totalDisk.used / (totalDisk.size || 1)) * 100),
        filesystems: disk.map(d => ({
          filesystem: d.fs || '',
          mount: d.mount || '',
          type: d.type || '',
          size: d.size || 0,
          used: d.used || 0,
          available: d.available || 0,
          usage: Math.round(((d.used || 0) / (d.size || 1)) * 100)
        }))
      },
      network: {
        interfaces: [{
          name: primaryInterface.iface || 'eth0',
          type: 'ethernet',
          status: 'up',
          ipv4: '',
          ipv6: '',
          mac: '',
          speed: 1000,
          bytesIn: primaryInterface.rx_bytes || 0,
          bytesOut: primaryInterface.tx_bytes || 0,
          packetsIn: primaryInterface.rx_packets || 0,
          packetsOut: primaryInterface.tx_packets || 0,
          errorsIn: primaryInterface.rx_errors || 0,
          errorsOut: primaryInterface.tx_errors || 0
        }]
      },
      timestamp: new Date().toISOString(),
      hostname: osInfo.hostname || 'localhost',
      os: osInfo.distro || osInfo.platform || 'Unknown',
      kernel: osInfo.kernel || 'Unknown',
      uptime: osInfo.uptime || 0
    }

    return systemResources
  } catch (error) {
    wsLogger.error('获取系统资源失败', { error: error.message })
    return null
  }
}

/**
 * 更新性能历史数据
 */
function updatePerformanceHistory(systemData) {
  const maxPoints = 60
  const now = new Date().toLocaleTimeString()

  // CPU 数据
  performanceHistory.cpu.push({
    time: now,
    value: systemData.cpu.usage
  })
  if (performanceHistory.cpu.length > maxPoints) {
    performanceHistory.cpu.shift()
  }

  // 内存数据
  performanceHistory.memory.push({
    time: now,
    value: systemData.memory.usage
  })
  if (performanceHistory.memory.length > maxPoints) {
    performanceHistory.memory.shift()
  }

  // 磁盘数据
  performanceHistory.disk.push({
    time: now,
    value: systemData.disk.usage
  })
  if (performanceHistory.disk.length > maxPoints) {
    performanceHistory.disk.shift()
  }

  // 网络数据
  const networkInterface = systemData.network.interfaces[0]
  if (networkInterface) {
    performanceHistory.network.in.push({
      time: now,
      value: networkInterface.bytesIn
    })
    performanceHistory.network.out.push({
      time: now,
      value: networkInterface.bytesOut
    })

    if (performanceHistory.network.in.length > maxPoints) {
      performanceHistory.network.in.shift()
    }
    if (performanceHistory.network.out.length > maxPoints) {
      performanceHistory.network.out.shift()
    }
  }
}

/**
 * 检测系统异常并生成告警
 */
function checkSystemAlerts(systemData) {
  const alerts = []
  const thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 }
  }

  // CPU 告警
  if (systemData.cpu.usage > thresholds.cpu.critical) {
    alerts.push({
      id: `cpu-critical-${Date.now()}`,
      level: 'critical',
      title: 'CPU 使用率过高',
      message: `CPU 使用率已达到 ${systemData.cpu.usage.toFixed(1)}%，请立即检查系统负载`,
      timestamp: new Date().toISOString()
    })
  } else if (systemData.cpu.usage > thresholds.cpu.warning) {
    alerts.push({
      id: `cpu-warning-${Date.now()}`,
      level: 'warning',
      title: 'CPU 使用率告警',
      message: `CPU 使用率为 ${systemData.cpu.usage.toFixed(1)}%，建议检查系统负载`,
      timestamp: new Date().toISOString()
    })
  }

  // 内存告警
  if (systemData.memory.usage > thresholds.memory.critical) {
    alerts.push({
      id: `memory-critical-${Date.now()}`,
      level: 'critical',
      title: '内存使用率过高',
      message: `内存使用率已达到 ${systemData.memory.usage.toFixed(1)}%，系统可能出现性能问题`,
      timestamp: new Date().toISOString()
    })
  } else if (systemData.memory.usage > thresholds.memory.warning) {
    alerts.push({
      id: `memory-warning-${Date.now()}`,
      level: 'warning',
      title: '内存使用率告警',
      message: `内存使用率为 ${systemData.memory.usage.toFixed(1)}%，建议检查内存占用`,
      timestamp: new Date().toISOString()
    })
  }

  // 磁盘告警
  if (systemData.disk.usage > thresholds.disk.critical) {
    alerts.push({
      id: `disk-critical-${Date.now()}`,
      level: 'critical',
      title: '磁盘空间不足',
      message: `磁盘使用率已达到 ${systemData.disk.usage.toFixed(1)}%，请立即清理磁盘空间`,
      timestamp: new Date().toISOString()
    })
  } else if (systemData.disk.usage > thresholds.disk.warning) {
    alerts.push({
      id: `disk-warning-${Date.now()}`,
      level: 'warning',
      title: '磁盘空间告警',
      message: `磁盘使用率为 ${systemData.disk.usage.toFixed(1)}%，建议清理不必要的文件`,
      timestamp: new Date().toISOString()
    })
  }

  return alerts
}

/**
 * 广播消息给所有监控连接
 */
function broadcastToMonitorClients(message) {
  const messageStr = JSON.stringify(message)
  const messageSize = Buffer.byteLength(messageStr, 'utf8')
  let successCount = 0

  monitorConnections.forEach((connection, sessionId) => {
    if (connection.ws.readyState === connection.ws.OPEN) {
      try {
        connection.ws.send(messageStr)
        successCount++

        // 记录消息发送日志
        wsLogger.info('WebSocket message sent', {
          sessionId,
          type: message.type,
          size: messageSize
        });
      } catch (error) {
        wsLogger.error('发送监控数据失败', {
          sessionId,
          error: error.message,
          action: 'broadcast_send'
        });
        monitorConnections.delete(sessionId)
      }
    } else {
      wsLogger.info(`移除无效连接: ${sessionId}`)
      monitorConnections.delete(sessionId)
    }
  })

  // 记录广播日志
  if (successCount > 0) {
    wsLogger.info('WebSocket broadcast', {
      type: message.type,
      successCount,
      messageSize
    });
  }
}

/**
 * 开始监控数据收集
 */
function startMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
  }

  wsLogger.info('开始系统监控...')

  monitorInterval = setInterval(async () => {
    try {
      const systemData = await getSystemResources()
      if (!systemData) return

      // 更新历史数据
      updatePerformanceHistory(systemData)

      // 检测告警
      const alerts = checkSystemAlerts(systemData)

      // 广播系统状态
      broadcastToMonitorClients({
        type: 'system_status',
        data: systemData,
        timestamp: new Date().toISOString()
      })

      // 发送告警
      alerts.forEach(alert => {
        broadcastToMonitorClients({
          type: 'alert',
          data: alert,
          timestamp: new Date().toISOString()
        })
      })

      // 每5次发送一次历史数据
      if (performanceHistory.cpu.length % 5 === 0) {
        broadcastToMonitorClients({
          type: 'performance_data',
          data: {
            cpu: performanceHistory.cpu.slice(),
            memory: performanceHistory.memory.slice(),
            disk: performanceHistory.disk.slice(),
            network: {
              in: performanceHistory.network.in.slice(),
              out: performanceHistory.network.out.slice()
            }
          },
          timestamp: new Date().toISOString()
        })
      }

    } catch (error) {
      wsLogger.error('监控数据收集失败', { error: error.message })
    }
  }, 1000) // 1000ms 间隔，满足延迟要求
}

/**
 * 停止监控数据收集
 */
function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
    wsLogger.info('停止系统监控')
  }
}

/**
 * 处理监控WebSocket连接
 */
export function handleMonitorConnection(ws, req, parsedUrl) {
  const sessionId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  wsLogger.info(`创建监控会话: ${sessionId}`)

  // 记录连接建立日志
  wsLogger.info('WebSocket connection established', {
    sessionId,
    type: 'monitor',
    url: req.url,
    userAgent: req.headers['user-agent']
  });

  // 存储连接
  monitorConnections.set(sessionId, {
    ws: ws,
    sessionId: sessionId,
    createdAt: new Date(),
    lastPing: new Date()
  })

  // 如果这是第一个连接，开始监控
  if (monitorConnections.size === 1) {
    startMonitoring()
  }

  // 发送连接成功消息
  const welcomeMessage = {
    type: 'monitor_connected',
    data: {
      sessionId: sessionId,
      message: '监控连接已建立'
    },
    timestamp: new Date().toISOString()
  }

  const welcomeStr = JSON.stringify(welcomeMessage)
  ws.send(welcomeStr)

  // 记录欢迎消息发送
  wsLogger.info('WebSocket welcome message sent', {
    sessionId,
    type: 'monitor_connected',
    size: Buffer.byteLength(welcomeStr, 'utf8')
  });

  // 立即发送初始数据
  getSystemResources().then(systemData => {
    if (systemData && ws.readyState === ws.OPEN) {
      const systemMessage = {
        type: 'system_status',
        data: systemData,
        timestamp: new Date().toISOString()
      }

      const systemStr = JSON.stringify(systemMessage)
      ws.send(systemStr)

      // 记录系统数据发送
      wsLogger.info('WebSocket system status sent', {
        sessionId,
        type: 'system_status',
        size: Buffer.byteLength(systemStr, 'utf8')
      });

      // 发送历史数据
      if (performanceHistory.cpu.length > 0) {
        const historyMessage = {
          type: 'performance_data',
          data: {
            cpu: performanceHistory.cpu.slice(),
            memory: performanceHistory.memory.slice(),
            network: {
              in: performanceHistory.network.in.slice(),
              out: performanceHistory.network.out.slice()
            }
          },
          timestamp: new Date().toISOString()
        }

        const historyStr = JSON.stringify(historyMessage)
        ws.send(historyStr)

        // 记录历史数据发送
        wsLogger.info('WebSocket performance data sent', {
          sessionId,
          type: 'performance_data',
          size: Buffer.byteLength(historyStr, 'utf8')
        });
      }
    }
  }).catch(error => {
    wsLogger.error('WebSocket initial data send error', {
      sessionId,
      error: error.message,
      action: 'send_initial_data'
    });
  })

  // 处理WebSocket消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      const messageSize = Buffer.byteLength(data.toString(), 'utf8')

      // 记录消息接收日志
      wsLogger.info('WebSocket message received', {
        sessionId,
        type: message.type,
        size: messageSize
      });
      const connection = monitorConnections.get(sessionId)

      if (!connection) return

      switch (message.type) {
        case 'ping':
          connection.lastPing = new Date()
          const pongMessage = JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          })
          ws.send(pongMessage)

          // 记录心跳响应发送
          wsLogger.info('WebSocket pong sent', {
            sessionId,
            type: 'pong',
            size: Buffer.byteLength(pongMessage, 'utf8')
          })
          break

        case 'init_request':
          // 重新发送初始数据
          getSystemResources().then(systemData => {
            if (systemData && ws.readyState === ws.OPEN) {
              const initMessage = JSON.stringify({
                type: 'system_status',
                data: systemData,
                timestamp: new Date().toISOString()
              })
              ws.send(initMessage)

              // 记录初始数据发送
              wsLogger.info('WebSocket init data sent', {
                sessionId,
                type: 'system_status',
                size: Buffer.byteLength(initMessage, 'utf8')
              })
            }
          })
          break

        case 'refresh_request':
          // 立即获取并发送最新数据
          getSystemResources().then(systemData => {
            if (systemData && ws.readyState === ws.OPEN) {
              const refreshMessage = JSON.stringify({
                type: 'system_status',
                data: systemData,
                timestamp: new Date().toISOString()
              })
              ws.send(refreshMessage)

              // 记录刷新数据发送
              wsLogger.info('WebSocket refresh data sent', {
                sessionId,
                type: 'system_status',
                size: Buffer.byteLength(refreshMessage, 'utf8')
              })
            }
          })
          break

        default:
          wsLogger.warn('monitor', `未知的监控消息类型: ${message.type}`)
      }
    } catch (error) {
      wsLogger.error(`处理监控消息失败`, { sessionId, error: error.message })
    }
  })

  // 处理连接关闭
  ws.on('close', (code, reason) => {
    wsLogger.info(`监控会话 ${sessionId} 已关闭`)

    // 记录连接断开日志
    wsLogger.info('WebSocket disconnected', {
      sessionId,
      reason: `close_code_${code || 'unknown'}`
    });

    monitorConnections.delete(sessionId)

    // 如果没有连接了，停止监控
    if (monitorConnections.size === 0) {
      stopMonitoring()
    }
  })

  // 处理连接错误
  ws.on('error', (error) => {
    wsLogger.error(`监控会话错误`, { sessionId, error: error.message })

    // 记录连接错误日志
    wsLogger.error('WebSocket connection error', {
      sessionId,
      error: error.message,
      action: 'connection_error'
    });
    wsLogger.info('WebSocket disconnected', {
      sessionId,
      reason: `error: ${error.message}`
    });

    monitorConnections.delete(sessionId)

    if (monitorConnections.size === 0) {
      stopMonitoring()
    }
  })
}

/**
 * 获取活跃监控连接数
 */
export function getActiveMonitorConnections() {
  return monitorConnections.size
}

/**
 * 清理超时连接
 */
function cleanupStaleConnections() {
  const timeout = 60000 // 60秒超时
  const now = new Date()

  monitorConnections.forEach((connection, sessionId) => {
    if (now - connection.lastPing > timeout) {
      wsLogger.info(`清理超时监控连接: ${sessionId}`)

      // 记录超时断开日志
      wsLogger.info('WebSocket disconnected', {
        sessionId,
        reason: 'timeout'
      });

      connection.ws.close()
      monitorConnections.delete(sessionId)
    }
  })

  if (monitorConnections.size === 0) {
    stopMonitoring()
  }
}

/**
 * 清理所有监控连接
 */
export function cleanupAllMonitorConnections() {
  wsLogger.info(`正在清理所有监控连接，共 ${monitorConnections.size} 个连接`);

  monitorConnections.forEach((connection, sessionId) => {
    try {
      if (connection.ws.readyState === connection.ws.OPEN) {
        connection.ws.close(1000, 'Server shutting down');
      }
    } catch (error) {
      wsLogger.error('清理监控连接时出错', { sessionId, error: error.message });
    }
  });

  monitorConnections.clear();

  // 停止监控定时器
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }

  wsLogger.info('所有监控连接已清理完成');
}

// 定期清理超时连接
setInterval(cleanupStaleConnections, 30000) // 每30秒检查一次

export default {
  handleMonitorConnection,
  getActiveMonitorConnections,
  getSystemResources,
  performanceHistory,
  cleanupAllMonitorConnections
};
