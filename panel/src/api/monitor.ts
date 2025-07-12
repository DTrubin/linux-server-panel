import request from '@/utils/axios'
import type { SystemResources } from '@/types/system'

/**
 * 监控相关API
 */

// 获取实时系统资源数据
export function getSystemResources() {
  return request<SystemResources>({
    url: '/monitor/resources',
    method: 'get'
  })
}

// 获取性能历史数据
export function getPerformanceHistory(period: '5m' | '15m' | '30m' | '1h' | '6h' = '1h') {
  return request({
    url: '/monitor/performance',
    method: 'get',
    params: { period }
  })
}

// 获取系统状态摘要
export function getSystemStatus() {
  return request({
    url: '/monitor/status',
    method: 'get'
  })
}

// 获取网络统计信息
export function getNetworkStats() {
  return request({
    url: '/monitor/network',
    method: 'get'
  })
}

// 获取详细硬件信息
export function getHardwareInfo() {
  return request({
    url: '/monitor/hardware',
    method: 'get'
  })
}
