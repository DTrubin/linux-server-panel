import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    // 增加块大小警告的阈值到 1000kb
    chunkSizeWarningLimit: 1000,
    // 配置 Rollup 打包选项
    rollupOptions: {
      output: {
        // 手动分块配置
        manualChunks: (id) => {
          // 基础依赖库分组
          if (id.includes('node_modules')) {
            // Element Plus
            if (id.includes('element-plus') || id.includes('@element-plus')) {
              return 'vendor-element-plus'
            }

            // 核心Vue框架
            if (id.includes('/vue/') || id.includes('/vue-router/') || id.includes('/pinia/')) {
              return 'vendor-vue'
            }

            // 图表库 - 拆分为核心和组件
            if (id.includes('/echarts/core')) {
              return 'echarts-core'
            }

            if (id.includes('/echarts/')) {
              if (id.includes('/components/')) {
                return 'echarts-components'
              }
              if (id.includes('/charts/')) {
                return 'echarts-charts'
              }
              if (id.includes('/renderers/')) {
                return 'echarts-renderers'
              }
              return 'echarts-misc'
            }

            // 终端相关
            if (id.includes('xterm')) {
              return 'vendor-terminal'
            }

            // 工具库
            if (id.includes('axios') || id.includes('dayjs')) {
              return 'vendor-utils'
            }

            // 其他第三方依赖
            return 'vendor-others'
          }

          // 特定业务模块分组
          if (id.includes('/dashboard/')) {
            return 'dashboard'
          }
          if (id.includes('/file-manager/')) {
            return 'file-manager'
          }
          if (id.includes('/terminal/')) {
            return 'terminal-app'
          }
          if (id.includes('/logs/')) {
            return 'logs'
          }
        }
      }
    },
    // 启用源码映射，便于调试生产环境问题
    sourcemap: true,
    // 使用terser进行压缩
    minify: 'terser'
  }
})
