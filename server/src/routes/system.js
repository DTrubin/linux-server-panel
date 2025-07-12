import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

import { authenticateToken } from '../middleware/routeInterceptors.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { SystemConfigDAO, systemLogDAO, auditLogDAO } from '../database/dao.js';

const router = express.Router();
const execAsync = promisify(exec);

// 辅助函数：记录审计日志，包含错误处理
async function recordAuditLog(req, action, resource, details, level = 'info') {
  try {
    await auditLogDAO.create({
      user_id: req.user?.id || 'anonymous',
      action,
      resource,
      details,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      level
    });
  } catch (logError) {
    logger.error('记录审计日志失败，继续执行', logError);
    // 继续执行，不让审计日志记录失败影响主要功能
  }
}

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 获取系统配置
 */
router.get('/config', asyncHandler(async (req, res) => {
  const configs = await SystemConfigDAO.findAll()

  // 转换为对象格式
  const configObject = {}
  configs.forEach(config => {
    configObject[config.key] = config.value
  })

  res.json({
    success: true,
    message: '获取系统配置成功',
    data: configObject
  })
}))

/**
 * 更新系统配置
 */
router.put('/config', asyncHandler(async (req, res) => {
  const configUpdates = req.body

  const results = []

  for (const [key, value] of Object.entries(configUpdates)) {
    try {
      const config = await SystemConfigDAO.set(key, value)
      results.push({
        key,
        success: true,
        config
      })
    } catch (error) {
      results.push({
        key,
        success: false,
        error: error.message
      })
    }
  }

  // 记录审计日志
  await recordAuditLog(req, 'UPDATE_SYSTEM_CONFIG', 'system', {
    updates: configUpdates,
    results
  }, 'info')

  res.json({
    success: true,
    message: '系统配置更新完成',
    data: results
  })
}))

/**
 * 获取系统日志
 */
router.get('/logs', asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 50,
    level,
    category,
    startDate,
    endDate,
    search
  } = req.query

  const filters = {}
  if (level) filters.level = level
  if (category) filters.category = category
  // 这里简化处理，实际应该支持日期范围和搜索

  const result = await systemLogDAO.findAll(parseInt(page), parseInt(pageSize), filters)

  res.json({
    success: true,
    message: '获取系统日志成功',
    data: result
  })
}))

/**
 * 清理系统日志
 */
router.delete('/logs/cleanup', asyncHandler(async (req, res) => {
  const { daysToKeep = 30 } = req.body

  const deletedCount = await systemLogDAO.cleanup(daysToKeep)

  // 记录审计日志
  await recordAuditLog(req, 'CLEANUP_SYSTEM_LOGS', 'system', {
    daysToKeep,
    deletedCount
  }, 'info')

  res.json({
    success: true,
    message: '日志清理完成',
    data: {
      deletedCount,
      daysToKeep
    }
  })
}))

/**
 * 获取审计日志
 */
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 50,
    action,
    userId,
    startDate,
    endDate
  } = req.query

  const filters = {}
  if (action) filters.action = action
  if (userId) filters.user_id = userId

  const result = await auditLogDAO.findAll(parseInt(page), parseInt(pageSize), filters)

  res.json({
    success: true,
    message: '获取审计日志成功',
    data: result
  })
}))

/**
 * 清理审计日志
 */
router.delete('/audit-logs/cleanup', asyncHandler(async (req, res) => {
  const { daysToKeep = 90 } = req.body

  const deletedCount = await auditLogDAO.cleanup(daysToKeep)

  // 记录审计日志
  await recordAuditLog(req, 'CLEANUP_AUDIT_LOGS', 'system', {
    daysToKeep,
    deletedCount
  }, 'info')

  res.json({
    success: true,
    message: '审计日志清理完成',
    data: {
      deletedCount,
      daysToKeep
    }
  })
}))

/**
 * 系统重启
 */
