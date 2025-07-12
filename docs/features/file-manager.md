# 文件管理器

文件管理器是 Linux Server Panel 的核心功能之一，提供完整的文件系统操作界面，让用户能够通过 Web 界面管理服务器文件。

## 🎯 功能概述

文件管理器采用现代化的双栏式布局，集成了文件浏览、编辑、上传下载、权限管理等功能，提供类似桌面文件管理器的用户体验。

## 📁 核心功能

### 1. 文件浏览与导航

#### 目录结构显示
- **树形结构**: 层级目录清晰展示
- **面包屑导航**: 快速跳转到上级目录
- **路径输入**: 直接输入路径快速跳转
- **书签功能**: 收藏常用目录

#### 文件列表
```vue
<template>
  <div class="file-list">
    <el-table 
      :data="filteredFiles" 
      @selection-change="handleSelectionChange"
      @row-dblclick="handleItemDoubleClick">
      
      <el-table-column type="selection" width="50" />
      
      <el-table-column label="名称" prop="name">
        <template #default="{ row }">
          <div class="file-item">
            <el-icon class="file-icon">
              <component :is="getFileIcon(row)" />
            </el-icon>
            <span class="file-name">{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="类型" prop="type" width="100" />
      <el-table-column label="大小" prop="size" width="120">
        <template #default="{ row }">
          {{ formatFileSize(row.size) }}
        </template>
      </el-table-column>
      
      <el-table-column label="修改时间" prop="modified" width="180">
        <template #default="{ row }">
          {{ formatDate(row.modified) }}
        </template>
      </el-table-column>
      
      <el-table-column label="权限" prop="permissions" width="120" />
      
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button size="small" @click="editFile(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteFile(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
```

#### 视图模式
- **列表视图**: 详细信息表格显示
- **网格视图**: 图标网格布局 (计划中)
- **紧凑视图**: 精简信息显示
- **详细视图**: 完整文件属性

### 2. 文件操作功能

#### 基础操作
```typescript
// composables/useFileManager.ts
export function useFileManager() {
  const currentPath = ref('/')
  const files = ref<FileItem[]>([])
  const selectedFiles = ref<FileItem[]>([])
  
  // 创建文件夹
  const createFolder = async (folderName: string) => {
    try {
      const response = await createFolderAPI({
        path: currentPath.value,
        name: folderName
      })
      
      if (response.success) {
        ElMessage.success('文件夹创建成功')
        await loadFiles()
      }
    } catch (error) {
      ElMessage.error('创建文件夹失败')
    }
  }
  
  // 创建文件
  const createFile = async (fileName: string, content: string = '') => {
    try {
      const response = await createFileAPI({
        path: currentPath.value,
        name: fileName,
        content
      })
      
      if (response.success) {
        ElMessage.success('文件创建成功')
        await loadFiles()
      }
    } catch (error) {
      ElMessage.error('创建文件失败')
    }
  }
  
  return {
    currentPath,
    files,
    selectedFiles,
    createFolder,
    createFile,
    // ... 其他方法
  }
}
```

#### 高级操作
- **复制/移动**: 文件和文件夹的复制移动
- **重命名**: 文件和文件夹重命名
- **压缩解压**: 支持多种压缩格式
- **权限修改**: chmod 权限管理
- **所有者修改**: chown 所有权管理

### 3. 文件上传下载

