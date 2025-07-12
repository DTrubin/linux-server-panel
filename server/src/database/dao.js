/**
 * 数据访问对象 (DAO) 模块
 * 
 * 此模块提供了所有数据库操作的抽象层，包括：
 * - 基础 CRUD 操作
 * - 用户、角色、权限管理
 * - 任务和任务执行记录
 * - 系统日志和审计日志
 * - 系统配置和文件备份
 * 
 * 特点：
 * - 安全的日志记录（处理logger未初始化的情况）
 * - 统一的错误处理
 * - 分页查询支持
 * - 数据统计功能
 * 
 * @author Linux Server Panel
 * @version 1.0.0
 */

import database from './index.js';

const { db } = database;

// 安全的日志记录函数，处理logger可能未初始化的情况
const safeLog = {
  error: (...args) => {
    if (typeof global !== 'undefined' && global.logger && typeof global.logger.error === 'function') {
      global.logger.error(...args)
    } else {
      console.error('[DAO ERROR]', ...args)
    }
  },
  warn: (...args) => {
    if (typeof global !== 'undefined' && global.logger && typeof global.logger.warn === 'function') {
      global.logger.warn(...args)
    } else {
      console.warn('[DAO WARN]', ...args)
    }
  },
  info: (...args) => {
    if (typeof global !== 'undefined' && global.logger && typeof global.logger.info === 'function') {
      global.logger.info(...args)
    } else {
      console.info('[DAO INFO]', ...args)
    }
  },
  log: (...args) => {
    if (typeof global !== 'undefined' && global.logger && typeof global.logger.info === 'function') {
      global.logger.info(...args)
    } else {
      console.log('[DAO LOG]', ...args)
    }
  }
}

/**
 * 基础 DAO 类
 */
class BaseDAO {
  constructor(tableName) {
    this.tableName = tableName
  }

  async create(data) {
    try {
      return db.insert(this.tableName, data)
    } catch (error) {
      safeLog.error('创建记录失败', { tableName: this.tableName, error: error.message })
      throw error
    }
  }

  async findById(id) {
    try {
      return db.findById(this.tableName, id)
    } catch (error) {
      safeLog.error('通过ID查找记录失败', { tableName: this.tableName, id, error: error.message })
      throw error
    }
  }

  async findOne(condition) {
    try {
      return db.findOne(this.tableName, condition)
    } catch (error) {
      safeLog.error('查找单条记录失败', { tableName: this.tableName, condition, error: error.message })
      throw error
    }
  }

  async findMany(condition = {}) {
    try {
      return db.findMany(this.tableName, condition)
    } catch (error) {
      safeLog.error('查找多条记录失败', { tableName: this.tableName, condition, error: error.message })
      throw error
    }
  }

  async update(id, updates) {
    try {
      return db.update(this.tableName, id, updates)
    } catch (error) {
      safeLog.error('更新记录失败', { tableName: this.tableName, id, error: error.message })
      throw error
    }
  }

  async delete(id) {
    try {
      return db.delete(this.tableName, id)
    } catch (error) {
      safeLog.error('删除记录失败', { tableName: this.tableName, id, error: error.message })
      throw error
    }
  }

  async deleteMany(condition) {
    try {
      return db.deleteMany(this.tableName, condition)
    } catch (error) {
      safeLog.error('批量删除记录失败', { tableName: this.tableName, condition, error: error.message })
      throw error
    }
  }

  async paginate(page = 1, pageSize = 10, condition = {}) {
    try {
      return db.paginate(this.tableName, page, pageSize, condition)
    } catch (error) {
      safeLog.error('分页查询记录失败', { tableName: this.tableName, page, pageSize, condition, error: error.message })
      throw error
    }
  }

  async count(condition = {}) {
    try {
      return db.count(this.tableName, condition)
    } catch (error) {
      safeLog.error('统计记录失败', { tableName: this.tableName, condition, error: error.message })
      throw error
    }
  }
}

/**
 * 用户数据访问对象
 */
class UserDAO extends BaseDAO {
  constructor() {
    super('users')
  }

  async findByUsername(username) {
    return this.findOne({ username })
  }

  async findByEmail(email) {
    return this.findOne({ email })
  }

  async getActiveUsers() {
    return this.findMany({ is_active: true })
  }

  async updateLastLogin(userId, loginInfo) {
    return this.update(userId, {
      last_login: loginInfo.loginTime,
      last_login_ip: loginInfo.ip,
      updated_at: new Date().toISOString()
    })
  }
}

/**
 * 角色数据访问对象
 */
class RoleDAO extends BaseDAO {
  constructor() {
    super('roles')
  }

