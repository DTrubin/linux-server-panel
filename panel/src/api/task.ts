import axios from '@/utils/axios'
import type {
  Task,
  TaskSchedule,
  TaskExecution,
  BatchTask,
  BatchExecution,
  CreateTaskParams,
  UpdateTaskParams,
  ExecuteTaskParams,
  TaskQueryParams,
  TaskListResponse,
  ExecutionQueryParams,
  ExecutionListResponse,
  TaskStatistics,
  CronValidation
} from '@/types/task'

/**
 * 任务管理 API
 */

// 任务相关的 API 接口 (保持向后兼容)
export interface TaskResponse {
  tasks: Task[]
  total: number
}

/**
 * 基础任务 API
 */

// 获取任务列表
export const getTasks = async (params?: TaskQueryParams): Promise<any> => {
  try {
    const response = await axios.get('/tasks', {
      params
    })
    return response
  } catch (error) {
    console.error('获取任务列表失败:', error)
    throw error
  }
}

// 获取任务详情
export const getTaskDetails = async (id: string): Promise<Task> => {
  try {
    const response = await axios.get('/tasks/detail', {
      params: { id }
    })

    // 处理不同的响应格式
    if (response.data && typeof response.data === 'object') {
      if (response.data.success && response.data.data) {
        // 新格式：{ success: true, data: task }
        return response.data.data
      } else if (response.data.id) {
        // 旧格式：直接是任务对象
        return response.data
      }
    }

    throw new Error('任务详情响应格式错误')
  } catch (error) {
    console.error('获取任务详情失败:', error)
    throw error
  }
}

// 创建任务
export const createTask = async (params: CreateTaskParams): Promise<Task> => {
  try {
    const response = await axios.post('/tasks', params)
    console.log('创建任务响应:', response)

    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;

      // 检查是否是错误响应
      if (apiResponse.success === false) {
        throw new Error(apiResponse.message || '创建任务失败')
      }

      // 检查是否是成功响应，新格式：带有 success 标志和 data 字段
      if (apiResponse.success === true && apiResponse.data) {
        return apiResponse.data
      }

      // 标准axios响应格式
      if (apiResponse.data) {
        // 如果data中有success字段，说明是新格式
        if (apiResponse.data.success === false) {
          throw new Error(apiResponse.data.message || '创建任务失败')
        }
        if (apiResponse.data.success === true && apiResponse.data.data) {
          return apiResponse.data.data
        }
        // 否则直接返回data作为任务对象
        return apiResponse.data
      }

      // 直接是任务对象
      return apiResponse
    }
    throw new Error('响应格式错误')
  } catch (error) {
    console.error('创建任务失败:', error)
    // 如果error有message属性，使用它，否则使用默认消息
    if (error instanceof Error) {
      throw error
    } else if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message)
      } else if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error)
      }
    }
    throw new Error('创建任务失败')
  }
}

// 更新任务
export const updateTask = async (id: string, params: UpdateTaskParams): Promise<Task> => {
  try {
    const response = await axios.put('/tasks/update', {
      id,
      ...params
    })
    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;
      if (apiResponse.success === false) {
        throw new Error(apiResponse.message || '更新任务失败')
      }

      if (apiResponse.success && apiResponse.data) {
        return apiResponse.data
      } else if (apiResponse.data) {
        if (apiResponse.data.success && apiResponse.data.data) {
          return apiResponse.data.data
        }
        return apiResponse.data
      } else {
        return apiResponse
      }
    }
    throw new Error('响应格式错误')
  } catch (error) {
    console.error('更新任务失败:', error)
    if (error instanceof Error) {
      throw error
    } else if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message)
      }
    }
    throw new Error('更新任务失败')
  }
}

// 删除任务
export const deleteTask = async (id: string): Promise<void> => {
  try {
    const response = await axios.delete('/tasks/remove', {
      data: { id }
    })
    console.log('删除任务响应:', response)

    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;

      // 检查是否是错误响应
      if (apiResponse.success === false) {
        throw new Error(apiResponse.message || '删除任务失败')
      }

      // 检查data中的错误
      if (apiResponse.data && apiResponse.data.success === false) {
        throw new Error(apiResponse.data.message || '删除任务失败')
      }
    }
  } catch (error) {
    console.error('删除任务失败:', error)

    // 处理不同类型的错误
    if (error instanceof Error) {
      throw error
    } else if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message)
      } else if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error)
      } else if (axiosError.response?.status === 404) {
        throw new Error('任务不存在')
      } else if (axiosError.response?.status === 400) {
        throw new Error('无法删除正在运行的任务')
      }
    }
    throw new Error('删除任务失败')
  }
}

