<script setup lang="ts" name="FileManagerView">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useFileManager } from '@/composables/useFileManager'
import { getFileContent, saveFileContent } from '@/api/file'
import FileToolbar from '@/components/file-manager/FileToolbar.vue'
import FileList from '@/components/file-manager/FileList.vue'
import FileDialogs from '@/components/file-manager/FileDialogs.vue'
import type { FileItem } from '@/types/fileManager'

// 使用文件管理器逻辑
const {
  currentPath,
  loading,
  selectedFiles,
  showHiddenFiles,
  searchKeyword,
  pathParts,
  filteredFiles,
  initializePath,
  loadFiles,
  navigateToIndex,
  goBack,
  goHome,
  toggleHiddenFiles,
  handleItemDoubleClick,
  handleSelectionChange,
  createFolder,
  createFile,
  uploadFileList,
  deleteItems,
  downloadItems
} = useFileManager()

// 对话框状态
const showCreateDialog = ref(false)
const showCreateFileDialog = ref(false)
const showBatchUpload = ref(false)
const currentFile = ref<FileItem | null>(null)
const isEditMode = ref(false)
const fileContent = ref('')
const dialogsRef = ref<InstanceType<typeof FileDialogs>>()

// 工具栏事件处理
const handleCreateFolder = async (folderName: string) => {
  let res = await createFolder(folderName)
}

const handleCreateFile = () => {
  isEditMode.value = false
  dialogsRef.value?.clearContent()
  showCreateFileDialog.value = true
}

const handleUploadFiles = () => {
  dialogsRef.value?.triggerFileUpload()
}

const handleBatchUpload = () => {
  showBatchUpload.value = true
}

const handleBatchUploadSuccess = (response: any) => {
  ElMessage.success(`批量上传完成: ${response.data.summary.success}/${response.data.summary.total} 个文件成功`)
  loadFiles() // 重新加载文件列表
}

const handleDeleteBatch = async () => {
  if (selectedFiles.value.length > 0) {
    await deleteItems(selectedFiles.value)
  }
}

const handleDownloadBatch = async () => {
  if (selectedFiles.value.length > 0) {
    await downloadItems(selectedFiles.value)
  }
}

// 文件操作
const editFile = async (file: FileItem) => {
  if (!file.path) return

  try {
    const res = await getFileContent({ path: file.path })
    if (!res.success) {
      ElMessage.error(res.message || '获取文件内容失败')
      return
    }
    const response = res.data
    dialogsRef.value?.setEditorContent(response.content, file.name, file.path)
    currentFile.value = file
    fileContent.value = response.content
    isEditMode.value = true
    showCreateFileDialog.value = true
  } catch (error) {
    console.error('读取文件失败:', error)
    ElMessage.error('读取文件失败')
  }
}

const handleUpdateFile = async (oldPath: string, newFileName: string, content: string) => {
  if (!oldPath) return

  try {
    // 如果文件名改变了，需要先重命名文件
    const oldFileName = oldPath.split('/').pop() || ''
    if (oldFileName !== newFileName) {
      // 这里需要调用重命名API，暂时简化处理
      ElMessage.warning('文件重命名功能待实现，当前只保存内容')
    }

    // 保存文件内容
    await saveFileContent({
      path: oldPath,
      content: content
    })
    ElMessage.success('文件保存成功')
    isEditMode.value = false
    currentFile.value = null
    loadFiles() // 重新加载文件列表
  } catch (error) {
    console.error('保存文件失败:', error)
    ElMessage.error('保存文件失败')
  }
}

// 暴露方法
defineExpose({
  refreshFiles: loadFiles,
  currentPath,
  editFile
})

onMounted(() => {
  initializePath()
})
</script>

<template>
  <div class="file-manager-view">
    <!-- 工具栏 -->
    <FileToolbar :path-parts="pathParts" :selected-count="selectedFiles.length" :show-hidden-files="showHiddenFiles"
      :loading="loading" v-model:search-keyword="searchKeyword" @create-folder="showCreateDialog = true"
      @create-file="handleCreateFile" @upload-files="handleUploadFiles" @batch-upload="handleBatchUpload"
      @toggle-hidden="toggleHiddenFiles" @delete-batch="handleDeleteBatch" @download-batch="handleDownloadBatch"
      @go-home="goHome" @go-back="goBack" @refresh="loadFiles" @navigate-to-index="navigateToIndex" />

    <!-- 文件列表 -->
    <FileList :files="filteredFiles" :loading="loading" :show-details="true"
      @item-dblclick="(item) => handleItemDoubleClick(item, editFile)" @selection-change="handleSelectionChange" />

    <!-- 对话框组件 -->
    <FileDialogs ref="dialogsRef" v-model:show-create-dialog="showCreateDialog"
      v-model:show-create-file-dialog="showCreateFileDialog" v-model:show-batch-upload="showBatchUpload"
      :current-file-name="currentFile?.name" :current-path="currentPath" :edit-mode="isEditMode"
      :file-content="fileContent"
      @create-folder="handleCreateFolder" @create-file="createFile" @update-file="handleUpdateFile"
      @upload-files="uploadFileList" @batch-upload-success="handleBatchUploadSuccess" />
  </div>
</template>

<style lang="scss" scoped>
.file-manager-view {
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
}
</style>
