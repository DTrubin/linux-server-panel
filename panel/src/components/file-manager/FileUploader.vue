<script setup lang="ts">
defineOptions({
  name: 'FileUploader'
})

import { ref, computed, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadInstance, UploadFile, UploadFiles } from 'element-plus'
import { uploadFiles } from '@/api/file'
import type { UploadParams, UploadResponse } from '@/types/file'

interface Props {
  currentPath?: string
  accept?: string
  multiple?: boolean
  maxSize?: number // MB
}

interface Emits {
  (e: 'upload-success', response: UploadResponse): void
  (e: 'upload-error', error: Error): void
  (e: 'upload-progress', progress: number): void
}

const props = withDefaults(defineProps<Props>(), {
  currentPath: '/',
  accept: '*/*',
  multiple: true,
  maxSize: 100
})

const emit = defineEmits<Emits>()

// 响应式数据
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFiles>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const currentUploadingFile = ref('')
const overwriteMode = ref(false)
const sessionId = ref('')
const uploadResults = ref<any[]>([]) // 存储上传结果
const showResults = ref(false) // 是否显示结果

// 计算属性
const totalSize = computed(() => {
  return fileList.value.reduce((total, file) => total + (file.size || 0), 0)
})

const totalSizeFormatted = computed(() => {
  return formatFileSize(totalSize.value)
})

const hasFiles = computed(() => fileList.value.length > 0)

// 文件上传前的验证
const beforeUpload = (file: UploadFile) => {
  // 移除文件大小限制
  // const isValidSize = file.size! / 1024 / 1024 < props.maxSize
  // if (!isValidSize) {
  //   ElMessage.error(`文件 "${file.name}" 大小不能超过 ${props.maxSize}MB!`)
  //   return false
  // }

  // 检查文件名是否包含非法字符
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(file.name)) {
    ElMessage.error(`文件名 "${file.name}" 包含非法字符`)
    return false
  }

  return true
}

// 开始上传
const handleUpload = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  // 生成会话ID
  sessionId.value = Date.now().toString()

  uploading.value = true
  uploadProgress.value = 0
  currentUploadingFile.value = ''

  try {
    // 转换文件列表为File对象数组
    const files = fileList.value.map(uploadFile => uploadFile.raw!).filter(Boolean)

    const uploadParams: UploadParams = {
      files,
      path: props.currentPath,
      overwrite: overwriteMode.value,
      sessionId: sessionId.value
    }

    currentUploadingFile.value = '正在上传文件...'

    // 执行上传
    const response = await uploadFiles(uploadParams, (progress) => {
      uploadProgress.value = progress
      emit('upload-progress', progress)
    })

    // 处理上传结果
    if (response.success) {
      const { summary, results } = response.data

      // 保存上传结果用于显示
      uploadResults.value = results || []
      showResults.value = true

      if (summary.failed > 0) {
        // 部分失败
        ElMessage.warning(`上传完成: ${summary.success}/${summary.total} 个文件成功`)

        // 显示失败的文件详情
        const failedFileNames = response.data.failed?.map((f: any) => f.filename || f.name).join(', ') || ''
        if (failedFileNames) {
          ElMessageBox.alert(
            `以下文件上传失败: ${failedFileNames}`,
            '上传结果',
            { type: 'warning' }
          )
        }
      } else {
        // 全部成功
        ElMessage.success(`所有 ${summary.total} 个文件上传成功!`)
      }

      // 先发出成功事件，再清空文件列表
      emit('upload-success', response)

      // 清空文件列表
      clearFileList()
    } else {
      // 服务器返回失败状态
      throw new Error(response.message || '上传失败')
    }

  } catch (error: any) {
    console.error('上传失败:', error)
    ElMessage.error(`上传失败: ${error.message || '未知错误'}`)
    emit('upload-error', error)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
    currentUploadingFile.value = ''
  }
}

// 处理文件变化
const handleFileChange = (file: UploadFile, files: UploadFiles) => {
  fileList.value = files
}

// 移除文件
const handleRemove = (file: UploadFile) => {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
  }
}

// 清空文件列表
const clearFileList = () => {
  fileList.value = []
  uploadRef.value?.clearFiles()
}

// 清空上传结果
const clearResults = () => {
  uploadResults.value = []
  showResults.value = false
}