// 批量删除任务
export interface BatchDeleteResult {
  success: {
    id: string
    name: string
  }[]
  failed: {
    id: string
    name: string
    error: string
  }[]
  notFound: string[]
  running: {
    id: string
    name: string
  }[]
  remainingTasksCount: number
  totalRequested: number
  totalDeleted: number
}

export const batchDeleteTasks = async (taskIds: string[]): Promise<BatchDeleteResult> => {
  try {
    const response = await axios.delete('/tasks/batch', {
      data: { taskIds }
    })
    console.log('批量删除任务响应:', response)

    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;

      // 检查是否是错误响应
      if (apiResponse.success === false) {
        throw new Error(apiResponse.message || '批量删除任务失败')
      }

      // 返回详细的结果
      if (apiResponse.data) {
        if (apiResponse.data.success === false) {
          throw new Error(apiResponse.data.message || '批量删除任务失败')
        }
        return apiResponse.data
      }

      // 兼容旧格式
      return apiResponse
    }

    throw new Error('响应格式错误')
  } catch (error) {
    console.error('批量删除任务失败:', error)

    // 处理不同类型的错误
    if (error instanceof Error) {
      throw error
    } else if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message)
      } else if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error)
      } else if (axiosError.response?.status === 400) {
        throw new Error('请提供要删除的任务ID列表')
      }
    }
    throw new Error('批量删除任务失败')
  }
}

// 执行任务
export const executeTask = async (params: ExecuteTaskParams): Promise<any> => {
  try {
    const response = await axios.post('/tasks/execute', {
      id: params.taskId,
      arguments: params.arguments,
      environment: params.environment
    })

    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;

      // 检查是否是错误响应
      if (apiResponse.success === false) {
        throw new Error(apiResponse.message || '执行任务失败')
      }

      // 返回响应数据
      if (apiResponse.data) {
        if (apiResponse.data.success === false) {
          throw new Error(apiResponse.data.message || '执行任务失败')
        }
        return apiResponse.data
      }

      return apiResponse
    }

    throw new Error('响应格式错误')
  } catch (error) {
    console.error('执行任务失败:', error)
    if (error instanceof Error) {
      throw error
    } else if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message)
      }
    }
    throw new Error('执行任务失败')
  }
}

// 停止任务
export const stopTask = async (executionId: string): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post(`/tasks/executions/${executionId}/stop`)
    return response.data
  } catch (error) {
    console.error('停止任务失败:', error)
    throw error
  }
}

// 启用/禁用任务
export const toggleTaskEnabled = async (id: string, enabled: boolean): Promise<Task> => {
  try {
    // 使用更新任务接口来切换启用状态
    const response = await axios.put('/tasks/update', {
      id,
      enabled
    })

    // 处理响应格式
    if (response && response.data) {
      if (response.data.success && response.data.data) {
        return response.data.data
      } else if (response.data.id) {
        return response.data
      }
    }

    throw new Error('切换任务状态响应格式错误')
  } catch (error) {
    console.error('切换任务状态失败:', error)
    if (error instanceof Error) {
      throw error
    } else if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message)
      }
    }
    throw new Error('切换任务状态失败')
  }
}

/**
 * 任务调度 API
 */

// 获取任务调度信息
export const getTaskSchedule = async (taskId: string): Promise<TaskSchedule> => {
  try {
    const response = await axios.get<TaskSchedule>(`/tasks/${taskId}/schedule`)
    return response.data
  } catch (error) {
    console.error('获取任务调度信息失败:', error)
    throw error
  }
}

// 更新任务调度
export const updateTaskSchedule = async (taskId: string, schedule: Partial<TaskSchedule>): Promise<TaskSchedule> => {
  try {
    const response = await axios.put<TaskSchedule>(`/tasks/${taskId}/schedule`, schedule)
    return response.data
  } catch (error) {
    console.error('更新任务调度失败:', error)
    throw error
  }
}

// 验证 Cron 表达式
export const validateCronExpression = async (expression: string): Promise<CronValidation> => {
  try {
    const response = await axios.post<CronValidation>('/tasks/cron/validate', { expression })
    return response.data
  } catch (error) {
    console.error('验证 Cron 表达式失败:', error)
    throw error
  }
}

/**
 * 任务执行历史 API
 */

// 获取任务执行历史
export const getTaskExecutions = async (params?: ExecutionQueryParams): Promise<any> => {
  try {
    let url = '/tasks/executions/all'
    let requestParams: any = { ...params }

    if (params?.taskId) {
      url = '/tasks/executions'
      // 将 taskId 重命名为 id，这是后端期望的参数名
      requestParams = {
        id: params.taskId,
        page: params.page,
        pageSize: params.pageSize,
        status: params.status
      }
    }

    const response = await axios.get(url, {
      params: requestParams
    })

    // 处理响应格式
    if (response && response.data) {
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      return response.data
    }

    return response
  } catch (error) {
    console.error('获取任务执行历史失败:', error)
    throw error
  }
}

