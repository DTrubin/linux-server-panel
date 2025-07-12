/**
 * 文件管理相关类型定义
 */

// 文件/文件夹基本信息
export interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: string
  permissions: string
  path: string
  owner?: string
  group?: string
  isHidden?: boolean
  extension?: string
  mimeType?: string
}

// 文件上传参数
export interface UploadParams {
  files: File[]
  path: string
  overwrite?: boolean
  sessionId?: string
}

// 文件上传响应
export interface UploadResponse {
  success: boolean
  message: string
  data: {
    uploadedFiles: {
      name: string
      size: number
      path: string
      mimeType?: string
    }[]
    failed?: {
      name: string
      error: string
      code?: string
    }[]
    summary: {
      total: number
      success: number
      failed: number
    }
    results?: any[] // 向后兼容
  }
}

// 上传进度信息
export interface UploadProgress {
  total: number
  completed: number
  currentFile: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  percentage?: number
}

// 文件操作参数
export interface FileOperationParams {
  sourcePaths: string[]
  targetPath: string
  operation: 'copy' | 'move' | 'delete'
  overwrite?: boolean
}

// 文件操作响应
export interface FileOperationResponse {
  success: boolean
  message?: string
  data?: {
    path: string
    success: boolean
    error?: string
  }[]
}

// 文件重命名参数
export interface RenameParams {
  oldPath: string
  newPath: string
}

// 创建文件夹参数
export interface CreateFolderParams {
  path: string
  name: string
  permissions?: string
}

// 文件搜索参数
export interface SearchParams {
  query: string
  path: string
  includeHidden?: boolean
  fileType?: 'file' | 'directory' | 'all'
  extension?: string
}

// 文件搜索响应
export interface SearchResponse {
  results: FileItem[]
  total: number
}

// 文件内容参数
export interface FileContentParams {
  path: string
  encoding?: string
}

// 文件内容响应
export interface FileContentResponse {
  success: boolean
  message: string
  data: {
    path: string
    content: string
    size: number
    modified: string
    encoding: string
  }
}

// 保存文件内容参数
export interface SaveFileParams {
  path: string
  content?: string
  create?: boolean
  encoding?: string
}

// 文件权限参数
export interface FilePermissionParams {
  path: string
  permissions: string
  recursive?: boolean
}

// 文件压缩参数
export interface CompressParams {
  sourcePaths: string[]
  archivePath: string
  type: 'zip' | 'tar' | 'tar.gz' | 'tar.bz2'
  compression?: number
}

// 文件解压参数
export interface ExtractParams {
  archivePath: string
  targetPath: string
  overwrite?: boolean
}

// 备份任务
export interface BackupTask {
  id?: string
  name: string
  source: string
  destination: string
  schedule: string
  compression: boolean
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

// 备份记录
export interface BackupRecord {
  id: string
  taskId?: string
  name: string
  path: string
  size: number
  createdAt: string
  status: 'success' | 'failed' | 'in-progress'
  type: 'manual' | 'scheduled'
  error?: string
}

// 备份操作参数
export interface BackupParams {
  name: string
  sourcePaths: string[]
  destination: string
  compression?: boolean
  type?: 'full' | 'incremental'
}

// 恢复参数
export interface RestoreParams {
  backupId: string
  targetPath: string
  overwrite?: boolean
}

// 磁盘使用信息
export interface DiskUsage {
  path: string
  total: number
  used: number
  available: number
  usage: number // 使用率百分比
}

// 文件系统信息
export interface FileSystemInfo {
  mountPoint: string
  fileSystem: string
  total: number
  used: number
  available: number
  usage: number
}