  async findByCode(code) {
    return this.findOne({ code })
  }

  async getActiveRoles() {
    return this.findMany({ is_active: true })
  }
}

/**
 * 权限数据访问对象
 */
class PermissionDAO extends BaseDAO {
  constructor() {
    super('permissions')
  }

  async findByCode(code) {
    return this.findOne({ code })
  }

  async getByCategory(category) {
    return this.findMany({ category })
  }
}

/**
 * 任务数据访问对象
 */
class TaskDAO extends BaseDAO {
  constructor() {
    super('tasks')
  }

  async findAll(page = 1, pageSize = 20, filters = {}) {
    return this.paginate(page, pageSize, filters)
  }

  async getActiveTasks() {
    return this.findMany({ is_active: true })
  }

  async getTasksByType(type) {
    return this.findMany({ type })
  }

  async getScheduledTasks() {
    return this.findMany({ schedule_type: { $ne: 'manual' } })
  }
}

/**
 * 任务执行记录数据访问对象
 */
class TaskExecutionDAO extends BaseDAO {
  constructor() {
    super('task_executions')
  }

  async getExecutionsByTaskId(taskId) {
    return this.findMany({ task_id: taskId })
  }

  async getRecentExecutions(limit = 50) {
    const executions = await this.findMany()
    return executions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
  }

  async getExecutionsByStatus(status) {
    return this.findMany({ status })
  }

  async getExecutionsInDateRange(startDate, endDate) {
    const executions = await this.findMany()
    return executions.filter(execution => {
      const executionDate = new Date(execution.created_at)
      return executionDate >= startDate && executionDate <= endDate
    })
  }
}

/**
 * 系统日志数据访问对象
 */
class SystemLogDAO extends BaseDAO {
  constructor() {
    super('system_logs')
  }

  async getLogsByLevel(level) {
    return this.findMany({ level })
  }

  async getLogsByCategory(category) {
    return this.findMany({ category })
  }

  async getRecentLogs(limit = 100) {
    const logs = await this.findMany()
    return logs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
  }

  async getLogsInDateRange(startDate, endDate) {
    const logs = await this.findMany()
    return logs.filter(log => {
      const logDate = new Date(log.created_at)
      return logDate >= startDate && logDate <= endDate
    })
  }

  async getLogsByIpAddress(ipAddress) {
    return this.findMany({ ip_address: ipAddress })
  }

  async getWebSocketLogs() {
    return this.findMany({ category: 'websocket' })
  }

  async getErrorLogs() {
    return this.findMany({ level: 'error' })
  }

  async getWarningLogs() {
    return this.findMany({ level: 'warning' })
  }

  /**
   * 分页查询系统日志
   * @param {number} page 页码
   * @param {number} pageSize 每页大小
   * @param {object} filters 过滤条件
   * @returns {object} 系统日志列表和总数
   */
  async findAll(page = 1, pageSize = 50, filters = {}) {
    try {
      // 构建查询条件
      const condition = {}

      if (filters.level) condition.level = filters.level
      if (filters.category) condition.category = filters.category

      // 获取所有日志先
      const allLogs = await this.findMany(condition)

      // 处理时间范围过滤
      let filteredLogs = allLogs
      if (filters.startDate || filters.endDate) {
        const startDate = filters.startDate ? new Date(filters.startDate) : new Date(0)
        const endDate = filters.endDate ? new Date(filters.endDate) : new Date()

        filteredLogs = allLogs.filter(log => {
          const logDate = new Date(log.created_at)
          return logDate >= startDate && logDate <= endDate
        })
      }

      // 排序：最新的在前
      filteredLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // 分页处理
      const total = filteredLogs.length
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedLogs = filteredLogs.slice(start, end)

      return {
        logs: paginatedLogs,
        total,
        page,
        pageSize
      }
    } catch (error) {
      safeLog.error('分页查询系统日志失败', { page, pageSize, filters, error: error.message })
      throw error
    }
  }

  async deleteOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const logs = await this.findMany()
    const oldLogs = logs.filter(log => new Date(log.created_at) < cutoffDate)

    let deleteCount = 0
    for (const log of oldLogs) {
      await this.delete(log.id)
      deleteCount++
    }

