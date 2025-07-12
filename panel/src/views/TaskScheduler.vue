<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import type {
  Task,
  TaskExecution,
  CreateTaskParams,
  UpdateTaskParams,
  TaskQueryParams,
  ExecutionQueryParams,
  TaskStatistics
} from '@/types/task'
import {
  getTasks,
  getTaskDetails,
  createTask,
  updateTask,
  deleteTask,
  batchDeleteTasks,
  executeTask,
  getTaskExecutions,
  getTaskStatistics
} from '@/api/task'

// 导入子组件
import TaskStatisticsComponent from '@/components/task-scheduler/TaskStatistics.vue'
import TaskFilters from '@/components/task-scheduler/TaskFilters.vue'
import TaskTable from '@/components/task-scheduler/TaskTable.vue'
import TaskDialog from '@/components/task-scheduler/TaskDialog.vue'
import TaskHistoryDialog from '@/components/task-scheduler/TaskHistoryDialog.vue'
import OutputDialog from '@/components/task-scheduler/OutputDialog.vue'

defineOptions({
  name: 'TaskScheduler'
})

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const historyLoading = ref(false)
const tasks = ref<Task[]>([])
const total = ref(0)
const selectedTasks = ref<Task[]>([])
const statistics = ref<TaskStatistics>({
  total: 0,
  running: 0,
  completed: 0,
  failed: 0,
  pending: 0,
  cancelled: 0,
  enabled: 0,
  disabled: 0
})

// 查询参数
const queryParams = reactive<TaskQueryParams>({
  page: 1,
  pageSize: 5, // 默认每页5条记录
  keyword: '',
  status: [],
  type: [],
  priority: [],
  sortBy: 'createdAt',
  sortOrder: 'desc'
})

// 对话框状态
const taskDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const outputDialogVisible = ref(false)
const isEditMode = ref(false)
const currentTaskId = ref('')

// 表单数据
const taskForm = reactive<CreateTaskParams & { schedule?: any }>({
  name: '',
  description: '',
  type: 'shell',
  command: '',
  arguments: [],
  workingDirectory: '',
  environment: {},
  priority: 'normal',
  enabled: true
})

// 执行历史相关
const executions = ref<TaskExecution[]>([])
const executionTotal = ref(0)
const executionQuery = reactive<ExecutionQueryParams>({
  page: 1,
  pageSize: 5
})
const selectedExecution = ref<TaskExecution>()
const activeOutputTab = ref('output')

// 计算属性已移至子组件

// 生命周期
onMounted(() => {
  loadTasks()
  loadStatistics()
})

// 方法
const loadTasks = async () => {
  try {
    loading.value = true
    const response = await getTasks(queryParams)

    // 安全地提取数据
    if (response && typeof response === 'object') {
      // 根据后端返回的实际数据结构进行处理
      // 使用类型断言处理API返回的实际结构
      const apiResponse = response as any;
      if (apiResponse.success && apiResponse.data && apiResponse.data.tasks) {
        // 成功响应，包含success标志和data字段
        tasks.value = apiResponse.data.tasks
        total.value = apiResponse.data.total || apiResponse.data.tasks.length
      } else if (response.tasks && Array.isArray(response.tasks)) {
        // 直接包含tasks字段（旧格式）
        tasks.value = response.tasks
        total.value = response.total || response.tasks.length
      } else {
        // 其他格式
        console.warn('响应中没有预期的tasks属性或格式不正确:', response)
        tasks.value = []
        total.value = 0
      }
    } else {
      throw new Error('响应格式错误')
    }
  } catch (error) {
    console.error('加载任务列表失败:', error)
    ElMessage.error('加载任务列表失败')
    // 设置默认值
    tasks.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const response = await getTaskStatistics()

    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;
      let statsData;

      if (apiResponse.success && apiResponse.data) {
        // 新格式：带有 success 标志和 data 字段
        statsData = apiResponse.data;
      } else {
        // 旧格式：直接是统计数据
        statsData = apiResponse;
      }

      statistics.value = statsData || {
        total: 0,
        running: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        cancelled: 0,
        enabled: 0,
        disabled: 0
      }
    }
  } catch (error) {
    console.error('加载统计信息失败:', error)
    // 设置默认值
    statistics.value = {
      total: 0,
      running: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      cancelled: 0,
      enabled: 0,
      disabled: 0
    }
  }
}

const refreshTasks = () => {
  loadTasks()
  loadStatistics()
}

const handleSearch = () => {
  queryParams.page = 1
  loadTasks()
}

// 分页大小改变处理
const handlePageSizeChange = (newPageSize: number) => {
  queryParams.pageSize = newPageSize
  queryParams.page = 1 // 重置到第一页
  loadTasks()
}

