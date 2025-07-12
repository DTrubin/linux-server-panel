/**
 * 任务调度相关类型定义
 */

// 任务状态
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// 任务类型
export type TaskType = 'shell' | 'backup' | 'maintenance' | 'custom'

// 任务优先级
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

// 任务触发类型
export type TriggerType = 'manual' | 'cron' | 'interval' | 'event'

// 基础任务信息
export interface Task {
  id: string
  name: string
  description?: string
  type: TaskType
  command: string
  arguments?: string[]
  workingDirectory?: string
  environment?: Record<string, string>
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
  updatedAt?: string
  createdBy: string
  enabled: boolean
  schedule?: TaskSchedule
}

// 任务调度信息
export interface TaskSchedule {
  id: string
  taskId: string
  triggerType: TriggerType
  cronExpression?: string
  interval?: number // 秒
  nextRunTime?: string
  lastRunTime?: string
  enabled: boolean
}

// 任务执行历史
export interface TaskExecution {
  id: string
  taskId: string
  status: TaskStatus
  startTime: string
  endTime?: string
  duration?: number // 秒
  exitCode?: number
  output?: string
  error?: string
  triggeredBy: string
}

// 批量任务
export interface BatchTask {
  id: string
  name: string
  description?: string
  tasks: string[] // 任务ID列表
  executeMode: 'parallel' | 'sequential'
  continueOnError: boolean
  status: TaskStatus
  createdAt: string
  updatedAt?: string
  createdBy: string
  enabled: boolean
}

// 批量任务执行
export interface BatchExecution {
  id: string
  batchTaskId: string
  status: TaskStatus
  startTime: string
  endTime?: string
  duration?: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  executions: TaskExecution[]
}

// 创建任务参数
export interface CreateTaskParams {
  name: string
  description?: string
  type: TaskType
  command: string
  arguments?: string[]
  workingDirectory?: string
  environment?: Record<string, string>
  priority?: TaskPriority
  schedule?: {
    triggerType: TriggerType
    cronExpression?: string
    interval?: number
  }
  enabled?: boolean
}

// 更新任务参数
export interface UpdateTaskParams {
  name?: string
  description?: string
  command?: string
  arguments?: string[]
  workingDirectory?: string
  environment?: Record<string, string>
  priority?: TaskPriority
  enabled?: boolean
}

// 任务执行参数
export interface ExecuteTaskParams {
  taskId: string
  arguments?: string[]
  environment?: Record<string, string>
}

// 任务查询参数
export interface TaskQueryParams {
  page?: number
  pageSize?: number
  status?: TaskStatus[]
  type?: TaskType[]
  priority?: TaskPriority[]
  keyword?: string
  createdBy?: string
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

// 任务列表响应
export interface TaskListResponse {
  tasks: Task[]
  total: number
  page: number
  pageSize: number
}

// 任务执行历史查询参数
export interface ExecutionQueryParams {
  taskId?: string
  status?: TaskStatus[]
  startTime?: string
  endTime?: string
  page?: number
  pageSize?: number
}

// 任务执行历史响应
export interface ExecutionListResponse {
  executions: TaskExecution[]
  total: number
  page: number
  pageSize: number
}

// 任务统计信息
export interface TaskStatistics {
  total: number
  running: number
  completed: number
  failed: number
  pending: number
  cancelled: number
  enabled: number
  disabled: number
}

// Cron 表达式验证结果
export interface CronValidation {
  valid: boolean
  error?: string
  nextRuns?: string[] // 下次运行时间列表
}