#### 多文件上传
```vue
<!-- components/file-manager/FileUploader.vue -->
<template>
  <div class="file-uploader">
    <el-upload
      ref="uploadRef"
      :action="uploadAction"
      :headers="uploadHeaders"
      :data="uploadData"
      :file-list="fileList"
      :on-change="handleFileChange"
      :on-remove="handleRemove"
      :auto-upload="false"
      multiple
      drag>
      
      <el-icon class="el-icon--upload">
        <upload-filled />
      </el-icon>
      
      <div class="el-upload__text">
        拖拽文件到此处，或<em>点击上传</em>
      </div>
      
      <template #tip>
        <div class="el-upload__tip">
          支持多文件上传，单个文件不超过 100MB
        </div>
      </template>
    </el-upload>
    
    <!-- 上传进度 -->
    <div v-if="uploading" class="upload-progress">
      <el-progress 
        :percentage="uploadProgress" 
        :status="uploadStatus"
        :show-text="true">
      </el-progress>
      
      <div class="progress-text">
        {{ currentUploadingFile }} - {{ uploadProgress }}%
      </div>
    </div>
    
    <!-- 上传结果 -->
    <div v-if="showResults" class="upload-results">
      <h4>上传结果</h4>
      <ul>
        <li v-for="result in uploadResults" :key="result.filename"
            :class="{ success: result.success, error: !result.success }">
          {{ result.filename }} - 
          {{ result.success ? '成功' : result.error }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { uploadFiles } from '@/api/file'

const uploading = ref(false)
const uploadProgress = ref(0)
const currentUploadingFile = ref('')
const uploadResults = ref<UploadResult[]>([])

const handleUpload = async () => {
  if (fileList.value.length === 0) return
  
  uploading.value = true
  uploadProgress.value = 0
  
  try {
    const formData = new FormData()
    fileList.value.forEach(file => {
      formData.append('files', file.raw!)
    })
    formData.append('path', props.currentPath)
    
    const response = await uploadFiles(formData, {
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total!
        )
      }
    })
    
    uploadResults.value = response.data.results
    showResults.value = true
    
    emit('upload-success', response)
    
  } catch (error) {
    ElMessage.error('上传失败')
    emit('upload-error', error)
  } finally {
    uploading.value = false
  }
}
</script>
```

#### 下载功能
- **单文件下载**: 直接下载选中文件
- **批量下载**: 多文件压缩下载
- **文件夹下载**: 整个文件夹压缩下载
- **下载进度**: 大文件下载进度显示

```typescript
// 下载实现
const downloadItems = async (items: FileItem[]) => {
  try {
    if (items.length === 1 && items[0].type === 'file') {
      // 单文件下载
      const url = `/api/files/download?path=${encodeURIComponent(items[0].path)}`
      window.open(url, '_blank')
    } else {
      // 批量下载
      const response = await downloadMultiple({
        items: items.map(item => ({
          path: item.path,
          type: item.type
        }))
      })
      
      // 创建临时下载链接
      const blob = new Blob([response.data], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `download_${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  } catch (error) {
    ElMessage.error('下载失败')
  }
}
```

### 4. 在线文件编辑

#### 代码编辑器
```vue
<!-- components/file-manager/FileEditor.vue -->
<template>
  <el-dialog 
    v-model="visible" 
    :title="dialogTitle"
    width="80%"
    class="file-editor-dialog">
    
    <div class="editor-container">
      <!-- 文件信息 -->
      <div class="file-info">
        <span class="file-path">{{ filePath }}</span>
        <span class="file-size">{{ formatFileSize(fileSize) }}</span>
      </div>
      
      <!-- 编辑器工具栏 -->
      <div class="editor-toolbar">
        <el-button-group>
          <el-button @click="saveFile" :loading="saving">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          <el-button @click="reloadFile">
            <el-icon><Refresh /></el-icon>
            重新加载
          </el-button>
        </el-button-group>
        
        <div class="editor-status">
          <span>行: {{ currentLine }} 列: {{ currentColumn }}</span>
          <span>编码: {{ encoding }}</span>
          <span>语言: {{ language }}</span>
        </div>
      </div>
      
      <!-- 代码编辑器 -->
      <div ref="editorRef" class="code-editor"></div>
    </div>
    
    <template #footer>
      <el-button @click="closeEditor">取消</el-button>
      <el-button type="primary" @click="saveAndClose" :loading="saving">
        保存并关闭
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor'

const editor = ref<monaco.editor.IStandaloneCodeEditor>()
const content = ref('')
const currentLine = ref(1)
const currentColumn = ref(1)

// 初始化编辑器
onMounted(() => {
  if (editorRef.value) {
    editor.value = monaco.editor.create(editorRef.value, {
      value: content.value,
      language: getLanguageByExtension(fileName.value),
      theme: 'vs-dark',
      fontSize: 14,
      automaticLayout: true,
      wordWrap: 'on'
    })
    
    // 监听光标位置变化
    editor.value.onDidChangeCursorPosition((e) => {
      currentLine.value = e.position.lineNumber
      currentColumn.value = e.position.column
    })
  }
})

