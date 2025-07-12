

// 基本文件项
export interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: string
  path?: string
  permissions: string
  owner: string
  group: string
  isHidden: boolean
  extension?: string
  mimeType?: string
}

// 文件内容响应
export interface FileContentResponse {
  content: string
  encoding: string
  size: number
  mimeType: string
}

// 文件操作参数
export interface FileOperationParams {
  operation: string
  sourcePaths: string[]
  targetPath: string
}

// 创建文件夹参数
export interface CreateFolderParams {
  path: string
  name: string
}

// 上传文件参数
export interface UploadFilesParams {
  path: string
  files: File[]
}

// 获取文件内容参数
export interface GetFileContentParams {
  path: string
}

// 保存文件内容参数
export interface SaveFileContentParams {
  path: string
  content: string
}

// 视图模式
export type ViewMode = 'list' | 'grid'

// 文件操作类型
export type FileOperation = 'copy' | 'move' | 'delete' | 'rename'

// 编码类型
export type EncodingType = 'utf-8' | 'gbk' | 'ascii'


export const FileTypeMap = {
  // 文档类型
  txt: { icon: 'Document', category: 'text', editable: true },
  md: { icon: 'Document', category: 'text', editable: true },
  json: { icon: 'Document', category: 'text', editable: true },
  xml: { icon: 'Document', category: 'text', editable: true },
  yml: { icon: 'Document', category: 'text', editable: true },
  yaml: { icon: 'Document', category: 'text', editable: true },

  // 代码类型
  js: { icon: 'Document', category: 'code', editable: true },
  ts: { icon: 'Document', category: 'code', editable: true },
  vue: { icon: 'Document', category: 'code', editable: true },
  html: { icon: 'Document', category: 'code', editable: true },
  css: { icon: 'Document', category: 'code', editable: true },
  scss: { icon: 'Document', category: 'code', editable: true },
  less: { icon: 'Document', category: 'code', editable: true },

  // 脚本类型
  py: { icon: 'Document', category: 'script', editable: true },
  sh: { icon: 'Document', category: 'script', editable: true },
  bash: { icon: 'Document', category: 'script', editable: true },

  // 配置文件
  conf: { icon: 'Document', category: 'config', editable: true },
  ini: { icon: 'Document', category: 'config', editable: true },
  cfg: { icon: 'Document', category: 'config', editable: true },

  // 图片类型
  jpg: { icon: 'Picture', category: 'image', editable: false },
  jpeg: { icon: 'Picture', category: 'image', editable: false },
  png: { icon: 'Picture', category: 'image', editable: false },
  gif: { icon: 'Picture', category: 'image', editable: false },
  svg: { icon: 'Picture', category: 'image', editable: true },

  // 压缩文件
  zip: { icon: 'Files', category: 'archive', editable: false },
  rar: { icon: 'Files', category: 'archive', editable: false },
  tar: { icon: 'Files', category: 'archive', editable: false },
  gz: { icon: 'Files', category: 'archive', editable: false },

  // 默认
  default: { icon: 'Document', category: 'unknown', editable: false }
}
