import { createPinia } from 'pinia'

const store = createPinia()

export { store }
export default store

// 导出所有模块
export * from './modules/auth'
export * from './modules/app'
export * from './modules/systemResource'