router.post('/reboot', asyncHandler(async (req, res) => {
  const { delay = 0 } = req.body

  // 记录审计日志
  await recordAuditLog(req, 'SYSTEM_REBOOT', 'system', {
    delay
  }, 'warn')

  res.json({
    success: true,
    message: `系统将在 ${delay} 秒后重启`,
    data: {
      delay,
      scheduledTime: new Date(Date.now() + delay * 1000).toISOString()
    }
  })

  // 延迟执行重启命令
  setTimeout(async () => {
    try {
      await execAsync(`shutdown -r +${Math.ceil(delay / 60)}`) // 转换为分钟
    } catch (error) {
      logger.error('系统重启失败', { error: error.message, delay })
    }
  }, 1000)
}))

/**
 * 系统关机
 */
router.post('/shutdown', asyncHandler(async (req, res) => {
  const { delay = 0 } = req.body

  // 记录审计日志
  await recordAuditLog(req, 'SYSTEM_SHUTDOWN', 'system', {
    delay
  }, 'warn')

  res.json({
    success: true,
    message: `系统将在 ${delay} 秒后关机`,
    data: {
      delay,
      scheduledTime: new Date(Date.now() + delay * 1000).toISOString()
    }
  })

  // 延迟执行关机命令
  setTimeout(async () => {
    try {
      await execAsync(`shutdown -h +${Math.ceil(delay / 60)}`) // 转换为分钟
    } catch (error) {
      logger.error('系统关机失败', { error: error.message, delay })
    }
  }, 1000)
}))

/**
 * 取消系统重启/关机
 */
router.post('/cancel-shutdown', asyncHandler(async (req, res) => {
  try {
    await execAsync('shutdown -c')

    // 记录审计日志
    await recordAuditLog(req, 'CANCEL_SHUTDOWN', 'system', {}, 'info')

    res.json({
      success: true,
      message: '已取消系统关机/重启'
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '取消关机/重启失败',
    })
  }
}))

/**
 * 获取系统服务状态
 */