// 保存文件
const saveFile = async () => {
  if (!editor.value) return
  
  saving.value = true
  try {
    const newContent = editor.value.getValue()
    await saveFileContent({
      path: filePath.value,
      content: newContent
    })
    
    ElMessage.success('文件保存成功')
    emit('file-saved')
  } catch (error) {
    ElMessage.error('文件保存失败')
  } finally {
    saving.value = false
  }
}
</script>
```

#### 支持的文件类型
- **文本文件**: .txt, .md, .log
- **代码文件**: .js, .ts, .vue, .py, .java, .cpp, .go
- **配置文件**: .json, .yaml, .xml, .ini
- **脚本文件**: .sh, .bat, .ps1
- **Web 文件**: .html, .css, .scss

### 5. 搜索与过滤

#### 实时搜索
```typescript
// 搜索功能实现
const searchKeyword = ref('')
const filteredFiles = computed(() => {
  if (!searchKeyword.value) return files.value
  
  const keyword = searchKeyword.value.toLowerCase()
  return files.value.filter(file => 
    file.name.toLowerCase().includes(keyword) ||
    file.type.toLowerCase().includes(keyword)
  )
})

// 高级搜索
const advancedSearch = ref({
  keyword: '',
  fileType: '',
  sizeMin: 0,
  sizeMax: 0,
  modifiedAfter: '',
  modifiedBefore: '',
  permissions: ''
})

const performAdvancedSearch = async () => {
  try {
    const results = await searchFiles({
      path: currentPath.value,
      recursive: true,
      ...advancedSearch.value
    })
    
    files.value = results.data.items
  } catch (error) {
    ElMessage.error('搜索失败')
  }
}
```

#### 文件过滤器
- **按类型过滤**: 文件、文件夹、链接
- **按大小过滤**: 设置大小范围
- **按时间过滤**: 修改时间范围
- **按权限过滤**: 特定权限筛选
- **显示隐藏文件**: 开关隐藏文件显示

### 6. 批量操作

#### 多选功能
```vue
<template>
  <div class="batch-operations" v-if="selectedFiles.length > 0">
    <div class="selection-info">
      已选中 {{ selectedFiles.length }} 个项目
    </div>
    
    <div class="batch-actions">
      <el-button-group>
        <el-button @click="downloadSelected" :disabled="downloading">
          <el-icon><Download /></el-icon>
          批量下载
        </el-button>
        
        <el-button @click="deleteSelected" type="danger">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
        
        <el-button @click="moveSelected">
          <el-icon><FolderOpened /></el-icon>
          移动到...
        </el-button>
        
        <el-button @click="copySelected">
          <el-icon><CopyDocument /></el-icon>
          复制到...
        </el-button>
      </el-button-group>
      
      <el-button @click="clearSelection" type="info" plain>
        清除选择
      </el-button>
    </div>
  </div>
</template>
```

#### 批量删除确认
```typescript
const deleteSelected = async () => {
  const fileCount = selectedFiles.value.filter(f => f.type === 'file').length
  const folderCount = selectedFiles.value.filter(f => f.type === 'directory').length
  
  const confirmText = `确定要删除 ${fileCount} 个文件和 ${folderCount} 个文件夹吗？此操作不可恢复！`
  
  const result = await ElMessageBox.confirm(
    confirmText,
    '批量删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: true
    }
  )
  
  if (result === 'confirm') {
    try {
      await deleteItems(selectedFiles.value)
      ElMessage.success('删除成功')
      selectedFiles.value = []
      await loadFiles()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }
}
```

## 🔧 技术实现

### API 接口设计

#### 文件浏览 API
```typescript
// api/file.ts
export interface FileItem {
  name: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  permissions: string
  owner: string
  group: string
  modified: string
  path: string
}

export const getDirectoryContents = async (path: string): Promise<FileItem[]> => {
  const response = await axios.get('/files/browse', {
    params: { path }
  })
  return response.data.items
}

export const createFolder = async (params: CreateFolderParams) => {
  return await axios.post('/files/create-folder', params)
}

