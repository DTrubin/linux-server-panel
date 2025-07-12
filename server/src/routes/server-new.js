import express from 'express';
import si from 'systeminformation';
import { exec } from 'child_process';
import util from 'util';
import { authenticateToken } from '../middleware/routeInterceptors.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();
const execAsync = util.promisify(exec);

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取系统基础信息
 */
router.get('/info', asyncHandler(async (req, res) => {
  const [osInfo, cpu, mem] = await Promise.all([
    si.osInfo(),
    si.cpu(),
    si.mem()
  ])

  const uptimeInfo = await si.time()

  const systemInfo = {
    hostname: osInfo.hostname,
    platform: osInfo.platform,
    arch: osInfo.arch,
    release: osInfo.release,
    version: osInfo.build,
    uptime: uptimeInfo.uptime || 0,
    users: [], // 需要单独获取用户信息
    timezone: uptimeInfo.timezone,
    locale: osInfo.codepage
  }

  res.json({
    success: true,
    message: '获取系统信息成功',
    data: systemInfo
  })
}))

/**
 * 获取系统资源使用情况
 */
router.get('/resources', asyncHandler(async (req, res) => {
  const [cpu, mem, disk, network] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats()
  ])

  const systemResources = {
    cpu: {
      usage: Math.round(cpu.currentLoad || 0),
      cores: cpu.cpus?.length || 0,
      loadAverage: cpu.avgLoad || 0,
      processes: cpu.currentLoadUser || 0,
      system: cpu.currentLoadSystem || 0,
      idle: cpu.currentLoadIdle || 0
    },
    memory: {
      total: mem.total || 0,
      used: mem.used || 0,
      free: mem.free || 0,
      available: mem.available || 0,
      usage: Math.round(((mem.used || 0) / (mem.total || 1)) * 100),
      swap: {
        total: mem.swaptotal || 0,
        used: mem.swapused || 0,
        free: mem.swapfree || 0
      }
    },
    disk: disk.map(d => ({
      filesystem: d.fs || '',
      mount: d.mount || '',
      type: d.type || '',
      size: d.size || 0,
      used: d.used || 0,
      available: d.available || 0,
      usage: Math.round(((d.used || 0) / (d.size || 1)) * 100)
    })),
    network: network.map(n => ({
      interface: n.iface || '',
      rx_bytes: n.rx_bytes || 0,
      tx_bytes: n.tx_bytes || 0,
      rx_sec: n.rx_sec || 0,
      tx_sec: n.tx_sec || 0
    }))
  }

  res.json({
    success: true,
    message: '获取系统资源成功',
    data: systemResources
  })
}))

/**
 * 获取服务器状态
 */
router.get('/status', asyncHandler(async (req, res) => {
  const [cpu, mem, load, temps] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.currentLoad(),
    si.cpuTemperature()
  ])

  const serverStatus = {
    status: 'online',
    lastCheck: new Date().toISOString(),
    uptime: process.uptime(),
    load: {
      current: Math.round(cpu.currentLoad || 0),
      average: load.avgLoad || 0
    },
    memory: {
      usage: Math.round(((mem.used || 0) / (mem.total || 1)) * 100),
      total: mem.total || 0,
      used: mem.used || 0
    },
    temperature: {
      cpu: temps.main || 0,
      cores: temps.cores || []
    },
    processes: {
      total: 0, // 需要从进程列表获取
      running: 0,
      sleeping: 0
    }
  }

  res.json({
    success: true,
    message: '获取服务器状态成功',
    data: serverStatus
  })
}))

/**
 * 获取网络接口信息
 */
