/**
 * API 接口统一导出
 */

// 认证相关
export * from './auth'

// 文件管理
export * from './file'

// 服务器监控
export * from './server'

// 任务管理
export * from './task'

// 系统管理
export * from './system'

// 终端管理
export * from './terminal'

// 日志管理
export * from './logs'

// WebSocket
export * from './websocket'

// 类型定义导出 (避免重复导出)
export type {
  LoginParams,
  LoginResponse,
  UserInfoResponse,
  RefreshTokenResponse,
  UserInfo
} from '@/types/auth'

export type {
  FileItem,
  UploadParams,
  UploadResponse,
  FileOperationParams,
  FileOperationResponse,
  BackupTask,
  BackupRecord
} from '@/types/file'

export type {
  SystemInfo,
  SystemResources,
  SystemConfig,
  ProcessInfo,
  ServiceInfo,
  SystemAlert,
  MonitorConfig
} from '@/types/system'

export type {
  Task,
  TaskExecution,
  BatchTask,
  CreateTaskParams,
  TaskStatistics
} from '@/types/task'

export type { AppConfig } from '@/types/app'
