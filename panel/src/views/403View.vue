<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/home')
}
</script>

<template>
  <div class="forbidden">
    <div class="forbidden-content">
      <div class="error-code">403</div>
      <h1 class="error-title">无权限访问</h1>
      <p class="error-message">
        您没有权限访问此页面
      </p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.forbidden {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;

  .forbidden-content {
    text-align: center;
    padding: 40px;

    .error-code {
      font-size: 120px;
      font-weight: bold;
      color: #f56c6c;
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
  .forbidden {
    padding: 20px;

    .forbidden-content {
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