    return deleteCount
  }

  /**
   * 清理系统日志 (deleteOldLogs的别名方法)
   * @param {number} daysToKeep 保留的天数
   * @returns {number} 删除的日志数量
   */
  async cleanup(daysToKeep = 30) {
    return this.deleteOldLogs(daysToKeep)
  }

  async getLogStatistics() {
    const logs = await this.findMany()
    const stats = {
      total: logs.length,
      levels: {},
      categories: {},
      recent24h: 0,
      recentWeek: 0
    }

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    logs.forEach(log => {
      const logDate = new Date(log.created_at)

      // 按级别统计
      stats.levels[log.level] = (stats.levels[log.level] || 0) + 1

      // 按分类统计
      stats.categories[log.category] = (stats.categories[log.category] || 0) + 1

      // 时间范围统计
      if (logDate > oneDayAgo) {
        stats.recent24h++
      }
      if (logDate > oneWeekAgo) {
        stats.recentWeek++
      }
    })

    return stats
  }

  /**
   * 获取系统日志统计
   * @returns {object} 包含总数、24小时内和一周内日志数量的统计
   */
  async getStats() {
    try {
      const logs = await this.findMany()
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      let recent24h = 0
      let recentWeek = 0

      logs.forEach(log => {
        const logDate = new Date(log.created_at)
        if (logDate > oneDayAgo) {
          recent24h++
        }
        if (logDate > oneWeekAgo) {
          recentWeek++
        }
      })

      return {
        total: logs.length,
        recent24h,
        recentWeek
      }
    } catch (error) {
      safeLog.error('获取系统日志统计失败', { error: error.message })
      throw error;
    }
  }
}

/**
 * 审计日志数据访问对象
 */
class AuditLogDAO extends BaseDAO {
  constructor() {
    super('audit_logs')
  }

  async getLogsByUserId(userId) {
    return this.findMany({ user_id: userId })
  }

  async getLogsByAction(action) {
    return this.findMany({ action })
  }

  async getRecentAuditLogs(limit = 50) {
    const logs = await this.findMany()
    return logs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
  }

  async getAuditLogsInDateRange(startDate, endDate) {
    const logs = await this.findMany()
    return logs.filter(log => {
      const logDate = new Date(log.created_at)
      return logDate >= startDate && logDate <= endDate
    })
  }

  /**
   * 分页查询审计日志
   * @param {number} page 页码
   * @param {number} pageSize 每页大小
   * @param {object} filters 过滤条件
   * @returns {object} 审计日志列表和总数
   */
  async findAll(page = 1, pageSize = 50, filters = {}) {
    try {
      // 构建查询条件
      const condition = {}

      if (filters.user_id) condition.user_id = filters.user_id
      if (filters.action) condition.action = filters.action

      // 获取所有日志先
      const allLogs = await this.findMany(condition)

      // 处理时间范围过滤
      let filteredLogs = allLogs
      if (filters.startDate || filters.endDate) {
        const startDate = filters.startDate ? new Date(filters.startDate) : new Date(0)
        const endDate = filters.endDate ? new Date(filters.endDate) : new Date()

        filteredLogs = allLogs.filter(log => {
          const logDate = new Date(log.created_at)
          return logDate >= startDate && logDate <= endDate
        })
      }

      // 排序：最新的在前
      filteredLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      // 分页处理
      const total = filteredLogs.length
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedLogs = filteredLogs.slice(start, end)

      return {
        logs: paginatedLogs,
        total,
        page,
        pageSize
      }
    } catch (error) {
      safeLog.error('分页查询审计日志失败', { page, pageSize, filters, error: error.message })
      throw error
    }
  }

  /**
   * 获取审计日志统计（简化版）
   * @returns {object} 包含总数、24小时内和一周内日志数量的统计
   */
  async getStats() {
    try {
      const logs = await this.findMany()
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      let recent24h = 0
      let recentWeek = 0

      logs.forEach(log => {
        const logDate = new Date(log.created_at)
        if (logDate > oneDayAgo) {
          recent24h++
        }
        if (logDate > oneWeekAgo) {
          recentWeek++
        }
      })

      return {
        total: logs.length,
        recent24h,
        recentWeek
      }
    } catch (error) {
      safeLog.error('获取审计日志统计失败', { error: error.message })
      throw error;
    }
  }
}

/**
 * 系统配置数据访问对象
 */
class SystemConfigDAO extends BaseDAO {
  constructor() {
    super('system_config')
  }

  async getConfigByKey(key) {
    return this.findOne({ key })
  }

  async updateConfig(key, value) {
    const existing = await this.getConfigByKey(key)
    if (existing) {
      return this.update(existing.id, { value })
    } else {
      return this.create({ key, value })
    }
  }

  async getAllConfigs() {
    const configs = await this.findMany()
    const result = {}
    configs.forEach(config => {
      result[config.key] = config.value
    })
    return result
  }
}

/**
 * 文件备份数据访问对象
 */
