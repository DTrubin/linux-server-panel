import axios from '@/utils/axios'
import type {
  LoginParams,
  LoginResponse,
  RegisterParams,
  RegisterResponse,
  UserInfoResponse,
  RefreshTokenResponse,
  UserInfo,
  ChangePasswordParams,
  UpdateUserInfoParams,
  SuccessResponse,
  AvatarResponse
} from '@/types/auth'

// 登录接口
const login = async (data: LoginParams): Promise<LoginResponse> => {
  try {
    const response = await axios.post<LoginResponse>('/auth/login', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      transformRequest: [
        (params) => {
          return Object.keys(params)
            .map(
              (key) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
            )
            .join('&')
        }
      ]
    })
    // axios拦截器已经返回了response.data，所以这里直接返回response
    return response as unknown as LoginResponse
  } catch (error) {
    console.error('登录失败:', error)
    throw error
  }
}

// 获取用户信息
const getUserInfo = async (): Promise<UserInfoResponse> => {
  try {
    const response = await axios.get<UserInfoResponse>('/auth/userinfo')
    return response.data
  } catch (error) {
    console.error('Get user info failed:', error)
    throw error
  }
}

// 刷新Token
const refreshToken = async (): Promise<RefreshTokenResponse> => {
  try {
    const response = await axios.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken: localStorage.getItem('refreshToken')
    })
    return response.data
  } catch (error) {
    console.error('Refresh token failed:', error)
    throw error
  }
}

// 检查Token是否有效
export const checkToken = async (): Promise<boolean> => {
  try {
    await axios.get('/auth/check')
    return true
  } catch {
    return false
  }
}

// 注册接口
const register = async (data: RegisterParams): Promise<RegisterResponse> => {
  try {
    const response = await axios.post<RegisterResponse>('/auth/register', data)
    return response.data
  } catch (error) {
    console.error('Register failed:', error)
    throw error
  }
}

// 更新用户信息接口
const updateUserInfo = async (data: UpdateUserInfoParams): Promise<UserInfoResponse> => {
  try {
    const response = await axios.put<UserInfoResponse>('/auth/userinfo', data)
    return response as unknown as UserInfoResponse
  } catch (error) {
    console.error('API updateUserInfo failed:', error)
    throw error
  }
}

// 修改密码接口
const changePassword = async (data: ChangePasswordParams): Promise<SuccessResponse> => {
  try {
    const response = await axios.post<SuccessResponse>('/auth/change-password', data)
    return response as unknown as SuccessResponse
  } catch (error) {
    console.error('Change password failed:', error)
    throw error
  }
}

// 上传头像接口
const uploadAvatar = async (formData: FormData): Promise<SuccessResponse> => {
  try {
    console.log('API 层发起头像上传请求...')
    const response = await axios.post<SuccessResponse>('/auth/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    console.log('API 层收到响应:', response)
    return response as unknown as SuccessResponse
  } catch (error) {
    console.error('Upload avatar failed:', error)
    throw error
  }
}

// 获取用户头像接口
const getUserAvatar = async (username?: string): Promise<AvatarResponse> => {
  try {
    const response = await axios.get<AvatarResponse>('/auth/avatar', {
      params: username ? { username } : undefined
    })
    return response as unknown as AvatarResponse
  } catch (error) {
    console.error('Get user avatar failed:', error)
    throw error
  }
}


// 导出认证模块API
export default {
  login,
  getUserInfo,
  refreshToken,
  checkToken,
  register,
  updateUserInfo,
  changePassword,
  uploadAvatar,
  getUserAvatar
}
