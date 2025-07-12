<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="选择日志文件"
    width="800px"
    :before-close="handleClose">

    <div class="file-selector">
      <!-- 路径导航 -->
      <div class="path-navigation">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item
            v-for="(segment, index) in pathSegments"
            :key="index"
            @click="navigateToPath(index)">
            {{ segment || 'root' }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 文件列表 -->
      <div class="file-list-container">
        <el-table
          v-loading="loading"
          :data="filteredFiles"
          @row-dblclick="handleRowDoubleClick"
          @row-click="handleRowClick"
          :row-class-name="getRowClassName"
          height="400px">

          <el-table-column prop="name" label="名称" min-width="200">
            <template #default="{ row }">
              <div class="file-item">
                <el-icon class="file-icon">
                  <Folder v-if="row.type === 'directory'" />
                  <Document v-else />
                </el-icon>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="type" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.type === 'directory' ? 'success' : 'info'" size="small">
                {{ row.type === 'directory' ? '文件夹' : '文件' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="size" label="大小" width="100">
            <template #default="{ row }">
              <span v-if="row.type === 'file'">{{ formatFileSize(row.size) }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="modified" label="修改时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.modified) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 选中的文件信息 -->
      <div v-if="selectedFile && selectedFile.type === 'file'" class="selected-file-info">
        <el-alert :title="`已选择: ${selectedFile.name}`" type="success" :closable="false" />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :disabled="!selectedFile || selectedFile.type !== 'file'"
        @click="handleConfirm">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Folder, Document } from '@element-plus/icons-vue'
import { getDirectoryContents } from '@/api/file'
import type { FileItem } from '@/types/file'

interface Props {
  modelValue: boolean
  initialPath?: string
  fileFilter?: (file: FileItem) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialPath: '/',
  fileFilter: (file: FileItem) => file.type === 'directory' || file.name.endsWith('.log')
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [file: FileItem]
}>()

const loading = ref(false)
const currentPath = ref(props.initialPath)
const files = ref<FileItem[]>([])
const selectedFile = ref<FileItem | null>(null)

// 计算路径片段用于面包屑导航
const pathSegments = computed(() => {
  if (!currentPath.value || currentPath.value === '/') return ['']
  return currentPath.value.split('/').filter(Boolean)
})

// 过滤文件列表
const filteredFiles = computed(() => {
  return files.value.filter(props.fileFilter)
})

// 监听对话框打开状态
watch(() => props.modelValue, (show) => {
  if (show) {
    currentPath.value = props.initialPath
    loadDirectory(currentPath.value)
  } else {
    selectedFile.value = null
  }
})

// 加载目录内容
const loadDirectory = async (path: string) => {
  if (loading.value) return

  loading.value = true
  try {
    files.value = await getDirectoryContents(path)
    selectedFile.value = null
  } catch (error) {
    console.error('加载目录失败:', error)
    ElMessage.error('加载目录失败')
  } finally {
    loading.value = false
  }
}

// 导航到指定路径
const navigateToPath = (segmentIndex: number) => {
  if (segmentIndex === 0) {
    currentPath.value = '/'
  } else {
    const segments = pathSegments.value.slice(0, segmentIndex + 1)
    currentPath.value = '/' + segments.join('/')
  }
  loadDirectory(currentPath.value)
}

// 处理行双击
const handleRowDoubleClick = (row: FileItem) => {
  if (row.type === 'directory') {
    currentPath.value = row.path
    loadDirectory(row.path)
  } else {
    selectedFile.value = row
    handleConfirm()
  }
}

// 处理行单击
const handleRowClick = (row: FileItem) => {
  selectedFile.value = row
}

// 获取行样式类名
const getRowClassName = ({ row }: { row: FileItem }) => {
  if (selectedFile.value && selectedFile.value.path === row.path) {
    return 'selected-row'
  }
  if (row.type === 'file') {
    return 'file-row'
  }
  return 'directory-row'
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 处理关闭
const handleClose = () => {
  emit('update:modelValue', false)
}

// 处理确认
const handleConfirm = () => {
  if (selectedFile.value && selectedFile.value.type === 'file') {
    emit('confirm', selectedFile.value)
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
.file-selector {
  min-height: 500px;
}

.path-navigation {
  margin-bottom: 16px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.path-navigation .el-breadcrumb-item {
  cursor: pointer;
}

.path-navigation .el-breadcrumb-item:hover {
  color: var(--el-color-primary);
}

.file-list-container {
  margin-bottom: 16px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
}

.selected-file-info {
  margin-top: 16px;
}

:deep(.selected-row) {
  background-color: var(--el-color-primary-light-9) !important;
}

:deep(.file-row:hover) {
  background-color: var(--el-fill-color-light);
  cursor: pointer;
}

:deep(.directory-row:hover) {
  background-color: var(--el-fill-color-light);
  cursor: pointer;
}
</style>