router.get('/services/:name/status', asyncHandler(async (req, res) => {
  const { name } = req.params

  try {
    const { stdout } = await execAsync(`systemctl is-active ${name}`)
    const isActive = stdout.trim() === 'active'

    const { stdout: enabledStatus } = await execAsync(`systemctl is-enabled ${name}`)
    const isEnabled = enabledStatus.trim() === 'enabled'

    res.json({
      success: true,
      message: '获取服务状态成功',
      data: {
        name,
        active: isActive,
        enabled: isEnabled,
        status: stdout.trim()
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取服务状态失败',
    })
  }
}))

/**
 * 启用系统服务
 */
router.post('/services/:name/enable', asyncHandler(async (req, res) => {
  const { name } = req.params

  try {
    await execAsync(`systemctl enable ${name}`)

    // 记录审计日志
    await recordAuditLog(req, 'ENABLE_SERVICE', 'system', {
      serviceName: name
    }, 'info')

    res.json({
      success: true,
      message: `服务 ${name} 已启用`
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '启用服务失败',
    })
  }
}))

/**
 * 禁用系统服务
 */
router.post('/services/:name/disable', asyncHandler(async (req, res) => {
  const { name } = req.params

  try {
    await execAsync(`systemctl disable ${name}`)

    // 记录审计日志
    await recordAuditLog(req, 'DISABLE_SERVICE', 'system', {
      serviceName: name
    }, 'info')

    res.json({
      success: true,
      message: `服务 ${name} 已禁用`
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '禁用服务失败',
    })
  }
}))

/**
 * 获取系统时间
 */
router.get('/time', asyncHandler(async (req, res) => {
  try {
    const { stdout: dateOutput } = await execAsync('date')
    const { stdout: uptimeOutput } = await execAsync('uptime')

    res.json({
      success: true,
      message: '获取系统时间成功',
      data: {
        current: new Date().toISOString(),
        local: dateOutput.trim(),
        uptime: uptimeOutput.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取系统时间失败',
    })
  }
}))

/**
 * 设置系统时间
 */
router.put('/time', asyncHandler(async (req, res) => {
  const { datetime, timezone } = req.body

  try {
    if (datetime) {
      await execAsync(`date -s "${datetime}"`)
    }

    if (timezone) {
      await execAsync(`timedatectl set-timezone ${timezone}`)
    }

    // 记录审计日志
    await recordAuditLog(req, 'SET_SYSTEM_TIME', 'system', {
      datetime,
      timezone
    }, 'info')

    res.json({
      success: true,
      message: '系统时间设置成功'
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '设置系统时间失败',
    })
  }
}))

/**
 * 获取系统信息摘要
 */
router.get('/info', asyncHandler(async (req, res) => {
  try {
    const [
      hostnameResult,
      kernelResult,
      uptimeResult,
      memResult,
      diskResult
    ] = await Promise.allSettled([
      execAsync('hostname'),
      execAsync('uname -r'),
      execAsync('uptime'),
      execAsync('free -h'),
      execAsync('df -h')
    ])

    const systemInfo = {
      hostname: hostnameResult.status === 'fulfilled' ? hostnameResult.value.stdout.trim() : 'unknown',
      kernel: kernelResult.status === 'fulfilled' ? kernelResult.value.stdout.trim() : 'unknown',
      uptime: uptimeResult.status === 'fulfilled' ? uptimeResult.value.stdout.trim() : 'unknown',
      memory: memResult.status === 'fulfilled' ? memResult.value.stdout : 'unknown',
      disk: diskResult.status === 'fulfilled' ? diskResult.value.stdout : 'unknown',
      timestamp: new Date().toISOString()
    }

    res.json({
      success: true,
      message: '获取系统信息成功',
      data: systemInfo
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取系统信息失败',
    })
  }
}))

/**
 * 系统健康检查
 */
router.get('/health', asyncHandler(async (req, res) => {
  const checks = []

  try {
    // CPU检查
    const { stdout: loadavg } = await execAsync('cat /proc/loadavg')
    const load = parseFloat(loadavg.split(' ')[0])
    checks.push({
      name: 'CPU Load',
      status: load < 2 ? 'healthy' : load < 4 ? 'warning' : 'critical',
      value: load,
      message: `System load: ${load}`
    })

    // 内存检查
    const { stdout: meminfo } = await execAsync('cat /proc/meminfo')
    const memTotal = parseInt(meminfo.match(/MemTotal:\s+(\d+)/)[1])
    const memFree = parseInt(meminfo.match(/MemFree:\s+(\d+)/)[1])
    const memUsage = ((memTotal - memFree) / memTotal) * 100

    checks.push({
      name: 'Memory Usage',
      status: memUsage < 80 ? 'healthy' : memUsage < 90 ? 'warning' : 'critical',
      value: Math.round(memUsage),
      message: `Memory usage: ${Math.round(memUsage)}%`
    })

    // 磁盘检查
    const { stdout: dfOutput } = await execAsync('df /')
    const diskUsage = parseInt(dfOutput.split('\n')[1].split(/\s+/)[4].replace('%', ''))

    checks.push({
      name: 'Root Disk Usage',
      status: diskUsage < 80 ? 'healthy' : diskUsage < 90 ? 'warning' : 'critical',
      value: diskUsage,
      message: `Root disk usage: ${diskUsage}%`
    })

  } catch (error) {
    checks.push({
      name: 'System Check',
      status: 'error',
      value: 0,
      message: `Health check failed: ${error.message}`
    })
  }

  const overallStatus = checks.some(c => c.status === 'critical') ? 'critical' :
    checks.some(c => c.status === 'warning') ? 'warning' :
      checks.some(c => c.status === 'error') ? 'error' : 'healthy'

  res.json({
    success: true,
    message: '系统健康检查完成',
    data: {
      overallStatus,
      checks,
      timestamp: new Date().toISOString()
    }
  })
}))

export default router;
