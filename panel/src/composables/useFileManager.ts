import { ref, computed, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as fileApi from '@/api/file'
import axios from '@/utils/axios'
import type { FileOperationResponse } from '@/types/file'
import type { FileItem } from '@/types/fileManager'

// API函数调用
const getDirectoryContents = async (path: string): Promise<FileItem[]> => {
  try {
    const response = await fileApi.getDirectoryContents(path) as any

    // 处理后端返回的数据结构：{success: true, data: {items: [...]}}
    let items: any[] = []

    if (!response) {
      console.warn('API返回空响应')
      return []
    }

    if (Array.isArray(response)) {
      items = response
    } else if (response?.data?.items && Array.isArray(response.data.items)) {
      items = response.data.items
    } else if (response?.items && Array.isArray(response.items)) {
      items = response.items
    } else {
      console.warn('无法解析API返回的数据结构:', response)
      return []
    }

    return items.map((item: any) => ({
      name: item.name,
      type: item.type,
      size: item.size,
      modified: new Date(item.modified).toLocaleString('zh-CN'),
      path: item.path,
      permissions: typeof item.permissions === 'string'
        ? item.permissions
        : (item.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'),
      owner: item.owner || 'unknown',
      group: item.group || 'unknown',
      isHidden: item.name.startsWith('.')
    }))
  } catch (error) {
    console.error('获取目录内容失败:', error)
    ElMessage.error('获取目录内容失败')
    return []
  }
}

const uploadFiles = async (params: { path: string; files: File[] }) => {
  try {
    await fileApi.uploadFiles({
      path: params.path,
      files: params.files,
      overwrite: false
    })
  } catch (error) {
    console.error('文件上传失败:', error)
    throw error
  }
}

const getFileContent = async (params: { path: string }) => {
  try {
    const response = await fileApi.getFileContent(params) as any
    // 服务器返回格式：{success: true, data: {content, size, ...}}
    const data = response.data || response
    return {
      content: data.content,
      encoding: data.encoding || 'utf-8',
      size: data.size,
      mimeType: 'text/plain'
    }
  } catch (error) {
    console.error('获取文件内容失败:', error)
    throw error
  }
}

const saveFileContent = async (params: { path: string; content: string }): Promise<FileOperationResponse> => {
  return await fileApi.saveFileContent(params)
}

const fileOperation = async (params: { operation: string; sourcePaths: string[]; targetPath?: string }) => {
  try {
    if (params.operation === 'delete') {
      // 删除操作使用专门的删除接口
      const response = await axios.delete('/files/items', {
        data: { paths: params.sourcePaths }
      })
      return response.data
    } else {
      // 其他操作使用通用的文件操作接口
      await fileApi.fileOperation({
        operation: params.operation as 'copy' | 'move' | 'delete',
        sourcePaths: params.sourcePaths,
        targetPath: params.targetPath || ''
      })
    }
  } catch (error) {
    console.error('文件操作失败:', error)
    throw error
  }
}

// 路径工具函数
const isWindowsPath = (path: string): boolean => {
  // 根据后端返回的数据，Windows路径也是以 / 开头，所以这里暂时都当作Unix路径处理
  // 除非有明确的Windows路径标识（如包含 C:\ 这样的格式）
  return path.includes(':\\')
}

const buildPath = (parts: string[], isWindows: boolean): string => {
  if (isWindows) {
    const path = parts.join('\\')
    // 确保盘符后有冒号和反斜杠
    if (parts.length === 1 && !parts[0].endsWith(':')) {
      return parts[0] + ':\\'
    }
    if (!path.endsWith('\\') && parts.length === 1) {
      return path + '\\'
    }
    return path
  } else {
    return '/' + parts.join('/')
  }
}

export function useFileManager(fallbackPath?: string) {
  // 状态管理
  const currentPath = ref(fallbackPath || '/')
  const files = shallowRef<FileItem[]>([])
  const loading = ref(false)
  const selectedFiles = ref<FileItem[]>([])
  const showHiddenFiles = ref(false)
  const searchKeyword = ref('')

  // 初始化路径
  const initializePath = async () => {
    try {
      const initialPath = '/'
      currentPath.value = initialPath
      await loadFiles()
    } catch (error) {
      console.error('初始化路径失败:', error)
      // 使用fallback路径或默认路径
      currentPath.value = fallbackPath || '/'
      await loadFiles()
    }
  }

  // 计算属性
  const pathParts = computed(() => {
    const path = currentPath.value

    if (isWindowsPath(path)) {
      // Windows 路径如 C:\folder\subfolder
      return path.split('\\').filter(Boolean)
    } else {
      // Unix/Linux 路径如 /folder/subfolder 或 Windows盘符路径如 /d:
      const parts = path.split('/').filter(Boolean)

      // 处理Windows盘符显示：确保盘符正确显示为 D: 而不是 d
      return parts.map(part => {
        // 如果是盘符格式（如 d:），保持原样
        if (part.match(/^[a-zA-Z]:$/)) {
          return part.toUpperCase()
        }
        return part
      })
    }
  })

  const filteredFiles = computed(() => {
    let result = [...files.value]

    // 隐藏文件过滤
    if (!showHiddenFiles.value) {
      result = result.filter(file => !file.name.startsWith('.'))
    }

    // 搜索关键词过滤
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase().trim()
      result = result.filter(file =>
        file.name.toLowerCase().includes(keyword)
      )
    }

    // 排序：文件夹在前，然后按字典序排序
    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' })
    })
  })

  // 核心方法
  const loadFiles = async () => {
    loading.value = true
    try {
      const response = await getDirectoryContents(currentPath.value)
      const frozenFiles = (response || []).map(file => Object.freeze({ ...file }))
      files.value = frozenFiles as FileItem[]
    } catch (error) {
      ElMessage.error('加载文件列表失败')
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const navigateTo = (path: string) => {
    currentPath.value = path
    loadFiles()
  }

  const navigateToIndex = (index: number) => {
    const parts = pathParts.value.slice(0, index + 1)
    let path: string

    // 检查当前路径类型来决定如何重构路径
    if (isWindowsPath(currentPath.value)) {
      path = buildPath(parts, true)
    } else {
      // Unix/Linux路径或Windows盘符路径（如 /d:）
      // 将parts转换回小写（因为pathParts中盘符被转为大写显示）
      const normalizedParts = parts.map(part => {
        if (part.match(/^[A-Z]:$/)) {
          return part.toLowerCase()
        }
        return part
      })
      path = '/' + normalizedParts.join('/')
    }

    navigateTo(path)
  }

  const goBack = async () => {
    const parts = pathParts.value
    if (parts.length > 0) {
      parts.pop()
      let path: string

      if (parts.length > 0) {
        if (isWindowsPath(currentPath.value)) {
          path = buildPath(parts, true)
        } else {
          // Unix/Linux路径或Windows盘符路径（如 /d:）
          const normalizedParts = parts.map(part => {
            if (part.match(/^[A-Z]:$/)) {
              return part.toLowerCase()
            }
            return part
          })
          path = '/' + normalizedParts.join('/')
        }
      } else {
        // 返回初始路径
        path = '/'
      }
      navigateTo(path)
    }
  }

  const goHome = async () => {
    const homePath = '/'
    navigateTo(homePath)
  }

  const toggleHiddenFiles = () => {
    showHiddenFiles.value = !showHiddenFiles.value
  }

  const handleItemDoubleClick = (item: FileItem, editFileCallback?: (file: FileItem) => void) => {
    // 文件夹，直接导航到该路径
    if (item.type === 'directory' && item.path) {
      navigateTo(item.path)
    }
    // 文件，尝试编辑
    else if (item.type === 'file' && item.path) {
      // 定义常见的文本文件扩展名
      const textFileExtensions = /\.(txt|md|log|js|ts|json|xml|html|css|scss|sass|less|vue|jsx|tsx|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|sh|bat|ps1|sql|yaml|yml|toml|ini|conf|cfg|properties|gitignore|gitattributes|dockerfile|makefile|readme|license|changelog)$/i

      // 检查是否为文本文件且大小在5MB以内
      if (textFileExtensions.test(item.name) && item.size <= 5 * 1024 * 1024) {
        if (editFileCallback) {
          editFileCallback(item)
        }
        return
      }

      // 图片文件
      if (item.name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i)) {
        console.log(`双击图片文件: ${item.name}, 路径: ${item.path}`)
        // 例如：viewImage(item)
      }
      // 视频文件
      else if (item.name.match(/\.(mp4|mkv|webm|avi|mov|wmv|flv|m4v)$/i)) {
        console.log(`双击视频文件: ${item.name}, 路径: ${item.path}`)
        // 例如：playVideo(item)
      }
      // 其他文本文件（超过5MB的）
      else if (textFileExtensions.test(item.name)) {
        ElMessage.warning(`文件 "${item.name}" 大小超过5MB，无法直接打开编辑`)
      }
    }
  }

  const handleSelectionChange = (selection: FileItem[]) => {
    selectedFiles.value = selection
  }

  // 文件操作方法
  const createFolder = async (name: string): Promise<void> => {
    if (!name.trim()) {
      ElMessage.warning('请输入文件夹名称')
      return
    }

    try {
      const res = await fileApi.createFolder({
        path: currentPath.value,
        name: name
      })

      // 检查响应是否成功
      if (res && res.success) {
        ElMessage.success(res.message || '文件夹创建成功')
        await loadFiles()
      } else {
        // 如果响应格式不正确，显示通用错误
        ElMessage.error(res?.message || '文件夹创建失败')
        console.error('创建文件夹失败，响应:', res)
      }
    } catch (error: any) {
      console.error('创建文件夹失败:', error)
      ElMessage.error('发生未知错误，无法创建文件夹')
    }
  }

  const createFile = async (fileName: string, content = '') => {
    if (!fileName.trim()) {
      ElMessage.warning('请输入文件名')
      return
    }

    try {
      // 根据后端API的路径格式，统一使用 / 作为分隔符
      let newFilePath: string

      if (currentPath.value.endsWith('/')) {
        newFilePath = `${currentPath.value}${fileName}`
      } else {
        newFilePath = `${currentPath.value}/${fileName}`
      }

      // 直接保存文件内容到服务器
      let res = await fileApi.saveFileContent({
        path: newFilePath,
        content: content,
        create: true
      })
      if (res && res.success) {
        ElMessage.success('文件创建成功')
        await loadFiles()
      } else {
        ElMessage.error(res?.message || '文件创建失败')
        console.error('创建文件失败，响应:', res)
      }
    } catch (error: any) {
      console.error('创建文件失败:', error)
      ElMessage.error('创建文件失败')
    }
  }

  const uploadFileList = async (fileList: File[]) => {
    try {
      await uploadFiles({
        path: currentPath.value,
        files: fileList
      })
      ElMessage.success('文件上传成功')
      await loadFiles()
      return true
    } catch (error: any) {
      console.error('文件上传失败:', error)
      if (error?.response?.data) {
        const errorData = error.response.data
        ElMessage.error(`文件上传失败: ${errorData.message}` || '文件上传失败')
      } else {
        ElMessage.error('文件上传失败：网络错误或服务器无响应')
      }
      return false
    }
  }

  const deleteItems = async (items: FileItem[]) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${items.length} 个项目吗？`,
        '确认删除',
        {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消'
        }
      )

      await fileOperation({
        operation: 'delete',
        sourcePaths: items.map(item => item.path!).filter(Boolean),
        targetPath: ''
      })
      ElMessage.success('删除成功')
      selectedFiles.value = []
      await loadFiles()
      return true
    } catch (error: any) {
      if (error === 'cancel') {
        return false
      }

      console.error('删除失败:', error)
      if (error?.response?.data) {
        const errorData = error.response.data
        // 如果是批量删除，可能会有部分失败
        if (errorData.code === 'PARTIAL_DELETE_FAILED' && errorData.data?.results) {
          const failedItems = errorData.data.results.filter((r: any) => !r.success)
          const errorDetails = failedItems
            .map((item: any) => `<li>${item.path}: ${item.message}</li>`)
            .join('')
          ElMessageBox.alert(`<strong>部分项目删除失败:</strong><ul>${errorDetails}</ul>`, '删除错误', {
            dangerouslyUseHTMLString: true,
            type: 'error'
          })
        } else {
          ElMessage.error(errorData.message || '删除失败')
        }
      } else {
        ElMessage.error('删除失败：网络错误或服务器无响应')
      }
      // 即使有部分失败，也刷新一下列表
      selectedFiles.value = []
      await loadFiles()
      return false
    }
  }

  const downloadItems = async (items: FileItem[]) => {
    if (items.length === 0) {
      ElMessage.warning('请选择要下载的文件或文件夹')
      return false
    }

    try {
      // 过滤出有效路径的项目
      const validItems = items.filter(item => item.path)

      if (validItems.length === 0) {
        ElMessage.warning('没有可下载的项目')
        return false
      }

      // 分离文件和文件夹
      const files = validItems.filter(item => item.type === 'file')
      const directories = validItems.filter(item => item.type === 'directory')

      if (validItems.length === 1) {
        const item = validItems[0]

        if (item.type === 'file') {
          // 单个文件直接下载
          const blob = await fileApi.downloadFile(item.path!)
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = item.name
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          ElMessage.success('文件下载成功')
        } else if (item.type === 'directory') {
          // 单个文件夹打包下载
          const zipFileName = `${item.name}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.zip`
          const blob = await fileApi.downloadFiles([item.path!], zipFileName)
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = zipFileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          ElMessage.success('文件夹打包下载成功')
        }
      } else {
        // 多个项目分开下载
        let downloadCount = 0

        // 下载所有文件（直接下载）
        for (const file of files) {
          try {
            const blob = await fileApi.downloadFile(file.path!)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = file.name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            downloadCount++

            // 添加小延迟避免浏览器下载限制
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`下载文件 ${file.name} 失败:`, error)
            ElMessage.error(`下载文件 ${file.name} 失败`)
          }
        }

        // 下载所有文件夹（压缩后下载）
        for (const directory of directories) {
          try {
            const zipFileName = `${directory.name}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.zip`
            const blob = await fileApi.downloadFiles([directory.path!], zipFileName)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = zipFileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            downloadCount++

            // 添加小延迟避免浏览器下载限制
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`下载文件夹 ${directory.name} 失败:`, error)
            ElMessage.error(`下载文件夹 ${directory.name} 失败`)
          }
        }

        const totalItems = files.length + directories.length
        if (downloadCount === totalItems) {
          ElMessage.success(`下载完成：${files.length} 个文件，${directories.length} 个文件夹`)
        } else {
          ElMessage.warning(`部分下载完成：${downloadCount}/${totalItems} 个项目`)
        }
      }

      selectedFiles.value = []
      return true
    } catch (error) {
      console.error('下载失败:', error)
      ElMessage.error('下载失败')
      return false
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
    initializePath,
    loadFiles,
    navigateTo,
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
    downloadItems,
    saveFileContent,
    getFileContent
  }
}