export const uploadFiles = async (formData: FormData, config?: AxiosRequestConfig) => {
  return await axios.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
  })
}
```

#### 后端路由实现
```javascript
// server/routes/file.js
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = express.Router()

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.body.path || '/tmp'
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
})

// 浏览目录
router.get('/browse', async (req, res) => {
  try {
    const { path: dirPath = '/' } = req.query
    const items = await getDirectoryItems(dirPath)
    
    res.json({
      success: true,
      data: { path: dirPath, items }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '读取目录失败',
      error: error.message
    })
  }
})

// 创建文件夹
router.post('/create-folder', async (req, res) => {
  try {
    const { path: basePath, name } = req.body
    const fullPath = path.join(basePath, name)
    
    await fs.promises.mkdir(fullPath, { recursive: true })
    
    res.json({
      success: true,
      message: '文件夹创建成功'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建文件夹失败'
    })
  }
})

// 文件上传
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const uploadedFiles = req.files.map(file => ({
      name: file.filename,
      path: file.path,
      size: file.size
    }))
    
    res.json({
      success: true,
      message: '文件上传成功',
      data: { files: uploadedFiles }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '文件上传失败'
    })
  }
})
```

### 前端组合式函数

#### useFileManager 核心逻辑
```typescript
// composables/useFileManager.ts
export function useFileManager(fallbackPath?: string) {
  const currentPath = ref('/')
  const files = ref<FileItem[]>([])
  const loading = ref(false)
  const selectedFiles = ref<FileItem[]>([])
  const showHiddenFiles = ref(false)
  const searchKeyword = ref('')
  
  // 计算属性
  const pathParts = computed(() => {
    return currentPath.value.split('/').filter(part => part !== '')
  })
  
  const filteredFiles = computed(() => {
    let result = files.value
    
    // 搜索过滤
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      result = result.filter(file => 
        file.name.toLowerCase().includes(keyword)
      )
    }
    
    // 隐藏文件过滤
    if (!showHiddenFiles.value) {
      result = result.filter(file => !file.name.startsWith('.'))
    }
    
    // 排序：文件夹在前，然后按名称排序
    return result.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name)
    })
  })
  
  // 加载文件列表
  const loadFiles = async (path?: string) => {
    const targetPath = path || currentPath.value
    loading.value = true
    
    try {
      const items = await getDirectoryContents(targetPath)
      files.value = items
      currentPath.value = targetPath
      selectedFiles.value = []
    } catch (error) {
      console.error('加载文件失败:', error)
      ElMessage.error('加载文件失败')
    } finally {
      loading.value = false
    }
  }
  
  // 导航操作
  const navigateTo = async (path: string) => {
    await loadFiles(path)
  }
  
  const goBack = async () => {
    const parentPath = path.dirname(currentPath.value)
    await navigateTo(parentPath === currentPath.value ? '/' : parentPath)
  }
  
  const goHome = async () => {
    await navigateTo('/')
  }
  
  // 文件操作
  const handleItemDoubleClick = async (item: FileItem, editCallback?: Function) => {
    if (item.type === 'directory') {
      await navigateTo(item.path)
    } else if (editCallback && isEditableFile(item.name)) {
      editCallback(item)
    }
  }
  
  const deleteItems = async (items: FileItem[]) => {
    try {
      await deleteFiles({ items })
      ElMessage.success('删除成功')
      await loadFiles()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }
  
  return {
    // 状态
    currentPath,
    files,
    loading,
    selectedFiles,
    showHiddenFiles,
    searchKeyword,
    
    // 计算属性
    pathParts,
    filteredFiles,
    
    // 方法
    loadFiles,
    navigateTo,
    goBack,
    goHome,
    handleItemDoubleClick,
    deleteItems,
    // ... 其他方法
  }
}
```

## 🎨 用户界面设计

### 响应式布局
```scss
.file-manager-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  
  .file-toolbar {
    flex-shrink: 0;
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color);
  }
  
  .file-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    
    .file-sidebar {
      width: 250px;
      border-right: 1px solid var(--el-border-color);
      
      @media (max-width: 768px) {
        display: none;
      }
    }
    
    .file-main {
      flex: 1;
      overflow: auto;
    }
  }
}
```

### 主题适配
```scss
// 文件图标
.file-icon {
  margin-right: 8px;
  
  &.folder {
    color: var(--el-color-warning);
  }
  
  &.file {
    color: var(--el-color-info);
  }
  
  &.executable {
    color: var(--el-color-success);
  }
  
  &.image {
    color: var(--el-color-primary);
  }
}

