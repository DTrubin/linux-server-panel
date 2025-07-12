<template>
  <el-card class="table-card">
    <!-- 批量操作工具栏 -->
    <div v-if="selectedTasks.length > 0" class="batch-operations">
      <div class="batch-info">
        <span>已选择 {{ selectedTasks.length }} 个任务</span>
      </div>
      <div class="batch-buttons">
        <el-button
          type="primary"
          size="small"
          @click="$emit('batch-execute')"
          :disabled="selectedTasks.some(task => task.status === 'running' || !task.enabled)"
          :icon="VideoPlay"
        >
          批量执行
        </el-button>
        <el-button
          type="warning"
          size="small"
          @click="$emit('batch-toggle-status')"
          :icon="Edit"
        >
          批量{{ selectedTasks.every(task => task.enabled) ? '禁用' : '启用' }}
        </el-button>
        <el-button
          type="danger"
          size="small"
          @click="$emit('batch-delete')"
          :icon="Delete"
        >
          批量删除
        </el-button>
        <el-button
          size="small"
          @click="$emit('clear-selection')"
        >
          取消选择
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="tasks"
      stripe
      height="400"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="任务名称" min-width="150">
        <template #default="{ row }">
          <div class="task-name">
            <span>{{ row.name }}</span>
            <el-tag
              v-if="!row.enabled"
              type="info"
              size="small"
              class="disabled-tag"
            >
              已禁用
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="100">
        <template #default="{ row }">
          <el-tag :type="getPriorityTagType(row.priority)" size="small">
            {{ getPriorityLabel(row.priority) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-tooltip content="执行任务" placement="top" :disabled="row.status === 'running' || !row.enabled">
              <el-button
                type="primary"
                size="small"
                circle
                @click="$emit('execute-task', row)"
                :disabled="row.status === 'running' || !row.enabled"
                :icon="VideoPlay"
              />
            </el-tooltip>
            <el-tooltip content="查看历史" placement="top">
              <el-button
                type="info"
                size="small"
                circle
                @click="$emit('view-history', row)"
                :icon="Clock"
              />
            </el-tooltip>
            <el-tooltip content="编辑任务" placement="top">
              <el-button
                type="warning"
                size="small"
                circle
                @click="$emit('edit-task', row)"
                :icon="Edit"
              />
            </el-tooltip>
            <el-tooltip content="删除任务" placement="top">
              <el-button
                type="danger"
                size="small"
                circle
                @click="$emit('delete-task', row)"
                :icon="Delete"
              />
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[5, 10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageSizeChange"
        @current-change="handleCurrentPageChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  VideoPlay,
  Clock,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import type {
  Task,
  TaskType,
  TaskStatus,
  TaskPriority
} from '@/types/task'

const props = defineProps<{
  tasks: Task[]
  total: number
  loading: boolean
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  (e: 'selection-change', tasks: Task[]): void
  (e: 'execute-task', task: Task): void
  (e: 'view-history', task: Task): void
  (e: 'edit-task', task: Task): void
  (e: 'delete-task', task: Task): void
  (e: 'batch-execute'): void
  (e: 'batch-toggle-status'): void
  (e: 'batch-delete'): void
  (e: 'clear-selection'): void
  (e: 'update:currentPage', page: number): void
  (e: 'update:pageSize', size: number): void
}>()

const selectedTasks = ref<Task[]>([])

// 监听页码变化，清空选择
watch(() => props.currentPage, () => {
  selectedTasks.value = []
})

const currentPage = ref(props.currentPage)
const pageSize = ref(props.pageSize)

watch(() => props.currentPage, (val) => {
  currentPage.value = val
})

watch(() => props.pageSize, (val) => {
  pageSize.value = val
})

watch(currentPage, (val) => {
  emit('update:currentPage', val)
})

watch(pageSize, (val) => {
  emit('update:pageSize', val)
})

const handleSelectionChange = (selection: Task[]) => {
  selectedTasks.value = selection
  emit('selection-change', selection)
}

const handlePageSizeChange = (newSize: number) => {
  emit('update:pageSize', newSize)
}

const handleCurrentPageChange = (newPage: number) => {
  emit('update:currentPage', newPage)
}

// 辅助方法
const getTypeLabel = (type: TaskType): string => {
  const labels = {
    shell: 'Shell脚本',
    backup: '备份任务',
    maintenance: '维护任务',
    custom: '自定义'
  }
  return labels[type] || type
}

const getTypeTagType = (type: TaskType): string => {
  const types = {
    shell: 'primary',
    backup: 'success',
    maintenance: 'warning',
    custom: 'info'
  }
  return types[type] || 'info'
}

const getStatusLabel = (status: TaskStatus): string => {
  const labels = {
    pending: '待执行',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return labels[status] || status
}

const getStatusTagType = (status: TaskStatus): string => {
  const types = {
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return types[status] || 'info'
}

const getPriorityLabel = (priority: TaskPriority): string => {
  const labels = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  }
  return labels[priority] || priority
}

const getPriorityTagType = (priority: TaskPriority): string => {
  const types = {
    low: 'info',
    normal: 'primary',
    high: 'warning',
    urgent: 'danger'
  }
  return types[priority] || 'primary'
}

const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('zh-CN')
}
</script>

<style scoped>
.table-card {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.batch-operations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
  color: white;
  margin-bottom: 0;
}

.batch-info {
  font-size: 14px;
  font-weight: 500;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

.batch-buttons .el-button {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;
}

.batch-buttons .el-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.batch-buttons .el-button.is-disabled {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

.task-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.disabled-tag {
  margin-left: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.action-buttons .el-button {
  margin: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
}

.action-buttons .el-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-buttons .el-button:after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: all 0.5s;
}

.action-buttons .el-button:active:after {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
  transition: 0s;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  border: none;
}

:deep(.el-table th) {
  background: linear-gradient(to right, #f8f9fa, #f2f6fc);
  font-weight: 600;
  color: #444;
  padding: 12px 0;
  font-size: 14px;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: #f9fafc;
}

:deep(.el-table .cell) {
  padding: 12px;
  line-height: 1.5;
}

:deep(.el-table__row) {
  transition: all 0.2s ease-in-out;
}

:deep(.el-table__row td) {
  border-bottom: 1px solid rgba(235, 238, 245, 0.7);
}

:deep(.el-tag) {
  padding: 0 10px;
  height: 24px;
  line-height: 24px;
  border-radius: 4px;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.table-card {
  padding: 0;
}

:deep(.table-card .el-card__body) {
  padding: 0;
}

:deep(.table-card .el-table) {
  margin: 0;
  border-radius: 12px;
}
</style>