router.get('/network', asyncHandler(async (req, res) => {
  const [interfaces, stats] = await Promise.all([
    si.networkInterfaces(),
    si.networkStats()
  ])

  const networkInterfaces = interfaces.map(iface => {
    const stat = stats.find(s => s.iface === iface.iface) || {}

    return {
      name: iface.iface || '',
      type: iface.type || '',
      mac: iface.mac || '',
      ip4: iface.ip4 || '',
      ip6: iface.ip6 || '',
      state: iface.operstate || 'unknown',
      speed: iface.speed || 0,
      duplex: iface.duplex || '',
      mtu: iface.mtu || 0,
      rx_bytes: stat.rx_bytes || 0,
      tx_bytes: stat.tx_bytes || 0,
      rx_packets: stat.rx_packets || 0,
      tx_packets: stat.tx_packets || 0,
      rx_errors: stat.rx_errors || 0,
      tx_errors: stat.tx_errors || 0,
      rx_dropped: stat.rx_dropped || 0,
      tx_dropped: stat.tx_dropped || 0
    }
  })

  res.json({
    success: true,
    message: '获取网络接口成功',
    data: networkInterfaces
  })
}))

/**
 * 获取进程列表
 */
router.get('/processes', asyncHandler(async (req, res) => {
  const { page = 1, pageSize = 20, sortBy = 'cpu', sortOrder = 'desc', search } = req.query

  const processes = await si.processes()
  let processList = processes.list || []

  // 搜索过滤
  if (search) {
    const searchLower = search.toString().toLowerCase()
    processList = processList.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.command && p.command.toLowerCase().includes(searchLower)) ||
      (p.pid && p.pid.toString().includes(searchLower))
    )
  }

  // 排序
  if (sortBy) {
    processList.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal ? bVal.toLowerCase() : ''
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1
      } else {
        return aVal > bVal ? 1 : -1
      }
    })
  }

  // 分页
  const total = processList.length
  const totalPages = Math.ceil(total / pageSize)
  const offset = (page - 1) * pageSize
  const paginatedProcesses = processList.slice(offset, offset + pageSize)

  const formattedProcesses = paginatedProcesses.map(p => ({
    pid: p.pid || 0,
    name: p.name || '',
    command: p.command || '',
    cpu: Math.round((p.cpu || 0) * 100) / 100,
    memory: Math.round((p.mem || 0) * 100) / 100,
    priority: p.priority || 0,
    state: p.state || '',
    started: p.started || '',
    user: p.user || '',
    tty: p.tty || ''
  }))

  res.json({
    success: true,
    message: '获取进程列表成功',
    data: {
      processes: formattedProcesses,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages
      }
    }
  })
}))

/**
 * 获取服务列表
 */
router.get('/services', asyncHandler(async (req, res) => {
  const { status, search } = req.query

  const services = await si.services('*')
  let serviceList = services || []

  // 状态过滤
  if (status) {
    serviceList = serviceList.filter(s => s.state === status)
  }

  // 搜索过滤
  if (search) {
    const searchLower = search.toString().toLowerCase()
    serviceList = serviceList.filter(s =>
      (s.name && s.name.toLowerCase().includes(searchLower)) ||
      (s.displayName && s.displayName.toLowerCase().includes(searchLower))
    )
  }

  const formattedServices = serviceList.map(s => ({
    name: s.name || '',
    displayName: s.displayName || s.name || '',
    state: s.state || 'unknown',
    startType: s.startType || '',
    pid: s.pid || 0,
    cpu: s.cpu || 0,
    memory: s.mem || 0
  }))

  res.json({
    success: true,
    message: '获取服务列表成功',
    data: formattedServices
  })
}))

/**
 * 启动服务
 */
router.post('/services/:name/start', asyncHandler(async (req, res) => {
  const { name } = req.params

  // 这里需要根据系统类型使用不同的命令
  // 简化示例，实际需要更复杂的实现

  try {
    await execAsync(`systemctl start ${name}`)
    res.json({
      success: true,
      message: `服务 ${name} 启动成功`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `启动服务失败: ${error.message}`,
    })
  }
}))

/**
 * 停止服务
 */
router.post('/services/:name/stop', asyncHandler(async (req, res) => {
  const { name } = req.params

  try {
    await execAsync(`systemctl stop ${name}`)
    res.json({
      success: true,
      message: `服务 ${name} 停止成功`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `停止服务失败: ${error.message}`,
    })
  }
}))

