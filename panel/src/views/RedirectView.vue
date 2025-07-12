<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElLoading } from 'element-plus'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const { params, query } = route
  const { path } = params

  // 显示加载状态
  const loading = ElLoading.service({
    lock: true,
    text: '跳转中...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  // 处理重定向路径
  const normalizedPath = Array.isArray(path) ? path.join('/') : path

  // 执行重定向
  router.replace({
    path: '/' + normalizedPath,
    query
  }).finally(() => {
    loading.close()
  })
})
</script>

<template>
  <div class="redirect-container">
    <div class="redirect-content">
      <el-icon class="redirect-icon" :size="30"><Loading /></el-icon>
      <p class="redirect-text">正在跳转...</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.redirect-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: var(--el-bg-color-page);

  .redirect-content {
    text-align: center;

    .redirect-icon {
      animation: rotating 2s linear infinite;
      margin-bottom: 20px;
      color: var(--el-color-primary);
    }

    .redirect-text {
      font-size: 18px;
      color: var(--el-text-color-primary);
    }
  }
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