// 获取执行详情
export const getExecutionDetails = async (executionId: string): Promise<TaskExecution> => {
  try {
    const response = await axios.get<TaskExecution>(`/tasks/executions/${executionId}`)
    return response.data
  } catch (error) {
    console.error('获取执行详情失败:', error)
    throw error
  }
}

// 获取执行日志
export const getExecutionLog = async (executionId: string): Promise<{ output: string; error?: string }> => {
  try {
    const response = await axios.get(`/tasks/executions/${executionId}/log`)
    return response.data
  } catch (error) {
    console.error('获取执行日志失败:', error)
    throw error
  }
}

// 清理执行历史
export const cleanupExecutionHistory = async (
  olderThan: string,
  taskId?: string
): Promise<{ deletedCount: number }> => {
  try {
    const response = await axios.delete('/tasks/executions/cleanup', {
      params: { olderThan, taskId }
    })
    return response.data
  } catch (error) {
    console.error('清理执行历史失败:', error)
    throw error
  }
}

/**
 * 批量任务 API
 */

// 获取批量任务列表
export const getBatchTasks = async (): Promise<BatchTask[]> => {
  try {
    const response = await axios.get<BatchTask[]>('/tasks/batch')
    return response.data
  } catch (error) {
    console.error('获取批量任务列表失败:', error)
    throw error
  }
}

// 获取批量任务详情
export const getBatchTaskDetails = async (id: string): Promise<BatchTask> => {
  try {
    const response = await axios.get<BatchTask>(`/tasks/batch/${id}`)
    return response.data
  } catch (error) {
    console.error('获取批量任务详情失败:', error)
    throw error
  }
}

// 创建批量任务
export const createBatchTask = async (batchTask: Omit<BatchTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<BatchTask> => {
  try {
    const response = await axios.post<BatchTask>('/tasks/batch', batchTask)
    return response.data
  } catch (error) {
    console.error('创建批量任务失败:', error)
    throw error
  }
}

// 更新批量任务
export const updateBatchTask = async (id: string, batchTask: Partial<BatchTask>): Promise<BatchTask> => {
  try {
    const response = await axios.put<BatchTask>(`/tasks/batch/${id}`, batchTask)
    return response.data
  } catch (error) {
    console.error('更新批量任务失败:', error)
    throw error
  }
}

// 删除批量任务
export const deleteBatchTask = async (id: string): Promise<void> => {
  try {
    await axios.delete(`/tasks/batch/${id}`)
  } catch (error) {
    console.error('删除批量任务失败:', error)
    throw error
  }
}

// 执行批量任务
export const executeBatchTask = async (id: string): Promise<BatchExecution> => {
  try {
    const response = await axios.post<BatchExecution>(`/tasks/batch/${id}/execute`)
    return response.data
  } catch (error) {
    console.error('执行批量任务失败:', error)
    throw error
  }
}

// 获取批量任务执行历史
export const getBatchExecutions = async (batchTaskId?: string): Promise<BatchExecution[]> => {
  try {
    const response = await axios.get<BatchExecution[]>('/tasks/batch/executions', {
      params: batchTaskId ? { batchTaskId } : {}
    })
    return response.data
  } catch (error) {
    console.error('获取批量任务执行历史失败:', error)
    throw error
  }
}

/**
 * 任务统计 API
 */

// 获取任务统计信息
export const getTaskStatistics = async (): Promise<any> => {
  try {
    const response = await axios.get('/tasks/statistics/overview')
    return response
  } catch (error) {
    console.error('获取任务统计信息失败:', error)
    throw error
  }
}

// 获取任务执行趋势数据
export const getTaskExecutionTrend = async (
  timeRange: '7d' | '30d' | '90d' = '7d'
): Promise<{ date: string; success: number; failed: number }[]> => {
  try {
    const response = await axios.get('/tasks/statistics/trend', {
      params: { range: timeRange }
    })
    return response.data
  } catch (error) {
    console.error('获取任务执行趋势失败:', error)
    throw error
  }
}

/**
 * 任务模板 API
 */

// 获取任务模板列表
export const getTaskTemplates = async (): Promise<Task[]> => {
  try {
    const response = await axios.get<Task[]>('/tasks/templates')
    return response.data
  } catch (error) {
    console.error('获取任务模板失败:', error)
    throw error
  }
}

// 从模板创建任务
export const createTaskFromTemplate = async (templateId: string, params: Partial<CreateTaskParams>): Promise<Task> => {
  try {
    const response = await axios.post<Task>(`/tasks/templates/${templateId}/create`, params)
    return response.data
  } catch (error) {
    console.error('从模板创建任务失败:', error)
    throw error
  }
}