class FileBackupDAO extends BaseDAO {
  constructor() {
    super('file_backups')
  }

  async getBackupsByPath(filePath) {
    return this.findMany({ file_path: filePath })
  }

  async getRecentBackups(limit = 20) {
    const backups = await this.findMany()
    return backups
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
  }

  async getBackupsByUserId(userId) {
    return this.findMany({ user_id: userId })
  }

  async deleteOldBackups(daysToKeep = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const backups = await this.findMany()
    const oldBackups = backups.filter(backup => new Date(backup.created_at) < cutoffDate)

    let deleteCount = 0
    for (const backup of oldBackups) {
      await this.delete(backup.id)
      deleteCount++
    }

    return deleteCount
  }
}

// 创建实例
const userDAO = new UserDAO()
const roleDAO = new RoleDAO()
const permissionDAO = new PermissionDAO()
const taskDAO = new TaskDAO()
const taskExecutionDAO = new TaskExecutionDAO()
const systemLogDAO = new SystemLogDAO()

// 确保审计日志DAO正确初始化
let auditLogDAO

// 初始化审计日志DAO的函数
const initAuditLogDAO = () => {
  try {
    auditLogDAO = new AuditLogDAO()

    // 验证create方法是否存在
    if (!auditLogDAO.create) {
      safeLog.error('AuditLogDAO.create 方法不存在，使用备用实现')
      // 手动添加create方法
      auditLogDAO.create = async function (data) {
        try {
          if (db && db.insert) {
            return db.insert('audit_logs', data)
          }
          throw new Error('db.insert 方法不可用')
        } catch (error) {
          safeLog.error('审计日志记录失败:', error)
          throw error;
        }
      }
    }

    // 验证findAll方法是否存在
    if (!auditLogDAO.findAll) {
      safeLog.error('AuditLogDAO.findAll 方法不存在，使用备用实现')
      auditLogDAO.findAll = async function (page = 1, pageSize = 50, filters = {}) {
        try {
          const allLogs = await this.findMany({}) || []
          return { logs: allLogs, total: allLogs.length, page, pageSize }
        } catch (error) {
          safeLog.error('查询审计日志失败:', error)
          throw error;
        }
      }
    }

    // 验证cleanup方法是否存在
    if (!auditLogDAO.cleanup) {
      safeLog.error('AuditLogDAO.cleanup 方法不存在，使用备用实现')
      auditLogDAO.cleanup = async function (daysToKeep = 30) {
        try {
          safeLog.info(`清理${daysToKeep}天前的审计日志`)
          const allLogs = await this.findMany({}) || []
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

          let deletedCount = 0
          const remainingLogs = allLogs.filter(log => {
            const logDate = new Date(log.created_at || log.timestamp)
            if (logDate < cutoffDate) {
              deletedCount++
              return false // 过滤掉旧的日志
            }
            return true // 保留新的日志
          })

          // 更新数据库
          if (db && db.data && db.data['audit_logs']) {
            db.data['audit_logs'] = remainingLogs
            db.saveTable('audit_logs')
          }

          return deletedCount
        } catch (error) {
          safeLog.error('清理审计日志失败:', error)
          throw error;
        }
      }
    }

    // 验证getStats方法是否存在
    if (!auditLogDAO.getStats) {
      auditLogDAO.getStats = async function () {
        try {
          const logs = await this.findMany() || []
          const now = new Date()
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

          let recent24h = 0
          let recentWeek = 0

          logs.forEach(log => {
            const logDate = new Date(log.created_at)
            if (logDate > oneDayAgo) {
              recent24h++
            }
            if (logDate > oneWeekAgo) {
              recentWeek++
            }
          })

          return {
            total: logs.length,
            recent24h,
            recentWeek
          }
        } catch (error) {
          safeLog.error('获取审计日志统计失败:', error)
          throw error;
        }
      }
    }

  } catch (error) {
    safeLog.error('初始化审计日志DAO失败，使用备用实现', error)
    throw error;
  }
}

// 立即初始化审计日志DAO
initAuditLogDAO()

const systemConfigDAO = new SystemConfigDAO()
const fileBackupDAO = new FileBackupDAO()

export {
  BaseDAO,
  UserDAO,
  RoleDAO,
  PermissionDAO,
  TaskDAO,
  TaskExecutionDAO,
  SystemLogDAO,
  AuditLogDAO,
  SystemConfigDAO,
  FileBackupDAO,
  userDAO,
  roleDAO,
  permissionDAO,
  taskDAO,
  taskExecutionDAO,
  systemLogDAO,
  auditLogDAO,
  systemConfigDAO,
  fileBackupDAO
}
