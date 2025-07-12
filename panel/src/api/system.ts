import axios from '@/utils/axios'
import type { AppConfig } from '@/types/app'
import type {
  SystemConfig,
  SystemUpdate,
  BackupConfig,
  MonitorConfig,
  SystemOperationParams,
  LogQueryParams,
  LogListResponse
} from '@/types/system'

/**
 * 应用配置 API (保持向后兼容)
 */

// 获取应用配置
export const getConfig = async (): Promise<{ data: AppConfig }> => {
  const response = await axios.get('/system/config')
  return response.data
}

// 保存应用配置
export const setConfig = async (config: AppConfig): Promise<void> => {
  await axios.post('/system/config', config)
}

/**
 * 系统管理 API
 */

/**
 * 系统配置 API
 */

// 获取系统配置
export const getSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const response = await axios.get<SystemConfig>('/system/config/system')
    return response.data
  } catch (error) {
    console.error('获取系统配置失败:', error)
    throw error
  }
}

// 更新系统配置
export const updateSystemConfig = async (config: Partial<SystemConfig>): Promise<SystemConfig> => {
  try {
    const response = await axios.put<SystemConfig>('/system/config/system', config)
    return response.data
  } catch (error) {
    console.error('更新系统配置失败:', error)
    throw error
  }
}

// 重置系统配置
export const resetSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const response = await axios.post<SystemConfig>('/system/config/reset')
    return response.data
  } catch (error) {
    console.error('重置系统配置失败:', error)
    throw error
  }
}

/**
 * 系统操作 API
 */

// 系统操作（重启、关机等）
export const executeSystemOperation = async (params: SystemOperationParams): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axios.post('/system/operation', params)
    return response.data
  } catch (error) {
    console.error('系统操作失败:', error)
    throw error
  }
}

// 重启系统
export const rebootSystem = async (delay: number = 0): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/system/reboot', { delay })
    return response.data
  } catch (error) {
    console.error('重启系统失败:', error)
    throw error
  }
}

// 关闭系统
export const shutdownSystem = async (delay: number = 0): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/system/shutdown', { delay })
    return response.data
  } catch (error) {
    console.error('关闭系统失败:', error)
    throw error
  }
}

// 取消重启/关机
export const cancelSystemOperation = async (): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/system/cancel-operation')
    return response.data
  } catch (error) {
    console.error('取消系统操作失败:', error)
    throw error
  }
}

/**
 * 系统更新 API
 */

// 检查系统更新
export const checkSystemUpdates = async (): Promise<SystemUpdate[]> => {
  try {
    const response = await axios.get<SystemUpdate[]>('/system/updates/check')
    return response.data
  } catch (error) {
    console.error('检查系统更新失败:', error)
    throw error
  }
}

// 安装系统更新
export const installSystemUpdates = async (packages?: string[]): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axios.post('/system/updates/install', { packages })
    return response.data
  } catch (error) {
    console.error('安装系统更新失败:', error)
    throw error
  }
}

// 获取更新历史
export const getUpdateHistory = async (): Promise<{
  id: string
  packages: string[]
  status: 'success' | 'failed' | 'in-progress'
  startTime: string
  endTime?: string
  error?: string
}[]> => {
  try {
    const response = await axios.get('/system/updates/history')
    return response.data
  } catch (error) {
    console.error('获取更新历史失败:', error)
    throw error
  }
}

/**
 * 系统清理 API
 */

// 清理系统垃圾
export const cleanupSystem = async (options: {
  cleanLogs?: boolean
  cleanTemp?: boolean
  cleanCache?: boolean
  cleanPackageCache?: boolean
}): Promise<{ success: boolean; freedSpace: number; details: string[] }> => {
  try {
    const response = await axios.post('/system/cleanup', options)
    return response.data
  } catch (error) {
    console.error('清理系统失败:', error)
    throw error
  }
}

// 获取垃圾文件大小预估
export const getCleanupPreview = async (): Promise<{
  logs: number
  temp: number
  cache: number
  packageCache: number
  total: number
}> => {
  try {
    const response = await axios.get('/system/cleanup/preview')
    return response.data
  } catch (error) {
    console.error('获取清理预览失败:', error)
    throw error
  }
}

/**
 * 备份配置 API
 */

// 获取备份配置
export const getBackupConfig = async (): Promise<BackupConfig> => {
  try {
    const response = await axios.get<BackupConfig>('/system/backup/config')
    return response.data
  } catch (error) {
    console.error('获取备份配置失败:', error)
    throw error
  }
}