// 格式化文件大小
const formatFileSize = (size: number) => {
  if (size === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(size) / Math.log(k))
  return Math.round(size / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 获取文件图标类型
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg']
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv']
  const audioExts = ['mp3', 'wav', 'flac', 'aac']
  const docExts = ['doc', 'docx', 'pdf', 'txt']
  const codeExts = ['js', 'ts', 'vue', 'html', 'css', 'json', 'xml']

  if (imageExts.includes(ext!)) return 'Picture'
  if (videoExts.includes(ext!)) return 'VideoPlay'
  if (audioExts.includes(ext!)) return 'Mic'
  if (docExts.includes(ext!)) return 'Document'
  if (codeExts.includes(ext!)) return 'DocumentCopy'
  return 'Document'
}

// 图标导入
import {
  UploadFilled,
  Delete,
  Upload,
  Document,
  DocumentCopy,
  Picture,
  VideoPlay,
  Mic,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'

// 组件销毁时清理
onUnmounted(() => {
  if (sessionId.value) {
    // 这里可以调用清理API，但由于组件销毁时网络请求可能被取消，暂时省略
  }
})
</script>

<template>
  <div class="file-uploader">
    <el-card>
      <template #header>
        <div class="uploader-header">
          <span>批量文件上传</span>
          <div class="header-info">
            <el-tag type="info">路径: {{ currentPath }}</el-tag>
            <el-tag v-if="hasFiles" type="success">{{ fileList.length }} 个文件</el-tag>
            <el-tag v-if="hasFiles" type="warning">{{ totalSizeFormatted }}</el-tag>
          </div>
        </div>
      </template>

      <!-- 上传配置区域 -->
      <div class="upload-config">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-switch
              v-model="overwriteMode"
              :disabled="uploading"
              active-text="覆盖同名文件"
              inactive-text="跳过同名文件"
            />
          </el-col>
          <el-col :span="12">
            <div class="config-info">
              <span>无文件大小限制</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 上传区域 -->
      <div class="upload-area">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :multiple="multiple"
          :accept="accept"
          :before-upload="beforeUpload"
          :on-change="handleFileChange"
          :on-remove="handleRemove"
          :disabled="uploading"
          drag
          class="upload-dragger"
        >
          <el-icon class="el-icon--upload">
            <Upload />
          </el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击选择文件</em>
          </div>
          <div class="el-upload__tip">
            <div>支持格式: {{ accept === '*/*' ? '所有文件类型' : accept }}</div>
            <div>{{ multiple ? '支持多文件批量上传' : '仅支持单文件上传' }}</div>
            <div>无文件大小限制</div>
          </div>
        </el-upload>
      </div>

      <!-- 上传进度 -->
      <div v-if="uploading" class="upload-progress">
        <el-divider>上传进度</el-divider>
        <div class="progress-info">
          <div class="progress-text">
            <span>{{ currentUploadingFile }}</span>
            <span class="progress-percentage">{{ uploadProgress }}%</span>
          </div>
          <el-progress
            :percentage="uploadProgress"
            :status="uploadProgress === 100 ? 'success' : undefined"
            :stroke-width="8"
          />
        </div>
      </div>

      <!-- 文件列表 -->
      <div v-if="hasFiles && !uploading" class="file-list">
        <el-divider>待上传文件 ({{ fileList.length }})</el-divider>
        <div class="file-items">
          <div v-for="file in fileList" :key="file.uid" class="file-item">
            <div class="file-info">
              <el-icon class="file-icon" :size="24">
                <component :is="getFileIcon(file.name)" />
              </el-icon>
              <div class="file-details">
                <div class="file-name" :title="file.name">{{ file.name }}</div>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(file.size || 0) }}</span>
                  <span class="file-type">{{ file.name.split('.').pop()?.toUpperCase() || 'FILE' }}</span>
                </div>
              </div>
            </div>
            <el-button
              type="danger"
              size="small"
              text
              @click="handleRemove(file)"
              :disabled="uploading"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="file-summary">
          <el-descriptions :column="3" size="small">
            <el-descriptions-item label="文件数量">{{ fileList.length }}</el-descriptions-item>
            <el-descriptions-item label="总大小">{{ totalSizeFormatted }}</el-descriptions-item>
            <el-descriptions-item label="上传模式">
              {{ overwriteMode ? '覆盖模式' : '跳过模式' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 操作按钮 -->
        <div class="upload-actions">
          <el-button
            type="primary"
            size="large"
            @click="handleUpload"
            :loading="uploading"
            :disabled="fileList.length === 0"
          >
            <el-icon v-if="!uploading"><Upload /></el-icon>
            {{ uploading ? '上传中...' : `开始上传 (${fileList.length} 个文件)` }}
          </el-button>
          <el-button
            size="large"
            @click="clearFileList"
            :disabled="uploading"
          >
            <el-icon><Delete /></el-icon>
            清空列表
          </el-button>
        </div>
      </div>

      <!-- 上传结果 -->
      <div v-if="showResults" class="upload-results">
        <el-divider>上传结果</el-divider>
        <div class="results-summary">
          <el-descriptions :column="3" size="small" border>
            <el-descriptions-item label="总文件数">{{ uploadResults.length }}</el-descriptions-item>
            <el-descriptions-item label="成功">
              <el-tag type="success">{{ uploadResults.filter(r => r.success).length }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="失败">
              <el-tag type="danger">{{ uploadResults.filter(r => !r.success).length }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="results-list">
          <div v-for="result in uploadResults" :key="result.filename" class="result-item">
            <div class="result-icon">
              <el-icon v-if="result.success" color="#67c23a" :size="20">
                <CircleCheck />
              </el-icon>
              <el-icon v-else color="#f56c6c" :size="20">
                <CircleClose />
              </el-icon>
            </div>
            <div class="result-info">
              <div class="result-filename">{{ result.filename }}</div>
              <div v-if="result.success" class="result-details success">
                <span class="result-size">{{ formatFileSize(result.size || 0) }}</span>
                <span class="result-path">{{ result.path }}</span>
              </div>
              <div v-else class="result-details error">
                <span class="result-error">{{ result.error }}</span>
                <span v-if="result.code" class="result-code">[{{ result.code }}]</span>
              </div>
            </div>
          </div>
        </div>

        <div class="results-actions">
          <el-button size="small" @click="clearResults">
            <el-icon><Delete /></el-icon>
            清空结果
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.file-uploader {
  .uploader-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-info {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  .upload-config {
    margin-bottom: 20px;
    padding: 16px;
    background-color: var(--el-bg-color-page);
    border-radius: 6px;

    .config-info {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-size: 14px;
      color: var(--el-text-color-secondary);
    }
  }

  .upload-area {
    margin-bottom: 20px;

    .upload-dragger {
      width: 100%;

      :deep(.el-upload-dragger) {
        width: 100%;
        height: 180px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border: 2px dashed var(--el-border-color);
        border-radius: 8px;
        transition: all 0.3s ease;

        &:hover {
          border-color: var(--el-color-primary);
          background-color: var(--el-color-primary-light-9);
        }

        .el-icon--upload {
          font-size: 54px;
          color: var(--el-text-color-placeholder);
          margin-bottom: 16px;
          transition: color 0.3s ease;
        }

        .el-upload__text {
          color: var(--el-text-color-regular);
          font-size: 16px;
          margin-bottom: 12px;

          em {
            color: var(--el-color-primary);
            font-weight: 500;
          }
        }

        .el-upload__tip {
          font-size: 13px;
          color: var(--el-text-color-secondary);
          text-align: center;
          line-height: 1.4;

          div {
            margin-bottom: 4px;
          }
        }
      }

      :deep(.el-upload-dragger.is-dragover) {
        border-color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-8);

        .el-icon--upload {
          color: var(--el-color-primary);
        }
      }
    }
  }

  .upload-progress {
    margin: 20px 0;

    .progress-info {
      margin-top: 16px;

      .progress-text {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 14px;

        .progress-percentage {
          font-weight: 600;
          color: var(--el-color-primary);
        }
      }
    }
  }

  .file-list {
    .file-items {
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 20px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 6px;
    }

    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      transition: background-color 0.3s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--el-bg-color-page);
      }

      .file-info {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;

        .file-icon {
          color: var(--el-color-primary);
          margin-right: 12px;
          flex-shrink: 0;
        }

        .file-details {
          flex: 1;
          min-width: 0;

          .file-name {
            font-weight: 500;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .file-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: var(--el-text-color-secondary);

            .file-size {
              font-weight: 500;
            }

            .file-type {
              padding: 1px 6px;
              background-color: var(--el-color-info-light-8);
              border-radius: 3px;
              color: var(--el-color-info);
              font-weight: 500;
            }
          }
        }
      }
    }

    .file-summary {
      margin-bottom: 20px;
      padding: 16px;
      background-color: var(--el-bg-color-page);
      border-radius: 6px;

      :deep(.el-descriptions__label) {
        font-weight: 500;
      }
    }

    .upload-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      padding-top: 16px;
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    .uploader-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      .header-info {
        justify-content: center;
      }
    }

    .upload-config {
      .el-row {
        .el-col {
          margin-bottom: 12px;
        }
      }

      .config-info {
        justify-content: center;
      }
    }

    .file-item {
      .file-info {
        .file-details {
          .file-meta {
            flex-direction: column;
            gap: 4px;
          }
        }
      }
    }

    .upload-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}

// 上传结果样式
.upload-results {
  margin-top: 20px;

  .results-summary {
    margin-bottom: 16px;
  }

  .results-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background: var(--el-bg-color-page);

    .result-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      transition: background-color 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--el-fill-color-lighter);
      }

      .result-icon {
        margin-right: 12px;
        margin-top: 2px;
        flex-shrink: 0;
      }

      .result-info {
        flex: 1;
        min-width: 0;

        .result-filename {
          font-weight: 500;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
          word-break: break-all;
        }

        .result-details {
          font-size: 12px;
          line-height: 1.4;

          &.success {
            color: var(--el-text-color-secondary);

            .result-size {
              margin-right: 12px;
              padding: 2px 6px;
              background: var(--el-color-success-light-9);
              color: var(--el-color-success);
              border-radius: 3px;
            }

            .result-path {
              color: var(--el-text-color-placeholder);
              word-break: break-all;
            }
          }

          &.error {
            .result-error {
              color: var(--el-color-danger);
              margin-right: 8px;
            }

            .result-code {
              color: var(--el-text-color-placeholder);
              font-family: monospace;
            }
          }
        }
      }
    }
  }

  .results-actions {
    margin-top: 12px;
    text-align: right;
  }
}

// 自定义滚动条样式
.file-items::-webkit-scrollbar {
  width: 6px;
}

.file-items::-webkit-scrollbar-track {
  background: var(--el-border-color-lighter);
  border-radius: 3px;
}

.file-items::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;

  &:hover {
    background: var(--el-border-color-dark);
  }
}
</style>
