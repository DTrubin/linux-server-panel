import axios from '@/utils/axios'
import type {
  SystemInfo,
  SystemResources,
  NetworkInterface,
  ProcessInfo,
  ProcessQueryParams,
  ProcessListResponse,
  ServiceInfo,
  ServiceQueryParams,
  ServiceListResponse,
  SystemAlert,
  UserSession,
  PerformanceHistory
} from '@/types/system'

// 服务器状态类型 (保持向后兼容)
export interface ServerStatus {
  cpu: number
  memory: number
  disk: number
  load: number
  uptime: number
  network: {
    in: number
    out: number
  }
}

// 服务类型 (保持向后兼容)
export interface Service {
  name: string
  status: 'running' | 'stopped' | 'failed' | 'unknown'
  description?: string
  since?: string
}

// 告警类型 (保持向后兼容)
export interface Alert {
  level: 'critical' | 'warning' | 'info'
  message: string
  time: string
  service?: string
}

/**
 * 系统基础信息 API
 */

// 获取系统信息
export const getSystemInfo = async (): Promise<SystemInfo> => {
  try {
    const response = await axios.get<any>('/server/info') as any
    console.log('getSystemInfo API返回数据:', response) // 添加调试日志

    // 处理响应拦截器返回的数据格式
    if (response?.success && response?.data) {
      return response.data
    } else if (response?.hostname) {
      // 如果直接返回系统信息对象
      return response
    } else {
      throw new Error('无效的系统信息响应格式')
    }
  } catch (error) {
    console.error('获取系统信息失败:', error)
    throw error
  }
}

// 获取系统资源信息
export const getSystemResources = async (): Promise<SystemResources> => {
  try {
    const response = await axios.get<SystemResources>('/server/resources')
    return response.data
  } catch (error) {
    console.error('获取系统资源信息失败:', error)
    throw error
  }
}

// 获取服务器状态 (保持向后兼容)
export const getServerStatus = async (): Promise<ServerStatus> => {
  try {
    const response = await axios.get<ServerStatus>('/server/status')
    return response.data || {
      cpu: 0,
      memory: 0,
      disk: 0,
      load: 0,
      uptime: 0,
      network: {
        in: 0,
        out: 0
      }
    }
  } catch (error) {
    console.error('获取服务器状态失败:', error)
    throw error
  }
}

// 获取网络接口信息
export const getNetworkInterfaces = async (): Promise<NetworkInterface[]> => {
  try {
    const response = await axios.get<NetworkInterface[]>('/server/network')
    return response.data
  } catch (error) {
    console.error('获取网络接口信息失败:', error)
    throw error
  }
}

/**
 * 进程管理 API
 */

// 获取进程列表
export const getProcesses = async (params?: ProcessQueryParams): Promise<ProcessListResponse> => {
  try {
    const response = await axios.get<ProcessListResponse>('/server/processes', {
      params
    })
    return response.data
  } catch (error) {
    console.error('获取进程列表失败:', error)
    throw error
  }
}

// 获取进程详情
export const getProcessDetails = async (pid: number): Promise<ProcessInfo> => {
  try {
    const response = await axios.get<ProcessInfo>(`/server/processes/${pid}`)
    return response.data
  } catch (error) {
    console.error('获取进程详情失败:', error)
    throw error
  }
}

// 杀死进程
export const killProcess = async (pid: number, signal?: string): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/server/processes/kill', {
      pid,
      signal: signal || 'SIGTERM'
    })
    return response.data
  } catch (error) {
    console.error('杀死进程失败:', error)
    throw error
  }
}

/**
 * 服务管理 API
 */

// 获取服务列表
export const getServices = async (params?: ServiceQueryParams): Promise<ServiceListResponse> => {
  try {
    const response = await axios.get<ServiceListResponse>('/server/services', {
      params
    })
    return response.data
  } catch (error) {
    console.error('获取服务列表失败:', error)
    throw error
  }
}

// 获取服务详情
export const getServiceDetails = async (serviceName: string): Promise<ServiceInfo> => {
  try {
    const response = await axios.get<ServiceInfo>(`/server/services/${serviceName}`)
    return response.data
  } catch (error) {
    console.error('获取服务详情失败:', error)
    throw error
  }
}

// 控制服务
export const controlService = async (
  serviceName: string,
  action: 'start' | 'stop' | 'restart' | 'reload'
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await axios.post('/server/services/control', {
      service: serviceName,
      action
    })
    return response.data
  } catch (error) {
    console.error('控制服务失败:', error)
    throw error
  }
}

// 启用/禁用服务
export const toggleServiceEnabled = async (
  serviceName: string,
  enabled: boolean
): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post('/server/services/toggle', {
      service: serviceName,
      enabled
    })
    return response.data
  } catch (error) {
    console.error('切换服务状态失败:', error)
    throw error
  }
}

/**
 * 告警管理 API
 */

// 获取告警列表 (保持向后兼容)
export const getAlerts = async (): Promise<Alert[]> => {
  try {
    const response = await axios.get<Alert[]>('/server/alerts')
    return response.data
  } catch (error) {
    console.error('获取告警列表失败:', error)
    throw error
  }
}

// 获取系统告警
export const getSystemAlerts = async (): Promise<SystemAlert[]> => {
  try {
    const response = await axios.get<SystemAlert[]>('/server/alerts/system')
    return response.data
  } catch (error) {
    console.error('获取系统告警失败:', error)
    throw error
  }
}

// 确认告警
export const acknowledgeAlert = async (alertId: string): Promise<void> => {
  try {
    await axios.post(`/server/alerts/${alertId}/acknowledge`)
  } catch (error) {
    console.error('确认告警失败:', error)
    throw error
  }
}

// 解决告警
export const resolveAlert = async (alertId: string): Promise<void> => {
  try {
    await axios.post(`/server/alerts/${alertId}/resolve`)
  } catch (error) {
    console.error('解决告警失败:', error)
    throw error
  }
}

/**
 * 用户会话管理 API
 */

// 获取用户会话列表
export const getUserSessions = async (): Promise<UserSession[]> => {
  try {
    const response = await axios.get<UserSession[]>('/server/sessions')
    return response.data
  } catch (error) {
    console.error('获取用户会话失败:', error)
    throw error
  }
}

// 踢出用户会话
export const killUserSession = async (sessionId: string): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post(`/server/sessions/${sessionId}/kill`)
    return response.data
  } catch (error) {
    console.error('踢出用户会话失败:', error)
    throw error
  }
}

/**
 * 性能监控 API
 */

// 获取性能历史数据
export const getPerformanceHistory = async (
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'
): Promise<PerformanceHistory[]> => {
  try {
    const response = await axios.get<PerformanceHistory[]>('/server/performance', {
      params: { range: timeRange }
    })
    return response.data
  } catch (error) {
    console.error('获取性能历史数据失败:', error)
    throw error
  }
}

// 获取实时性能数据
export const getRealtimePerformance = async (): Promise<SystemResources> => {
  try {
    const response = await axios.get<SystemResources>('/server/performance/realtime')
    return response.data
  } catch (error) {
    console.error('获取实时性能数据失败:', error)
    throw error
  }
}
