import express from 'express';
import { authenticateToken } from '../middleware/routeInterceptors.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import monitorModule from '../websocket/monitor.js';

const { getSystemResources, performanceHistory } = monitorModule;

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取实时系统资源数据
 */
router.get('/resources', asyncHandler(async (req, res) => {
  const systemData = await getSystemResources()
  
  if (!systemData) {
    return res.status(500).json({
      success: false,
      message: '获取系统资源数据失败',
      code: 'GET_RESOURCES_FAILED'
    })
  }

  res.json({
    success: true,
    message: '获取系统资源成功',
    data: systemData
  })
}))

/**
 * 获取性能历史数据
 */
router.get('/performance', asyncHandler(async (req, res) => {
  const { period = '1h' } = req.query
  
  // 根据时间段过滤数据
  let dataPoints = 60 // 默认1小时的数据
  switch (period) {
    case '5m':
      dataPoints = 10
      break
    case '15m':
      dataPoints = 30
      break
    case '30m':
      dataPoints = 60
      break
    case '1h':
      dataPoints = 60
      break
    case '6h':
      dataPoints = 60
      break
    default:
      dataPoints = 60
  }

  const performance = {
    cpu: performanceHistory.cpu.slice(-dataPoints),
    memory: performanceHistory.memory.slice(-dataPoints),
    disk: performanceHistory.disk.slice(-dataPoints),
    network: {
      in: performanceHistory.network.in.slice(-dataPoints),
      out: performanceHistory.network.out.slice(-dataPoints)
    },
    period: period,
    interval: '500ms',
    dataPoints: Math.min(dataPoints, performanceHistory.cpu.length)
  }

  res.json({
    success: true,
    message: '获取性能历史数据成功',
    data: performance
  })
}))

/**
 * 获取系统状态摘要
 */
router.get('/status', asyncHandler(async (req, res) => {
  const systemData = await getSystemResources()
  
  if (!systemData) {
    return res.status(500).json({
      success: false,
      message: '获取系统状态失败',
      code: 'GET_STATUS_FAILED'
    })
  }

  // 计算系统健康状态
  const thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    disk: { warning: 85, critical: 95 }
  }

  const alerts = []
  let overallStatus = 'healthy'

  // 检查CPU
  if (systemData.cpu.usage > thresholds.cpu.critical) {
    alerts.push('CPU使用率过高')
    overallStatus = 'critical'
  } else if (systemData.cpu.usage > thresholds.cpu.warning && overallStatus !== 'critical') {
    alerts.push('CPU使用率告警')
    overallStatus = 'warning'
  }

  // 检查内存
  if (systemData.memory.usage > thresholds.memory.critical) {
    alerts.push('内存使用率过高')
    overallStatus = 'critical'
  } else if (systemData.memory.usage > thresholds.memory.warning && overallStatus !== 'critical') {
    alerts.push('内存使用率告警')
    if (overallStatus !== 'warning') overallStatus = 'warning'
  }

  // 检查磁盘
  if (systemData.disk.usage > thresholds.disk.critical) {
    alerts.push('磁盘空间不足')
    overallStatus = 'critical'
  } else if (systemData.disk.usage > thresholds.disk.warning && overallStatus !== 'critical') {
    alerts.push('磁盘空间告警')
    if (overallStatus !== 'warning') overallStatus = 'warning'
  }

  const status = {
    overall: overallStatus,
    uptime: systemData.uptime,
    hostname: systemData.hostname,
    os: systemData.os,
    kernel: systemData.kernel,
    cpu: {
      usage: systemData.cpu.usage,
      cores: systemData.cpu.cores,
      model: systemData.cpu.model,
      load: systemData.cpu.loadAverage[0]
    },
    memory: {
      usage: systemData.memory.usage,
      total: Math.round(systemData.memory.total / 1024 / 1024 / 1024 * 100) / 100, // GB
      used: Math.round(systemData.memory.used / 1024 / 1024 / 1024 * 100) / 100,
      available: Math.round(systemData.memory.available / 1024 / 1024 / 1024 * 100) / 100
    },
    disk: {
      usage: systemData.disk.usage,
      total: Math.round(systemData.disk.total / 1024 / 1024 / 1024 * 100) / 100, // GB
      used: Math.round(systemData.disk.used / 1024 / 1024 / 1024 * 100) / 100,
      free: Math.round(systemData.disk.free / 1024 / 1024 / 1024 * 100) / 100
    },
    alerts: alerts,
    timestamp: systemData.timestamp
  }

  res.json({
    success: true,
    message: '获取系统状态成功',
    data: status
  })
}))

/**
 * 获取网络统计信息
 */
router.get('/network', asyncHandler(async (req, res) => {
  const systemData = await getSystemResources()
  
  if (!systemData || !systemData.network.interfaces.length) {
    return res.status(500).json({
      success: false,
      message: '获取网络信息失败',
      code: 'GET_NETWORK_FAILED'
    })
  }

  const networkStats = {
    interfaces: systemData.network.interfaces.map(iface => ({
      name: iface.name,
      type: iface.type,
      status: iface.status,
      speed: iface.speed,
      bytesIn: iface.bytesIn,
      bytesOut: iface.bytesOut,
      packetsIn: iface.packetsIn,
      packetsOut: iface.packetsOut,
      errorsIn: iface.errorsIn,
      errorsOut: iface.errorsOut
    })),
    history: {
      in: performanceHistory.network.in.slice(-30), // 最近30个数据点
      out: performanceHistory.network.out.slice(-30)
    }
  }

  res.json({
    success: true,
    message: '获取网络统计成功',
    data: networkStats
  })
}))

/**
 * 获取详细的硬件信息
 */
router.get('/hardware', asyncHandler(async (req, res) => {
  const systemData = await getSystemResources()
  
  if (!systemData) {
    return res.status(500).json({
      success: false,
      message: '获取硬件信息失败',
      code: 'GET_HARDWARE_FAILED'
    })
  }

  const hardware = {
    cpu: {
      model: systemData.cpu.model,
      cores: systemData.cpu.cores,
      threads: systemData.cpu.threads,
      frequency: systemData.cpu.frequency,
      currentUsage: systemData.cpu.usage,
      loadAverage: systemData.cpu.loadAverage
    },
    memory: {
      total: systemData.memory.total,
      used: systemData.memory.used,
      free: systemData.memory.free,
      available: systemData.memory.available,
      cached: systemData.memory.cached,
      buffers: systemData.memory.buffers,
      usage: systemData.memory.usage
    },
    swap: systemData.swap,
    storage: {
      total: systemData.disk.total,
      used: systemData.disk.used,
      free: systemData.disk.free,
      usage: systemData.disk.usage,
      filesystems: systemData.disk.filesystems
    },
    network: systemData.network.interfaces,
    system: {
      hostname: systemData.hostname,
      os: systemData.os,
      kernel: systemData.kernel,
      uptime: systemData.uptime
    }
  }

  res.json({
    success: true,
    message: '获取硬件信息成功',
    data: hardware
  })
}))

export default router;
