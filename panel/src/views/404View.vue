<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1 class="error-title">页面不存在</h1>
      <p class="error-message">
        您访问的页面不存在或已被移除
      </p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;

  .not-found-content {
    text-align: center;
    padding: 40px;

    .error-code {
      font-size: 120px;
      font-weight: bold;
      color: #409eff;
      line-height: 1;
      margin-bottom: 20px;
    }

    .error-title {
      font-size: 32px;
      color: #333;
      margin-bottom: 20px;
    }

    .error-message {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
  }
}

@media (max-width: 768px) {
  .not-found {
    padding: 20px;

    .not-found-content {
      .error-code {
        font-size: 80px;
      }

      .error-title {
        font-size: 24px;
      }
    }
  }
}
</style>
