// 样式导入
import 'element-plus/dist/index.css'
import '@/assets/styles/main.css'

import { createApp } from 'vue'
import { store } from '@/store'
import ElementPlus from 'element-plus'

// 核心组件
import App from './App.vue'
import router from './router'

// 创建应用实例
const app = createApp(App)

// 使用核心插件
app.use(store)
app.use(router)
app.use(ElementPlus)

// 挂载应用
app.mount('#app')
