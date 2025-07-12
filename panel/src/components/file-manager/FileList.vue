<template>
  <div class="file-list" v-loading="loading">
    <el-table
      :data="files"
      @row-dblclick="$emit('item-dblclick', $event)"
      @selection-change="$emit('selection-change', $event)"
      highlight-current-row
      stripe
      height="100%"
      :scroll-y="{ gt: 20 }"
      table-layout="fixed">

      <!-- 选择列 -->
      <el-table-column type="selection" width="55" />

      <!-- 文件名称列 -->
      <el-table-column label="名称" min-width="300">
        <template #default="{ row }">
          <div class="file-item" :class="{ 'hidden-file': row.name.startsWith('.') }">
            <el-icon class="file-icon">
              <Folder v-if="row.type === 'directory'" />
              <Document v-else />
            </el-icon>
            <div class="file-info">
              <div class="file-name">{{ row.name }}</div>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- 大小列 -->
      <el-table-column label="大小" width="120" v-if="showDetails">
        <template #default="{ row }">
          {{ row.type === 'directory' ? '-' : formatFileSize(row.size) }}
        </template>
      </el-table-column>

      <!-- 修改时间列 -->
      <el-table-column label="修改时间" width="180" v-if="showDetails">
        <template #default="{ row }">
          {{ row.modified }}
        </template>
      </el-table-column>

      <!-- 权限列 -->
      <el-table-column label="权限" width="120" v-if="showDetails">
        <template #default="{ row }">
          {{ row.permissions }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Folder, Document } from '@element-plus/icons-vue'
import type { FileItem } from '../../types/fileManager'

defineProps<{
  files: FileItem[]
  loading: boolean
  showDetails?: boolean
}>()

defineEmits<{
  'item-dblclick': [item: FileItem]
  'selection-change': [selection: FileItem[]]
}>()

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style lang="scss" scoped>
.file-list {
  flex: 1;
  padding: 16px;
  overflow: auto;

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .file-icon {
      color: var(--el-color-primary);
      font-size: 18px;
    }

    .file-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .file-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
    }

    // 隐藏文件样式
    &.hidden-file {
      opacity: 0.6;

      .file-icon {
        color: var(--el-color-info);
      }

      .file-name {
        color: var(--el-text-color-secondary);
        font-style: italic;
      }
    }
  }
}
</style>
