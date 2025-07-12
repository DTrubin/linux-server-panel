import axios from 'axios'
import { useAuthStore } from '@/store/modules/auth'
import { environmentManager } from '@/config/environment'

// 创建axios实例
const service = axios.create({
  baseURL: environmentManager.getApiBaseUrl(),
  timeout: 5000
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    // 如果token存在，添加到请求头
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 直接返回完整的响应数据，让具体的API调用者决定如何处理
    const result = response.data;
    return result;
  },
  async (error) => {
    // 如果不是登录
    const authStore = useAuthStore()
    if (!error.config.url.includes('login')) {
      // 处理401错误（Token 缺失）
      if (error.response && error.response.status === 401) {
        authStore.logout()
      }
      // 处理403错误（Token 无效或过期）
      else if (error.response && error.response.status === 403) {
        // 如果是403错误，可能是Token无效或过期
        authStore.logout()
      }
    }

    // 对于其他HTTP错误（400、409、500等），确保error.response.data可以被前端获取
    return Promise.resolve(error.response ? error.response.data : {
      success: false,
      message: error.message || '请求失败',
    })
  }
)

export default service
