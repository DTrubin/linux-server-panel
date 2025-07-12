<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="执行历史"
    width="1000px"
  >
    <el-table
      v-loading="loading"
      :data="executions"
      height="400"
    >
      <el-table-column prop="startTime" label="开始时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="duration" label="耗时" width="100">
        <template #default="{ row }">
          {{ row.duration ? `${row.duration}s` : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="exitCode" label="退出码" width="80">
        <template #default="{ row }">
          <el-tag :type="row.exitCode === 0 ? 'success' : 'danger'" size="small">
            {{ row.exitCode ?? '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button
            size="small"
            @click="handleViewOutput(row)"
          >
            查看输出
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="$emit('page-change')"
      />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import type { TaskExecution, TaskStatus } from '@/types/task'

const props = defineProps<{
  visible: boolean
  executions: TaskExecution[]
  total: number
  loading: boolean
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'view-output', execution: TaskExecution): void
  (e: 'page-change'): void
}>()

const handleViewOutput = (execution: TaskExecution) => {
  emit('view-output', execution)
}

// 辅助方法
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

const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString('zh-CN')
}
</script>

<style scoped>
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

:deep(.el-table .cell) {
  padding: 12px;
  line-height: 1.5;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-dialog__body) {
  padding: 20px;
}
</style>
