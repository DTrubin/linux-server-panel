/**
 * 系统管理相关类型定义
 */

// 系统信息
export interface SystemInfo {
  hostname: string
  os: string
  kernel: string
  architecture: string
  uptime: number
  bootTime: string
  timezone: string
  users: number
}

// 系统资源信息
export interface SystemResources {
  cpu: {
    cores: number
    threads: number
    model: string
    usage: number
    loadAverage: [number, number, number] // 1min, 5min, 15min
    frequency: number
  }
  memory: {
    total: number
    used: number
    free: number
    available: number
    buffers: number
    cached: number
    usage: number
  }
  swap: {
    total: number
    used: number
    free: number
    usage: number
  }
  disk: {
    total: number
    used: number
    free: number
    usage: number
    filesystems: FileSystemInfo[]
  }
  network: {
    interfaces: NetworkInterface[]
    totalBytesIn: number
    totalBytesOut: number
    packetsIn: number
    packetsOut: number
  }
}

// 网络接口信息
export interface NetworkInterface {
  name: string
  type: string
  status: 'up' | 'down'
  ipv4?: string
  ipv6?: string
  mac: string
  speed: number
  bytesIn: number
  bytesOut: number
  packetsIn: number
  packetsOut: number
  errorsIn: number
  errorsOut: number
}

// 文件系统信息
export interface FileSystemInfo {
  device: string
  mountPoint: string
  type: string
  total: number
  used: number
  available: number
  usage: number
  options: string[]
}

// 进程信息
export interface ProcessInfo {
  pid: number
  ppid: number
  name: string
  command: string
  user: string
  status: string
  cpu: number
  memory: number
  startTime: string
  runtime: number
}

// 服务信息
export interface ServiceInfo {
  name: string
  status: 'active' | 'inactive' | 'failed' | 'unknown'
  enabled: boolean
  description?: string
  loadState: string
  activeState: string
  subState: string
  mainPid?: number
  memory?: number
  since?: string
}

/**
 * 日志相关类型定义
 */

// 系统日志条目
export interface SystemLog {
  id?: string
  timestamp?: string
  created_at?: string
  level: string
  service?: string
  category?: string
  message: string
  details?: string | Record<string, any>
  raw?: boolean
}

// 日志查询参数
export interface LogQueryParams {
  page?: number
  pageSize?: number
  level?: string[] | string
  service?: string
  startTime?: string
  endTime?: string
  search?: string
}

// 流式日志查询参数
export interface StreamLogParams extends LogQueryParams {
  streamId?: string
  chunkSize?: number
  tailMode?: boolean
}

// 日志列表响应
export interface LogListResponse {
  logs: SystemLog[]
  total: number
  page: number
  pageSize: number
  eof?: boolean
  streamId?: string
  isStreaming?: boolean
  position?: number
  fileSize?: number
}

// 系统配置
export interface SystemConfig {
  timezone: string
  hostname: string
  autoUpdate: boolean
  autoBackup: boolean
  backupPath: string
  logLevel: string
  maxLogSize: number
  logRetentionDays: number
  sessionTimeout: number
  maxConcurrentSessions: number
  enableAuditLog: boolean
  enableFirewall: boolean
  allowedPorts: number[]
  sshConfig: {
    port: number
    allowRootLogin: boolean
    allowPasswordAuth: boolean
    maxAuthTries: number
  }
}

// 系统更新信息
export interface SystemUpdate {
  id: string
  package: string
  currentVersion: string
  availableVersion: string
  type: 'security' | 'bug-fix' | 'enhancement'
  priority: 'low' | 'medium' | 'high' | 'critical'
  size: number
  description: string
  changelog?: string
}

// 系统备份配置
export interface BackupConfig {
  enabled: boolean
  schedule: string
  path: string
  retention: number
  compression: boolean
  encryption: boolean
  includes: string[]
  excludes: string[]
}

// 监控配置
export interface MonitorConfig {
  enabled: boolean
  interval: number
  alerts: {
    cpuThreshold: number
    memoryThreshold: number
    diskThreshold: number
    loadThreshold: number
    networkThreshold: number
  }
  notifications: {
    email: boolean
    webhook: boolean
    emailTo: string[]
    webhookUrl: string
  }
}

// 系统操作参数
export interface SystemOperationParams {
  operation: 'reboot' | 'shutdown' | 'update' | 'cleanup'
  delay?: number
  force?: boolean
  packages?: string[]
}

// 进程查询参数
export interface ProcessQueryParams {
  search?: string
  user?: string
  status?: string
  sortBy?: 'pid' | 'name' | 'cpu' | 'memory' | 'startTime'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

// 进程列表响应
export interface ProcessListResponse {
  processes: ProcessInfo[]
  total: number
  page: number
  pageSize: number
}

// 服务查询参数
export interface ServiceQueryParams {
  search?: string
  status?: string[]
  enabled?: boolean
  sortBy?: 'name' | 'status' | 'enabled'
  sortOrder?: 'asc' | 'desc'
}

// 服务列表响应
export interface ServiceListResponse {
  services: ServiceInfo[]
  total: number
}

// 系统性能历史数据
export interface PerformanceHistory {
  timestamp: string
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
  load: number
}

// 系统告警
export interface SystemAlert {
  id: string
  level: 'info' | 'warning' | 'error' | 'critical'
  type: 'resource' | 'service' | 'security' | 'system'
  title: string
  message: string
  details?: string
  timestamp: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedAt?: string
}

// 用户会话信息
export interface UserSession {
  id: string
  user: string
  terminal: string
  host: string
  loginTime: string
  status: 'active' | 'idle' | 'disconnected'
  lastActivity?: string
}