// 更新备份配置
export const updateBackupConfig = async (config: Partial<BackupConfig>): Promise<BackupConfig> => {
  try {
    const response = await axios.put<BackupConfig>('/system/backup/config', config)
    return response.data
  } catch (error) {
    console.error('更新备份配置失败:', error)
    throw error
  }
}

// 测试备份配置
export const testBackupConfig = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axios.post('/system/backup/test')
    return response.data
  } catch (error) {
    console.error('测试备份配置失败:', error)
    throw error
  }
}

/**
 * 监控配置 API
 */

// 获取监控配置
export const getMonitorConfig = async (): Promise<MonitorConfig> => {
  try {
    const response = await axios.get<MonitorConfig>('/system/monitor/config')
    return response.data
  } catch (error) {
    console.error('获取监控配置失败:', error)
    throw error
  }
}

// 更新监控配置
export const updateMonitorConfig = async (config: Partial<MonitorConfig>): Promise<MonitorConfig> => {
  try {
    const response = await axios.put<MonitorConfig>('/system/monitor/config', config)
    return response.data
  } catch (error) {
    console.error('更新监控配置失败:', error)
    throw error
  }
}

// 测试告警通知
export const testAlertNotification = async (type: 'email' | 'webhook'): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axios.post('/system/monitor/test-alert', { type })
    return response.data
  } catch (error) {
    console.error('测试告警通知失败:', error)
    throw error
  }
}

/**
 * 系统日志 API
 */

// 获取系统日志
export const getSystemLogs = async (params?: LogQueryParams): Promise<LogListResponse> => {
  try {
    const response = await axios.get<LogListResponse>('/system/logs', {
      params
    })
    return response.data
  } catch (error) {
    console.error('获取系统日志失败:', error)
    throw error
  }
}

// 获取日志文件列表
export const getLogFiles = async (): Promise<{
  name: string
  path: string
  size: number
  modified: string
}[]> => {
  try {
    const response = await axios.get('/system/logs/files')
    return response.data
  } catch (error) {
    console.error('获取日志文件列表失败:', error)
    throw error
  }
}

// 下载日志文件
export const downloadLogFile = async (filePath: string): Promise<Blob> => {
  try {
    const response = await axios.get('/system/logs/download', {
      params: { path: filePath },
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('下载日志文件失败:', error)
    throw error
  }
}

// 清理日志
export const clearLogs = async (options: {
  olderThan?: string
  services?: string[]
  levels?: string[]
}): Promise<{ deletedCount: number; freedSpace: number }> => {
  try {
    const response = await axios.post('/system/logs/clear', options)
    return response.data
  } catch (error) {
    console.error('清理日志失败:', error)
    throw error
  }
}

/**
 * 时间和时区 API
 */

// 获取系统时间信息
export const getSystemTime = async (): Promise<{
  currentTime: string
  timezone: string
  ntpEnabled: boolean
  ntpServers: string[]
}> => {
  try {
    const response = await axios.get('/system/time')
    return response.data
  } catch (error) {
    console.error('获取系统时间失败:', error)
    throw error
  }
}

// 设置系统时区
export const setSystemTimezone = async (timezone: string): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/system/time/timezone', { timezone })
    return response.data
  } catch (error) {
    console.error('设置系统时区失败:', error)
    throw error
  }
}

// 同步系统时间
export const syncSystemTime = async (): Promise<{ success: boolean; time: string }> => {
  try {
    const response = await axios.post('/system/time/sync')
    return response.data
  } catch (error) {
    console.error('同步系统时间失败:', error)
    throw error
  }
}

/**
 * 主机名和网络配置 API
 */

// 设置主机名
export const setHostname = async (hostname: string): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/system/hostname', { hostname })
    return response.data
  } catch (error) {
    console.error('设置主机名失败:', error)
    throw error
  }
}

// 获取网络配置
export const getNetworkConfig = async (): Promise<{
  interfaces: {
    name: string
    type: string
    method: 'static' | 'dhcp'
    address?: string
    netmask?: string
    gateway?: string
    dns?: string[]
  }[]
}> => {
  try {
    const response = await axios.get('/system/network/config')
    return response.data
  } catch (error) {
    console.error('获取网络配置失败:', error)
    throw error
  }
}

// 更新网络配置
export const updateNetworkConfig = async (config: {
  interfaces: {
    name: string
    type: string
    method: 'static' | 'dhcp'
    address?: string
    netmask?: string
    gateway?: string
    dns?: string[]
  }[]
}): Promise<{ success: boolean }> => {
  try {
    const response = await axios.put('/system/network/config', config)
    return response.data
  } catch (error) {
    console.error('更新网络配置失败:', error)
    throw error
  }
}
