// 统一的 API 响应接口定义

// 基础 API 响应结构
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

// 分页数据结构
export interface PaginationData<T = any> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 分页响应
export interface PaginatedResponse<T = any> extends ApiResponse<PaginationData<T>> {
  success: true
}

// 文件上传响应
export interface UploadResponse extends ApiResponse {
  data?: {
    url?: string
    filename?: string
    size?: number
  }
}

// 认证相关响应类型
export interface LoginResponseData {
  accessToken: string
  expiresIn: number
  rememberMe?: boolean
  user: {
    id: string
    username: string
    email?: string
    phone?: string
  }
}

export interface LoginResponse extends ApiResponse<LoginResponseData> {
  success: true
}

// 用户信息响应
export interface UserInfoData {
  id: string
  username: string
  email?: string
  phone?: string
  nickname?: string
  createdAt?: string
  lastLoginAt?: string
  status?: 'active' | 'inactive'
}

export interface UserInfoResponse extends ApiResponse<UserInfoData> {
  success: true
}

// 头像响应
export interface AvatarResponseData {
  avatar: string
  username: string
}

export interface AvatarResponse extends ApiResponse<AvatarResponseData> {
  success: true
}

// 通用成功响应（只有 success 和 message）
export interface SuccessResponse extends ApiResponse<never> {
  success: true
  message: string
}

// 请求参数类型
export interface LoginParams {
  username: string
  password: string
  rememberMe?: boolean
}

export interface RegisterParams {
  username: string
  password: string
  email?: string
  phone?: string
}

export interface ChangePasswordParams {
  currentPassword: string
  newPassword: string
}

export interface UpdateUserInfoParams {
  id: string
  username?: string
  email?: string
  phone?: string
  nickname?: string
}