// 当前页改变处理
const handleCurrentPageChange = (newPage: number) => {
  queryParams.page = newPage
  loadTasks()
}

const handleSelectionChange = (selection: Task[]) => {
  selectedTasks.value = selection
}

// 批量操作方法
const handleBatchExecute = async () => {
  const enabledTasks = selectedTasks.value.filter(task => task.enabled && task.status !== 'running')

  if (enabledTasks.length === 0) {
    ElMessage.warning('没有可执行的任务')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要执行选中的 ${enabledTasks.length} 个任务吗？`,
      '批量执行确认',
      {
        confirmButtonText: '确定执行',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 并发执行多个任务
    const promises = enabledTasks.map(task => executeTask({ taskId: task.id }))
    await Promise.allSettled(promises)

    ElNotification({
      title: '批量执行',
      message: `已开始执行 ${enabledTasks.length} 个任务`,
      type: 'success'
    })

    loadTasks()
    loadStatistics()
    handleClearSelection()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('批量执行失败')
    }
  }
}

const handleBatchToggleStatus = async () => {
  const allEnabled = selectedTasks.value.every(task => task.enabled)
  const action = allEnabled ? '禁用' : '启用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}选中的 ${selectedTasks.value.length} 个任务吗？`,
      `批量${action}确认`,
      {
        confirmButtonText: `确定${action}`,
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 批量更新任务状态
    const promises = selectedTasks.value.map(task =>
      updateTask(task.id, { enabled: !allEnabled })
    )
    await Promise.allSettled(promises)

    ElMessage.success(`批量${action}成功`)
    loadTasks()
    loadStatistics()
    handleClearSelection()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`批量${action}失败`)
    }
  }
}

const handleBatchDelete = async () => {
  const runningTasks = selectedTasks.value.filter(task => task.status === 'running')

  if (runningTasks.length > 0) {
    ElMessage.warning(`有 ${runningTasks.length} 个任务正在运行，无法删除`)
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedTasks.value.length} 个任务吗？此操作不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    // 使用批量删除API - 一次请求删除所有任务
    const taskIds = selectedTasks.value.map(task => task.id)
    const result = await batchDeleteTasks(taskIds)

    // 构建详细的结果消息
    const messages = []
    if (result.totalDeleted > 0) {
      messages.push(`成功删除 ${result.totalDeleted} 个任务`)
    }
    if (result.failed.length > 0) {
      messages.push(`${result.failed.length} 个任务删除失败`)
    }
    if (result.notFound.length > 0) {
      messages.push(`${result.notFound.length} 个任务不存在`)
    }
    if (result.running.length > 0) {
      messages.push(`${result.running.length} 个任务正在运行`)
    }

    // 显示结果
    if (result.totalDeleted > 0) {
      if (result.failed.length === 0) {
        ElMessage.success(messages.join('，'))
      } else {
        ElNotification({
          title: '批量删除结果',
          message: messages.join('，'),
          type: 'warning',
          duration: 5000
        })
      }
    } else {
      ElMessage.error(messages.join('，'))
    }

    // 显示失败的任务详情
    if (result.failed.length > 0) {
      console.log('删除失败的任务:', result.failed)
    }

    loadTasks()
    loadStatistics()
    handleClearSelection()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      let errorMessage = '批量删除失败'
      if (error instanceof Error && error.message) {
        errorMessage = error.message
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message
      }
      ElMessage.error(errorMessage)
    }
  }
}

const handleClearSelection = () => {
  selectedTasks.value = []
}

const handleCreateTask = () => {
  isEditMode.value = false
  taskDialogVisible.value = true
}

const handleEditTask = async (task: Task) => {
  try {
    isEditMode.value = true
    currentTaskId.value = task.id

    console.log('开始编辑任务:', task.id)

    // 获取任务详情
    const taskDetail = await getTaskDetails(task.id)
    console.log('获取到任务详情:', taskDetail)

    // 填充表单
    Object.assign(taskForm, {
      name: taskDetail.name,
      description: taskDetail.description || '',
      type: taskDetail.type,
      command: taskDetail.command,
      arguments: taskDetail.arguments || [],
      workingDirectory: taskDetail.workingDirectory || '',
      environment: taskDetail.environment || {},
      priority: taskDetail.priority,
      enabled: taskDetail.enabled,
      schedule: taskDetail.schedule || undefined
    })

    taskDialogVisible.value = true
  } catch (error) {
    console.error('获取任务详情失败:', error)
    let errorMessage = '获取任务详情失败'
    if (error instanceof Error && error.message) {
      errorMessage = error.message
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message
    }
    ElMessage.error(errorMessage)
  }
}