/**
 * 重启服务
 */
router.post('/services/:name/restart', asyncHandler(async (req, res) => {
  const { name } = req.params

  try {
    await execAsync(`systemctl restart ${name}`)
    res.json({
      success: true,
      message: `服务 ${name} 重启成功`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `重启服务失败: ${error.message}`,
    })
  }
}))

/**
 * 获取系统告警
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  const [cpu, mem, disk, load] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.currentLoad()
  ])

  const alerts = []

  // CPU使用率告警
  if (cpu.currentLoad > 80) {
    alerts.push({
      id: 'cpu_high',
      type: 'warning',
      category: 'system',
      title: 'CPU使用率过高',
      message: `当前CPU使用率: ${Math.round(cpu.currentLoad)}%`,
      value: Math.round(cpu.currentLoad),
      threshold: 80,
      timestamp: new Date().toISOString()
    })
  }

  // 内存使用率告警
  const memUsage = (mem.used / mem.total) * 100
  if (memUsage > 85) {
    alerts.push({
      id: 'memory_high',
      type: 'warning',
      category: 'system',
      title: '内存使用率过高',
      message: `当前内存使用率: ${Math.round(memUsage)}%`,
      value: Math.round(memUsage),
      threshold: 85,
      timestamp: new Date().toISOString()
    })
  }

  // 磁盘使用率告警
  disk.forEach((d, index) => {
    const usage = (d.used / d.size) * 100
    if (usage > 90) {
      alerts.push({
        id: `disk_high_${index}`,
        type: 'error',
        category: 'storage',
        title: '磁盘空间不足',
        message: `${d.mount} 磁盘使用率: ${Math.round(usage)}%`,
        value: Math.round(usage),
        threshold: 90,
        timestamp: new Date().toISOString()
      })
    }
  })

  // 负载告警
  if (load.avgLoad > 2) {
    alerts.push({
      id: 'load_high',
      type: 'warning',
      category: 'system',
      title: '系统负载过高',
      message: `当前系统负载: ${load.avgLoad.toFixed(2)}`,
      value: load.avgLoad,
      threshold: 2,
      timestamp: new Date().toISOString()
    })
  }

  res.json({
    success: true,
    message: '获取系统告警成功',
    data: alerts
  })
}))

/**
 * 获取用户会话
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const users = await si.users()

  const sessions = users.map(user => ({
    user: user.user || '',
    terminal: user.tty || '',
    host: user.ip || 'local',
    loginTime: user.date || '',
    idleTime: user.idle || '',
    process: user.command || ''
  }))

  res.json({
    success: true,
    message: '获取用户会话成功',
    data: sessions
  })
}))

/**
 * 获取性能历史数据
 */
router.get('/performance/:duration', asyncHandler(async (req, res) => {
  const { duration } = req.params

  // 这里应该从持久化存储中获取历史数据
  // 简化示例，返回当前数据点
  const [cpu, mem] = await Promise.all([
    si.currentLoad(),
    si.mem()
  ])

  const now = new Date()
  const dataPoints = []

  // 模拟历史数据点（实际应该从数据库获取）
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000) // 5分钟间隔
    dataPoints.unshift({
      timestamp: timestamp.toISOString(),
      cpu: Math.round(cpu.currentLoad + Math.random() * 10 - 5),
      memory: Math.round(((mem.used / mem.total) * 100) + Math.random() * 5 - 2.5),
      network: {
        rx: Math.random() * 1000000,
        tx: Math.random() * 1000000
      }
    })
  }

  res.json({
    success: true,
    message: '获取性能历史成功',
    data: {
      duration,
      dataPoints
    }
  })
}))

/**
 * 终止进程
 */
router.delete('/processes/:pid', asyncHandler(async (req, res) => {
  const { pid } = req.params

  try {
    process.kill(parseInt(pid), 'SIGTERM')
    res.json({
      success: true,
      message: `进程 ${pid} 已终止`
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `终止进程失败: ${error.message}`,
    })
  }
}))

export default router;
