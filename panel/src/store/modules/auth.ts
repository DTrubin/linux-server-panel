import { defineStore } from 'pinia'
import { ref, computed, type Ref } from 'vue'
import authAPI from '@/api/auth'
import type {
  LoginParams,
  LoginResponse,
  UserInfo,
  UserInfoResponse,
  ChangePasswordParams,
  UpdateUserInfoParams,
  SuccessResponse,
  AvatarResponse,
  RefreshTokenResponse
} from '@/types/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('token') || null)
  const userInfo = ref<UserInfo | null>((() => {
    const stored = localStorage.getItem('userInfo')
    return stored ? JSON.parse(stored) : null
  })())
  const lastActivityTime = ref<number>(Date.now())
  const avatarBase64 = ref<string>('')

  // 计算属性
  const isAuthenticated = computed(() => !!token.value)

  // 登录
  const loginAction = async (loginData: LoginParams): Promise<LoginResponse | null> => {
    const res: LoginResponse = await authAPI.login(loginData)
    if (!res.success || !res.data) {
      return res
    }
    token.value = res.data.accessToken
    localStorage.setItem('token', res.data.accessToken)

    // 直接使用登录返回的用户信息
    userInfo.value = res.data.user
    lastActivityTime.value = Date.now()

    // 持久化用户信息
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    return res
  }

  // 获取用户信息
  const getUserInfo = async (): Promise<UserInfo | null> => {
    // 检查 store
    if (userInfo.value) {
      return userInfo.value
    }

    // 检查本地存储
    let storedUserInfo
    try {
      storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '')
    } catch (error) {
      console.warn('❌ Get local user info failed:', error);
    }
    if (storedUserInfo && typeof storedUserInfo === 'object' && storedUserInfo.id) {
      userInfo.value = storedUserInfo
      return userInfo.value
    }

    // 如果没有 token，直接返回
    if (!token.value) {
      return storedUserInfo || null
    }

    // 尝试获取用户信息
    try {
      const response = await authAPI.getUserInfo()
      console.log('store getUserInfo API 响应:', response)

      if (response.success && response.data) {
        userInfo.value = {
          id: response.data.id,
          username: response.data.username,
          email: response.data.email,
          phone: response.data.phone,
          nickname: response.data.nickname,
          createdAt: response.data.createdAt,
          lastLoginAt: response.data.lastLoginAt,
          status: response.data.status || 'active'
        }

        console.log('store 设置用户信息:', userInfo.value)

        // 更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        return userInfo.value
      } else {
        console.error('❌ Get user info failed:', response.message)
        return storedUserInfo || null
      }
    } catch (error) {
      console.error('❌ Get user info failed:', error)
      // 如果获取失败，返回本地存储的用户信息
      return storedUserInfo || null
    }
  }


  // 设置头像的 Base64 字符串
  const setAvatarBase64 = (base64: string) => {
    avatarBase64.value = base64
  }

  const refreshProfile = async (): Promise<void> => {
    try {
      // 刷新用户信息
      const userInfoData = await authAPI.getUserInfo()
      if (userInfo.value && userInfoData.data) {
        Object.assign(userInfo.value, userInfoData.data)
      }
      // 更新本地存储
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    } catch (error) {
      console.error('❌ Refresh profile failed:', error)
    }
  }

  // 刷新token
  const refreshToken = async (): Promise<RefreshTokenResponse> => {
    if (!token.value) return Promise.reject(new Error('No token available for refresh'))
    try {
      const tokenData = await authAPI.refreshToken()
      if (tokenData.success && tokenData.data) {
        token.value = tokenData.data.accessToken
        localStorage.setItem('token', tokenData.data.accessToken)
        lastActivityTime.value = Date.now()
      }
      return tokenData
    } catch (error) {
      throw error
    }
  }

  // 登出
  const logout = async () => {
    try {
      router.push('/login?redirect=' + router.currentRoute.value.fullPath)
    } finally {
      resetState()
    }
  }

  // 重置状态
  const resetState = () => {
    token.value = null
    userInfo.value = null
    lastActivityTime.value = Date.now()
    avatarBase64.value = ''

    // 清理localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  // 检查用户活跃状态
  const checkActivity = () => {
    const now = Date.now()
    const inactiveDuration = now - lastActivityTime.value
    const sessionTimeout = 30 * 60 * 1000 // 30分钟

    if (inactiveDuration > sessionTimeout && isAuthenticated.value) {
      console.warn('用户长时间未活动，即将登出')
      logout()
      return false
    }

    lastActivityTime.value = now
    return true
  }

  // 更新用户活动时间
  const updateActivityTime = () => {
    lastActivityTime.value = Date.now()
  }

  // 更新用户信息
  const updateUserInfo = async (newUserInfo: UpdateUserInfoParams): Promise<UserInfoResponse> => {
    try {
      console.log('store updateUserInfo 开始，请求数据:', newUserInfo)
      const res = await authAPI.updateUserInfo(newUserInfo)
      console.log('store updateUserInfo API 响应:', res)

      if (!res.success || !res.data) {
        console.log('store updateUserInfo 响应失败:', res)
        return res
      }

      // 更新本地用户信息
      if (userInfo.value) {
        userInfo.value = {
          ...userInfo.value,
          ...res.data  // 使用后端返回的数据而不是请求数据
        }

        // 更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        console.log('store updateUserInfo 本地信息已更新:', userInfo.value)
      }
      return res
    } catch (error) {
      console.error('store updateUserInfo failed:', error)
      throw error
    }
  }

  // 修改密码
  const changePassword = async (passwordData: ChangePasswordParams): Promise<SuccessResponse> => {
    try {
      const res = await authAPI.changePassword(passwordData)
      return res
    } catch (error) {
      console.error('Change password failed:', error)
      throw error
    }
  }  // 上传头像
  const uploadAvatar = async (file: File): Promise<SuccessResponse> => {
    try {
      console.log('Store 层开始上传头像...')
      const formData = new FormData()
      formData.append('avatar', file)

      console.log('Store 层调用 API...')
      const res = await authAPI.uploadAvatar(formData)
      console.log('Store 层收到 API 响应:', res)

      return res
    } catch (error) {
      console.error('Upload avatar failed:', error)
      throw error
    }
  }

  // 获取用户头像
  const getUserAvatar = async (): Promise<string> => {
    try {
      if (avatarBase64.value) {
        return avatarBase64.value
      }

      if (!userInfo.value || !userInfo.value.username) {
        console.warn('获取用户头像失败：没有用户名')
        return ''
      }
      const res = await authAPI.getUserAvatar(userInfo.value?.username)

      if (res.success && res.data?.avatar) {
        avatarBase64.value = res.data.avatar
        return res.data.avatar
      }

      // 如果获取失败，返回默认头像
      return ''
    } catch (error) {
      console.error('Get user avatar failed:', error)
      return ''
    }
  }

  return {
    // 状态
    token,
    userInfo,

    // 计算属性
    isAuthenticated,

    // 方法
    loginAction,
    getUserInfo,
    refreshToken,
    logout,
    checkActivity,
    setAvatarBase64,
    updateActivityTime,
    updateUserInfo,
    changePassword,
    uploadAvatar,
    getUserAvatar,
    refreshProfile
  }
})