const handleSaveTask = async (taskData: CreateTaskParams) => {
  try {
    saving.value = true

    if (isEditMode.value) {
      await updateTask(currentTaskId.value, taskData as UpdateTaskParams)
      ElMessage.success('任务更新成功')
    } else {
      await createTask(taskData)
      ElMessage.success('任务创建成功')
    }

    taskDialogVisible.value = false
    loadTasks()
    loadStatistics()
  } catch (error) {
    console.error('保存任务失败:', error)
    // 显示具体的错误信息
    let errorMessage = isEditMode.value ? '任务更新失败' : '任务创建失败'
    if (error instanceof Error && error.message) {
      errorMessage = error.message
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as any).message
    }
    ElMessage.error(errorMessage)
  } finally {
    saving.value = false
  }
}

const handleDeleteTask = async (task: Task) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务 "${task.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deleteTask(task.id)
    ElMessage.success('任务删除成功')
    loadTasks()
    loadStatistics()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('任务删除失败')
    }
  }
}

const handleExecuteTask = async (task: Task) => {
  try {
    await executeTask({ taskId: task.id })
    ElNotification({
      title: '任务执行',
      message: `任务 "${task.name}" 已开始执行`,
      type: 'success'
    })
    loadTasks()
    loadStatistics()
  } catch (error) {
    ElMessage.error('任务执行失败')
  }
}

const handleViewHistory = async (task: Task) => {
  currentTaskId.value = task.id
  executionQuery.taskId = task.id
  executionQuery.page = 1
  historyDialogVisible.value = true
  await loadExecutions()
}

const loadExecutions = async () => {
  try {
    historyLoading.value = true
    const response = await getTaskExecutions(executionQuery)
    console.log('执行历史响应:', response)

    // 处理不同的响应格式
    if (response && typeof response === 'object') {
      const apiResponse = response as any;

      if (apiResponse.success && apiResponse.data) {
        // 新格式：带有 success 标志和 data 字段
        executions.value = apiResponse.data.executions || []
        executionTotal.value = apiResponse.data.total || 0
      } else if (apiResponse.executions) {
        // 旧格式：直接包含 executions 字段
        executions.value = apiResponse.executions
        executionTotal.value = apiResponse.total || 0
      } else {
        // 未知格式
        executions.value = []
        executionTotal.value = 0
        console.warn('未识别的执行历史响应格式:', response)
      }
    }
  } catch (error) {
    console.error('加载执行历史失败:', error)
    ElMessage.error('加载执行历史失败')
    executions.value = []
    executionTotal.value = 0
  } finally {
    historyLoading.value = false
  }
}

const handleViewOutput = (execution: TaskExecution) => {
  selectedExecution.value = execution
  activeOutputTab.value = 'output'
  outputDialogVisible.value = true
}

// resetTaskForm 方法已移至 TaskDialog 组件

// 辅助方法已移至子组件
</script>

<template>
  <div class="task-scheduler">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>任务调度器</h2>
        <span class="page-desc">管理和调度系统任务</span>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleCreateTask" :icon="Plus">
          创建任务
        </el-button>
        <el-button @click="refreshTasks" :icon="Refresh" :loading="loading">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <TaskStatisticsComponent :statistics="statistics" />

    <!-- 筛选和搜索 -->
    <TaskFilters :query-params="queryParams" @search="handleSearch" />

    <!-- 任务列表 -->
    <TaskTable :tasks="tasks" :total="total" :loading="loading" :current-page="queryParams.page || 1"
      :page-size="queryParams.pageSize || 5" @selection-change="handleSelectionChange" @execute-task="handleExecuteTask"
      @view-history="handleViewHistory" @edit-task="handleEditTask" @delete-task="handleDeleteTask"
      @batch-execute="handleBatchExecute" @batch-toggle-status="handleBatchToggleStatus"
      @batch-delete="handleBatchDelete" @clear-selection="handleClearSelection"
      @update:current-page="handleCurrentPageChange" @update:page-size="handlePageSizeChange" />

    <!-- 创建/编辑任务对话框 -->
    <TaskDialog v-model:visible="taskDialogVisible" :is-edit-mode="isEditMode" :task-data="taskForm" :saving="saving"
      @save="handleSaveTask" />

    <!-- 执行历史对话框 -->
    <TaskHistoryDialog v-model:visible="historyDialogVisible" :executions="executions" :total="executionTotal"
      :loading="historyLoading" :current-page="executionQuery.page || 1" :page-size="executionQuery.pageSize || 5"
      @view-output="handleViewOutput" @page-change="loadExecutions" />

    <!-- 输出详情对话框 -->
    <OutputDialog v-model:visible="outputDialogVisible" :execution="selectedExecution" />
  </div>
</template>

<style scoped>
.task-scheduler {
  padding: 20px;
  background-color: #f5f5f5;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.page-desc {
  color: #909399;
  font-size: 14px;
  margin-left: 10px;
}

.header-right {
  display: flex;
  gap: 10px;
}
</style>
