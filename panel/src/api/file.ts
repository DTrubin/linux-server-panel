import axios from '@/utils/axios'
import axiosLib from 'axios'
import { useAuthStore } from '@/store/modules/auth'
import { SERVER_PORT, API_BASE_URL } from '@/config/constants'
import type {
  FileItem,
  UploadParams,
  UploadResponse,
  UploadProgress,
  FileOperationParams,
  FileOperationResponse,
  RenameParams,
  CreateFolderParams,
  SearchParams,
  SearchResponse,
  FileContentParams,
  FileContentResponse,
  SaveFileParams,
  FilePermissionParams,
  CompressParams,
  ExtractParams,
  BackupTask,
  BackupRecord,
  BackupParams,
  RestoreParams,
  DiskUsage,
  FileSystemInfo
} from '@/types/file'

// 创建一个专门用于文件下载的axios实例
const downloadAxios = axiosLib.create({
  baseURL: `http://127.0.0.1:${SERVER_PORT}${API_BASE_URL}`,
  timeout: 30000 // 下载可能需要更长时间
})

// 为下载实例添加认证拦截器
downloadAxios.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * 文件管理 API
 */

// 获取目录内容
export const getDirectoryContents = async (path: string = '/'): Promise<FileItem[]> => {
  try {
    const response = await axios.get<any>('/files/browse', {
      params: { path }
    }) as any

    // 现在响应拦截器返回完整的响应对象，需要适配
    if (!response) {
      return []
    }

    // 如果是统一的API响应格式 {success: true, data: {items: []}}
    if (response.success && response.data?.items) {
      return response.data.items
    }

    // 如果直接是数组格式
    if (Array.isArray(response)) {
      return response
    }

    // 如果是 {items: []} 格式
    if (response.items && Array.isArray(response.items)) {
      return response.items
    }

    // 兜底返回空数组
    return []
  } catch (error) {
    console.error('获取目录内容失败:', error)
    throw error
  }
}

// 上传文件
export const uploadFiles = async (params: UploadParams, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
  try {
    const formData = new FormData()
    params.files.forEach(file => {
      formData.append('files', file)
    })

    // 将overwrite作为FormData传递
    if (params.overwrite !== undefined) {
      formData.append('overwrite', String(params.overwrite))
    }
    if (params.sessionId) {
      formData.append('sessionId', params.sessionId)
    }

    // 将路径作为query参数传递
    const queryParams = new URLSearchParams()
    queryParams.append('path', params.path)
    if (params.overwrite !== undefined) {
      queryParams.append('overwrite', String(params.overwrite))
    }

    const response = await axios.post(`/files/upload?${queryParams.toString()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      }
    })

    // 响应拦截器已经处理了统一格式，直接返回服务器响应数据
    return response as unknown as UploadResponse
  } catch (error) {
    console.error('文件上传失败:', error)
    throw error
  }
}

// 获取上传进度
export const getUploadProgress = async (sessionId: string): Promise<UploadProgress> => {
  try {
    const response = await axios.get<any>(`/files/upload-progress/${sessionId}`)
    return response.data
  } catch (error) {
    console.error('获取上传进度失败:', error)
    throw error
  }
}

// 清除上传进度
export const clearUploadProgress = async (sessionId: string): Promise<void> => {
  try {
    await axios.delete(`/files/upload-progress/${sessionId}`)
  } catch (error) {
    console.error('清除上传进度失败:', error)
    throw error
  }
}

// 下载文件
export const downloadFile = async (filePath: string): Promise<Blob> => {
  try {
    const response = await downloadAxios.get('/files/download', {
      params: { path: filePath },
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('文件下载失败:', error)
    throw error
  }
}

// 批量下载文件（压缩为zip）
export const downloadFiles = async (filePaths: string[], fileName?: string): Promise<Blob> => {
  try {
    const response = await downloadAxios.post('/files/batch-download', {
      paths: filePaths,
      fileName: fileName || 'download.zip'
    }, {
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    console.error('批量下载失败:', error)
    throw error
  }
}

// 文件操作（复制、移动、删除）
export const fileOperation = async (params: FileOperationParams): Promise<FileOperationResponse> => {
  try {
    return await axios.post<FileOperationResponse>('/files/operation', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('文件操作失败:', error)
    throw error
  }
}

// 重命名文件/文件夹
export const renameFile = async (params: RenameParams): Promise<FileOperationResponse> => {
  try {
    return await axios.post<FileOperationResponse>('/files/rename', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('重命名失败:', error)
    throw error
  }
}

// 创建文件夹
export const createFolder = async (params: CreateFolderParams): Promise<FileOperationResponse> => {
  try {
    return await axios.post<FileOperationResponse>('/files/directory', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('创建文件夹失败:', error)
    throw error
  }
}

// 搜索文件
export const searchFiles = async (params: SearchParams): Promise<SearchResponse> => {
  try {
    return await axios.get<SearchResponse>('/files/search', { params }) as unknown as SearchResponse
  } catch (error) {
    console.error('文件搜索失败:', error)
    throw error
  }
}

// 获取文件内容
export const getFileContent = async (params: FileContentParams): Promise<FileContentResponse> => {
  try {
    return await axios.get<FileContentResponse>('/files/content', { params }) as unknown as FileContentResponse
  } catch (error) {
    console.error('获取文件内容失败:', error)
    throw error
  }
}

// 保存文件内容
export const saveFileContent = async (params: SaveFileParams): Promise<FileOperationResponse> => {
  try {
    return await axios.put<FileOperationResponse>('/files/content', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('保存文件失败:', error)
    throw error
  }
}

// 修改文件权限
export const changeFilePermissions = async (params: FilePermissionParams): Promise<FileOperationResponse> => {
  try {
    return await axios.post<FileOperationResponse>('/files/permissions', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('修改文件权限失败:', error)
    throw error
  }
}

// 压缩文件
export const compressFiles = async (params: CompressParams): Promise<FileOperationResponse> => {
  try {
    return await axios.post<FileOperationResponse>('/files/compress', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('文件压缩失败:', error)
    throw error
  }
}

// 解压文件
export const extractArchive = async (params: ExtractParams): Promise<FileOperationResponse> => {
  try {
    return await axios.post<FileOperationResponse>('/files/extract', params) as unknown as FileOperationResponse
  } catch (error) {
    console.error('文件解压失败:', error)
    throw error
  }
}
