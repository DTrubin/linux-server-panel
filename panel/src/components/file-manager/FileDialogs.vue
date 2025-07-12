<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import FileUploader from './FileUploader.vue'
import type { UploadResponse } from '@/types/file'

const props = defineProps<{
  showCreateDialog: boolean
  showCreateFileDialog: boolean
  showBatchUpload: boolean
  currentFileName?: string
  currentPath?: string
  editMode?: boolean
  fileContent: string
}>()

const emit = defineEmits<{
  'update:showCreateDialog': [value: boolean]
  'update:showCreateFileDialog': [value: boolean]
  'update:showBatchUpload': [value: boolean]
  'create-folder': [name: string]
  'create-file': [fileName: string, content: string]
  'save-file': [content: string]
  'update-file': [oldPath: string, newFileName: string, content: string]
  'upload-files': [files: File[]]
  'batch-upload-success': [response: UploadResponse]
}>()

// 内部状态
const folderName = ref('')
const fileName = ref('')
const fileContent = ref(props.fileContent)
const creating = ref(false)
const fileInputRef = ref<HTMLInputElement>()
const currentEditingFilePath = ref('')

// 计算属性：对话框标题
const fileDialogTitle = computed(() => {
  return props.editMode ? '编辑文件' : '新建文件'
})

// 计算属性：按钮文本
const submitButtonText = computed(() => {
  return props.editMode ? '保存' : '确定'
})

// 处理新建文件夹
const handleCreateFolder = async () => {
  if (!folderName.value.trim()) return

  creating.value = true
  try {
    emit('create-folder', folderName.value)
    folderName.value = ''
    emit('update:showCreateDialog', false)
  } finally {
    creating.value = false
  }
}

// 处理新建文件
const handleCreateFile = async () => {
  if (!fileName.value.trim()) return

  creating.value = true
  try {
    if (props.editMode) {
      // 编辑模式：如果文件名改变了，需要重命名；然后保存内容
      emit('update-file', currentEditingFilePath.value, fileName.value, fileContent.value)
    } else {
      // 创建模式
      emit('create-file', fileName.value, fileContent.value)
    }

    // 只在提交成功后清除内容
    clearContent()
    emit('update:showCreateFileDialog', false)
  } finally {
    creating.value = false
  }
}

// 暴露方法给父组件
const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

const setEditorContent = (content: string, filename: string = '', filePath: string = '') => {
  fileContent.value = content
  fileName.value = filename
  currentEditingFilePath.value = filePath
}

// 清空内容
const clearContent = () => {
  fileContent.value = ''
  fileName.value = ''
  currentEditingFilePath.value = ''
}

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const fileList = target.files
  if (!fileList) return

  emit('upload-files', Array.from(fileList))
  target.value = ''
}

// 处理批量上传成功
const handleBatchUploadSuccess = (response: UploadResponse) => {
  emit('batch-upload-success', response)
  emit('update:showBatchUpload', false)
}

// 处理批量上传错误
const handleBatchUploadError = (error: Error) => {
  console.error('批量上传失败:', error)
  ElMessage.error(`批量上传失败: ${error.message}`)
}

defineExpose({
  triggerFileUpload,
  setEditorContent,
  clearContent
})
</script>

<template>
  <!-- 新建文件夹对话框 -->
  <el-dialog :model-value="showCreateDialog" @update:model-value="emit('update:showCreateDialog', $event)" title="新建文件夹"
    width="400px">
    <el-input v-model="folderName" placeholder="请输入文件夹名称" @keyup.enter="handleCreateFolder" />
    <template #footer>
      <el-button @click="emit('update:showCreateDialog', false)">取消</el-button>
      <el-button type="primary" @click="handleCreateFolder" :loading="creating">确定</el-button>
    </template>
  </el-dialog>

  <!-- 新建文件对话框 -->
  <el-dialog :model-value="showCreateFileDialog" @update:model-value="emit('update:showCreateFileDialog', $event)"
    :title="fileDialogTitle" width="80%">
    <el-form label-width="80px">
      <el-form-item label="文件名:">
        <el-input v-model="fileName" placeholder="请输入文件名（如: example.txt）" />
      </el-form-item>
      <el-form-item label="文件内容:">
        <el-input v-model="fileContent" type="textarea" :rows="20" placeholder="请输入文件内容..." />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:showCreateFileDialog', false)">取消</el-button>
      <el-button type="primary" @click="handleCreateFile" :loading="creating">{{ submitButtonText }}</el-button>
    </template>
  </el-dialog>

  <!-- 批量上传对话框 -->
  <el-dialog :model-value="showBatchUpload" @update:model-value="emit('update:showBatchUpload', $event)" title="批量文件上传"
    width="800px" class="batch-upload-dialog">
    <FileUploader :current-path="currentPath" @upload-success="handleBatchUploadSuccess"
      @upload-error="handleBatchUploadError" />
  </el-dialog>

  <!-- 隐藏的文件上传输入 -->
  <input ref="fileInputRef" type="file" multiple style="display: none" @change="handleFileUpload" />
</template>

<style lang="scss" scoped>
.batch-upload-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}
</style>
