// 认证相关类型定义
// 导入统一的 API 类型
import type {
  ApiResponse,
  LoginParams as BaseLoginParams,
  RegisterParams as BaseRegisterParams,
  ChangePasswordParams as BaseChangePasswordParams,
  UpdateUserInfoParams as BaseUpdateUserInfoParams,
  LoginResponse,
  UserInfoResponse,
  AvatarResponse,
  SuccessResponse
} from './api'

// 重新导出基础类型
export type LoginParams = BaseLoginParams
export type RegisterParams = BaseRegisterParams
export type ChangePasswordParams = BaseChangePasswordParams
export type UpdateUserInfoParams = BaseUpdateUserInfoParams

// 重新导出响应类型
export { type LoginResponse, type UserInfoResponse, type AvatarResponse, type SuccessResponse }

// 用户信息类型（与 API 响应中的 data 部分一致）
export interface UserInfo {
  id: string
  username: string
  email?: string
  phone?: string
  nickname?: string
  createdAt?: string
  lastLoginAt?: string
  status?: 'active' | 'inactive'
}

// 注册响应类型
export interface RegisterResponse extends ApiResponse<{ user: UserInfo }> {
  success: true
}

// 刷新令牌相关（如果需要）
export interface RefreshTokenResponse extends ApiResponse<{ accessToken: string; expiresIn: number }> {
  success: true
}
