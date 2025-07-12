<script setup lang="ts">
import {
  ArrowUp,
  House,
  Refresh,
  Plus,
  Upload,
  UploadFilled,
  Search,
  View,
  Hide,
  DocumentAdd
} from '@element-plus/icons-vue'

defineProps<{
  pathParts: string[]
  selectedCount: number
  showHiddenFiles: boolean
  loading: boolean
  searchKeyword: string
}>()

defineEmits<{
  'create-folder': []
  'create-file': []
  'upload-files': []
  'batch-upload': []
  'toggle-hidden': []
  'delete-batch': []
  'download-batch': []
  'go-home': []
  'go-back': []
  'refresh': []
  'navigate-to-index': [index: number]
  'update:search-keyword': [value: string]
}>()
</script>

<template>
  <div class="file-toolbar">
    <!-- 第一行：文件操作按钮组和视图控制 -->
    <div class="toolbar-row-1">
      <!-- 文件操作按钮组 -->
      <div class="action-buttons">
        <el-button-group>
          <el-button type="primary" :icon="Plus" @click="$emit('create-folder')" title="新建文件夹">
            新建文件夹
          </el-button>
          <el-button type="success" :icon="DocumentAdd" @click="$emit('create-file')" title="新建文件">
            新建文件
          </el-button>
          <el-button :icon="Upload" @click="$emit('upload-files')" title="快速上传文件">
            快速上传
          </el-button>
          <el-button type="warning" :icon="UploadFilled" @click="$emit('batch-upload')" title="批量上传文件">
            批量上传
          </el-button>
        </el-button-group>
      </div>

      <!-- 视图控制按钮组 -->
      <div class="view-controls">
        <el-button :type="showHiddenFiles ? 'primary' : ''" :icon="showHiddenFiles ? Hide : View"
          @click="$emit('toggle-hidden')" size="default" title="显示/隐藏隐藏文件">
          {{ showHiddenFiles ? '隐藏隐藏文件' : '显示隐藏文件' }}
        </el-button>
      </div>

      <!-- 批量操作按钮 -->
      <div v-if="selectedCount > 0" class="batch-actions">
        <span class="selected-count">已选中 {{ selectedCount }} 个项目</span>
        <el-button size="small" type="primary" @click="$emit('download-batch')">
          批量下载
        </el-button>
        <el-button size="small" type="danger" @click="$emit('delete-batch')">
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 第二行：导航按钮组、路径显示和搜索框 -->
    <div class="toolbar-row-2">
      <!-- 导航按钮组 -->
      <div class="nav-buttons">
        <el-button-group>
          <el-button :icon="House" @click="$emit('go-home')" title="回到主目录">
            主目录
          </el-button>
          <el-button :icon="ArrowUp" @click="$emit('go-back')" title="返回上级目录">
            返回
          </el-button>
          <el-button :icon="Refresh" :loading="loading" @click="$emit('refresh')" title="刷新文件列表">
            刷新
          </el-button>
        </el-button-group>
      </div>

      <!-- 路径显示 -->
      <div class="path-section">
        <el-breadcrumb class="path-breadcrumb" separator="/">
          <el-breadcrumb-item v-for="(part, index) in pathParts" :key="index"
            @click="$emit('navigate-to-index', index)">
            {{ part || 'root' }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <el-input :model-value="searchKeyword" @update:model-value="$emit('update:search-keyword', $event)"
          placeholder="搜索文件..." :prefix-icon="Search" style="width: 250px" clearable />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-toolbar {
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  // 第一行工具栏
  .toolbar-row-1 {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    min-height: 48px;

    .action-buttons,
    .view-controls {
      display: flex;
      align-items: center;
    }

    .batch-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      height: auto;
      min-height: 32px;
      background: var(--el-color-primary-light-9) !important;
      border: 1px solid var(--el-color-primary-light-7) !important;
      border-radius: 6px;
      animation: slideIn 0.3s ease-out;
      z-index: 10;
      position: relative;

      .selected-count {
        font-size: 13px;
        color: var(--el-color-primary) !important;
        font-weight: 500;
        white-space: nowrap;
      }

      .el-button {
        height: auto;
        min-height: 24px;
        padding: 4px 8px;
        font-size: 12px;
        line-height: 1.2;
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }

      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  }

  // 第二行工具栏
  .toolbar-row-2 {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 16px;
    min-height: 48px;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter);

    .nav-buttons {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .path-section {
      flex: 1;
      margin: 0 16px;
      padding: 4px;
      border-radius: 4px;
      background: var(--el-bg-color) !important;

      .path-breadcrumb {
        font-size: 14px;
        line-height: 1.5;

        :deep(.el-breadcrumb) {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        :deep(.el-breadcrumb__item) {
          display: inline-flex;
          align-items: center;

          .el-breadcrumb__inner {
            color: var(--el-text-color-primary) !important;
            font-weight: 500;
            cursor: pointer;
            transition: color 0.3s;
            text-decoration: none;

            &:hover {
              color: var(--el-color-primary) !important;
            }
          }

          &:last-child .el-breadcrumb__inner {
            color: var(--el-color-primary) !important;
            font-weight: 600;
          }
        }

        :deep(.el-breadcrumb__separator) {
          color: var(--el-text-color-secondary) !important;
          margin: 0 8px;
        }
      }
    }

    .search-box {
      flex-shrink: 0;
      min-width: 250px;
      background: var(--el-bg-color) !important;
      padding: 2px;
      border-radius: 4px;

      .el-input {
        width: 250px !important;
      }
    }
  }
}
</style>