// 拖拽上传区域
.upload-dragger {
  border: 2px dashed var(--el-border-color);
  border-radius: 6px;
  padding: 40px;
  text-align: center;
  background: var(--el-fill-color-lighter);
  
  &.is-dragover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}
```

## 🔒 安全考虑

### 路径安全
```javascript
// 防止路径遍历攻击
const sanitizePath = (inputPath) => {
  // 移除危险字符
  const safePath = inputPath.replace(/\.\./g, '')
  
  // 确保路径在允许范围内
  const normalizedPath = path.normalize(safePath)
  const allowedRoot = '/home'
  
  if (!normalizedPath.startsWith(allowedRoot)) {
    throw new Error('Access denied')
  }
  
  return normalizedPath
}
```

### 文件类型验证
```javascript
const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'text/plain', 'application/json',
  'application/zip'
]

const validateFileType = (file) => {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.mimetype)) {
    throw new Error('File type not allowed')
  }
}
```

### 权限检查
```javascript
const checkFilePermissions = async (filePath, operation) => {
  try {
    const stats = await fs.promises.stat(filePath)
    const permissions = stats.mode & parseInt('777', 8)
    
    // 检查用户权限
    if (operation === 'read' && !(permissions & 0o444)) {
      throw new Error('No read permission')
    }
    
    if (operation === 'write' && !(permissions & 0o222)) {
      throw new Error('No write permission')
    }
    
    return true
  } catch (error) {
    throw new Error('Permission denied')
  }
}
```

## 📊 性能优化

### 虚拟滚动
```vue
<!-- 大文件列表虚拟滚动 -->
<template>
  <VirtualList
    :items="filteredFiles"
    :item-height="50"
    :container-height="400"
    #default="{ item, index }">
    
    <FileListItem 
      :file="item" 
      :index="index"
      @click="handleFileClick" />
  </VirtualList>
</template>
```

### 懒加载
```typescript
// 大目录分页加载
const loadFilesWithPagination = async (path: string, page = 1, pageSize = 100) => {
  const response = await getDirectoryContents(path, {
    page,
    pageSize,
    sort: 'name',
    order: 'asc'
  })
  
  if (page === 1) {
    files.value = response.items
  } else {
    files.value.push(...response.items)
  }
  
  return response.hasMore
}
```

### 缓存策略
```typescript
// 目录内容缓存
const directoryCache = new Map<string, { data: FileItem[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

const getCachedDirectory = (path: string) => {
  const cached = directoryCache.get(path)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

const setCachedDirectory = (path: string, data: FileItem[]) => {
  directoryCache.set(path, {
    data,
    timestamp: Date.now()
  })
}
```

## 🐛 错误处理

### 网络错误
```typescript
// API 错误处理
const handleApiError = (error: any) => {
  if (error.code === 'NETWORK_ERROR') {
    ElMessage.error('网络连接失败，请检查网络设置')
  } else if (error.code === 'PERMISSION_DENIED') {
    ElMessage.error('权限不足，无法执行此操作')
  } else if (error.code === 'FILE_NOT_FOUND') {
    ElMessage.error('文件或目录不存在')
  } else {
    ElMessage.error('操作失败: ' + error.message)
  }
}
```

### 用户操作错误
```typescript
// 文件操作验证
const validateFileOperation = (operation: string, files: FileItem[]) => {
  if (files.length === 0) {
    throw new Error('请先选择文件')
  }
  
  if (operation === 'edit' && files.length > 1) {
    throw new Error('一次只能编辑一个文件')
  }
  
  if (operation === 'edit' && files[0].type === 'directory') {
    throw new Error('无法编辑文件夹')
  }
}
```

---

文件管理器是系统的重要组成部分，为用户提供了完整的文件系统操作能力，通过直观的界面和强大的功能，大大提升了服务器文件管理的效率。
