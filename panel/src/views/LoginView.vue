<script setup lang="ts">
import { ref, reactive } from 'vue'
import router from '@/router'
import { useAuthStore } from '@/store/modules/auth'
import { ElMessage, ElNotification } from 'element-plus'
import { User, Lock, Monitor, InfoFilled, Loading, CircleCheck, Star } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import type { FormRules } from 'element-plus/es/components/form'

const authStore = useAuthStore()

const loginFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const loading = ref(false)

// 表单验证规则
const rules = reactive<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ]
})

// 处理登录逻辑
const handleLogin = async () => {
  if (!loginFormRef.value || loading.value) return // 防止重复提交
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        loading.value = true
        const res = await authStore.loginAction(loginForm)

        if (!res?.success) {
          ElMessage.error({
            message: res?.message || '未知错误，请稍后再试',
            duration: 3000
          })
          return
        }

        ElNotification({
          title: '登录成功',
          message: `欢迎回来，${loginForm.username}！`,
          type: 'success',
          duration: 3000
        })

        router.replace({ path: '/' })
      } catch (error) {
        const message = (error as Error).message || '登录失败'

        ElMessage.error({
          message,
          duration: 5000
        })
      } finally {
        loading.value = false
      }
    } else {
      ElMessage.warning('请检查输入信息')
    }
  })
}

// 重置表单
const resetForm = () => {
  loginFormRef.value?.resetFields()
}
</script>

<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="floating-card" v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 0.5}s` }">
        <el-icon>
          <Monitor />
        </el-icon>
      </div>
    </div>

    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-header">
          <el-avatar :size="64" class="logo-avatar">
            <el-icon :size="32">
              <Monitor />
            </el-icon>
          </el-avatar>
          <h2>Linux服务器控制面板</h2>
          <p>安全、高效的服务器管理平台</p>
          <el-divider />
        </div>
      </template>

      <el-form ref="loginFormRef" :model="loginForm" :rules="rules" @submit.prevent="handleLogin" label-position="top"
        size="large">
        <!-- 用户名 -->
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" clearable :prefix-icon="User"
            @keyup.enter="handleLogin">
            <template #suffix>
              <el-tooltip content="用户名长度 3-20 个字符" placement="top">
                <el-icon class="input-help">
                  <InfoFilled />
                </el-icon>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
        <!-- 密码 -->
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" clearable show-password
            :prefix-icon="Lock" @keyup.enter="handleLogin">
            <template #suffix>
              <el-tooltip content="密码不少于 6 个字符" placement="top">
                <el-icon class="input-help">
                  <InfoFilled />
                </el-icon>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="remember-row">
          <el-row justify="space-between" style="width: 100%">
            <el-col :span="12">
              <el-checkbox v-model="loginForm.rememberMe" size="large">
                <span class="remember-text">记住我</span>
              </el-checkbox>
            </el-col>
            <el-col :span="12" class="text-right">
              <el-button type="primary" link size="small" @click="resetForm">
                重置表单
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" class="login-button" size="large" round>
            <template #loading>
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
            </template>
            <span v-if="!loading">立即登录</span>
            <span v-else>登录中...</span>
          </el-button>
        </el-form-item>

        <!-- 错误提示 -->
      </el-form>

      <!-- 底部信息 -->
      <template #footer>
        <div class="login-footer">
          <el-row :gutter="20" justify="center">
            <el-col :span="8" class="text-center">
              <el-icon color="#409eff" :size="16">
                <Monitor />
              </el-icon>
              <p>安全可靠</p>
            </el-col>
            <el-col :span="8" class="text-center">
              <el-icon color="#67c23a" :size="16">
                <CircleCheck />
              </el-icon>
              <p>高效管理</p>
            </el-col>
            <el-col :span="8" class="text-center">
              <el-icon color="#e6a23c" :size="16">
                <Star />
              </el-icon>
              <p>易于使用</p>
            </el-col>
          </el-row>
          <el-divider />
          <p class="copyright">© 2025 Linux Server Panel. All rights reserved.</p>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;

  // 网格背景
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/></pattern></defs><rect width="20" height="20" fill="url(%23grid)"/></svg>');
    background-size: 20px 20px;
    background-repeat: repeat;
    opacity: 0.3;
    pointer-events: none;
  }

  // 背景装饰元素
  .background-decoration {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;

    .floating-card {
      position: absolute;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: float 6s ease-in-out infinite;
      backdrop-filter: blur(5px);

      .el-icon {
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px !important;
        width: 14px !important;
        height: 14px !important;
      }

      &:nth-child(1) {
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }

      &:nth-child(2) {
        top: 20%;
        right: 15%;
        animation-delay: 1s;
      }

      &:nth-child(3) {
        bottom: 20%;
        left: 20%;
        animation-delay: 2s;
      }

      &:nth-child(4) {
        bottom: 30%;
        right: 10%;
        animation-delay: 3s;
      }

      &:nth-child(5) {
        top: 50%;
        left: 5%;
        animation-delay: 4s;
      }
    }
  }

  // 登录卡片
  .login-card {
    width: 100%;
    max-width: 400px;
    border-radius: 16px;
    box-shadow:
      0 16px 48px rgba(0, 0, 0, 0.12),
      0 6px 20px rgba(0, 0, 0, 0.08),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: none;
    position: relative;
    z-index: 1;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.95);

    // 玻璃效果
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg,
          rgba(255, 255, 255, 0.1) 0%,
          rgba(255, 255, 255, 0.05) 100%);
      pointer-events: none;
      z-index: 1;
    }

    // 卡片各部分样式
    :deep(.el-card__header) {
      background: transparent;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 16px 16px 0 0;
      padding: 24px 28px 20px;
      text-align: center;
      position: relative;
      z-index: 2;
    }

    // 登录头部
    .login-header {
      .logo-avatar {
        margin-bottom: 12px;
        background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
        box-shadow: 0 3px 8px rgba(64, 158, 255, 0.25);
        width: 56px !important;
        height: 56px !important;

        .el-icon {
          font-size: 28px !important;
          width: 28px !important;
          height: 28px !important;
        }
      }

      h2 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      p {
        margin: 0 0 12px 0;
        color: var(--el-text-color-regular);
        font-size: 13px;
        opacity: 0.8;
      }

      :deep(.el-divider) {
        margin: 12px 0 0 0;
      }
    }

    // 登录按钮
    .login-button {
      width: 100%;
      height: 44px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 10px;
      background: linear-gradient(135deg, #409eff 0%, #667eea 100%);
      border: none;
      box-shadow:
        0 4px 12px rgba(64, 158, 255, 0.2),
        0 2px 6px rgba(64, 158, 255, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      position: relative;
      overflow: hidden;

      // 光泽效果
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent);
        transition: left 0.6s ease;
      }

      &:hover {
        transform: translateY(-1px);
        box-shadow:
          0 6px 14px rgba(64, 158, 255, 0.25),
          0 3px 8px rgba(64, 158, 255, 0.15);

        &::before {
          left: 100%;
        }
      }

      &:active {
        transform: translateY(0);
        box-shadow:
          0 3px 8px rgba(64, 158, 255, 0.2),
          0 1px 4px rgba(64, 158, 255, 0.1);
      }

      &.is-loading {
        background: var(--el-color-primary);
        transform: none;
      }
    }


    // 重置表单
    .text-right {
      display: flex;
      justify-content: flex-end;
      padding-right: 10px;
    }

    // 错误警告框
    :deep(.el-alert) {
      border-radius: 10px;
      border: none;
      backdrop-filter: blur(8px);

      &.el-alert--error {
        background: linear-gradient(135deg,
            rgba(245, 108, 108, 0.1) 0%,
            rgba(245, 108, 108, 0.05) 100%);
        border: 1px solid rgba(245, 108, 108, 0.2);

        .el-alert__icon {
          color: var(--el-color-error);
        }

        .el-alert__content {
          color: var(--el-color-error-dark-2);
        }
      }

      .error-content {
        display: flex;
        justify-content: space-between;
        align-items: center;

        p {
          margin: 0;
          flex: 1;
          font-weight: 500;
          font-size: 13px;
        }
      }
    }

    // 底部信息
    .login-footer {
      text-align: center;

      .el-col {
        .el-icon {
          font-size: 16px !important;
          width: 16px !important;
          height: 16px !important;
          margin-bottom: 4px;
        }

        p {
          margin: 0;
          font-size: 11px;
          color: var(--el-text-color-secondary);
          font-weight: 500;
        }
      }

      :deep(.el-divider) {
        margin: 12px 0 8px 0;
      }

      .copyright {
        margin: 0;
        font-size: 10px;
        color: var(--el-text-color-placeholder);
      }
    }
  }
}

// 动画效果
.login-card {
  animation: slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
    filter: blur(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0px);
  }
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-15px) rotate(180deg);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .login-container {
    padding: 10px;
    height: 100vh;

    .login-card {
      max-width: 100%;

      :deep(.el-card__header) {
        padding: 20px 24px 16px;
      }

      :deep(.el-card__body) {
        padding: 24px;
      }

      :deep(.el-card__footer) {
        padding: 14px 24px 16px;
      }

      .login-header {
        .logo-avatar {
          width: 48px !important;
          height: 48px !important;
          margin-bottom: 10px;

          .el-icon {
            font-size: 24px !important;
            width: 24px !important;
            height: 24px !important;
          }
        }

        h2 {
          font-size: 18px;
        }

        p {
          font-size: 12px;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 5px;
    height: 100vh;

    .background-decoration .floating-card {
      display: none;
    }

    .login-card {
      :deep(.el-card__header) {
        padding: 18px 20px 14px;
      }

      :deep(.el-card__body) {
        padding: 20px;
      }

      :deep(.el-card__footer) {
        padding: 12px 20px 14px;
      }

      .login-header {
        .logo-avatar {
          width: 44px !important;
          height: 44px !important;

          .el-icon {
            font-size: 22px !important;
            width: 22px !important;
            height: 22px !important;
          }
        }

        h2 {
          font-size: 16px;
        }
      }

      :deep(.el-form) {
        .el-form-item {
          margin-bottom: 16px;
        }

        .el-input {
          --el-input-height: 38px;

          .el-input__inner {
            height: 38px;
            line-height: 38px;
          }
        }
      }

      .login-button {
        height: 42px;
        font-size: 13px;
      }
    }
  }
}

// 超小屏幕优化
@media (max-height: 600px) {
  .login-container {
    .login-card {
      .login-header {
        .logo-avatar {
          width: 40px !important;
          height: 40px !important;
          margin-bottom: 8px;

          .el-icon {
            font-size: 20px !important;
            width: 20px !important;
            height: 20px !important;
          }
        }

        h2 {
          font-size: 16px;
          margin-bottom: 2px;
        }

        p {
          font-size: 11px;
          margin-bottom: 8px;
        }

        :deep(.el-divider) {
          margin: 8px 0 0 0;
        }
      }

      :deep(.el-form) {
        .el-form-item {
          margin-bottom: 12px;
        }
      }

      .login-footer {
        :deep(.el-divider) {
          margin: 8px 0 6px 0;
        }
      }
    }
  }
}

// 深色主题适配
@media (prefers-color-scheme: dark) {
  .login-container {
    background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);

    .login-card {
      background: rgba(26, 32, 44, 0.95);
      box-shadow:
        0 16px 48px rgba(0, 0, 0, 0.4),
        0 6px 20px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.05);

      &::before {
        background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.01) 100%);
      }

      :deep(.el-card__header) {
        background: transparent;
        border-bottom-color: rgba(255, 255, 255, 0.08);
      }

      :deep(.el-card__body) {
        background: transparent;
      }

      :deep(.el-card__footer) {
        background: rgba(15, 20, 25, 0.5);
        border-top-color: rgba(255, 255, 255, 0.08);
      }

      .login-header {
        p {
          color: var(--el-text-color-secondary);
        }
      }

      :deep(.el-form) {
        .el-input {
          .el-input__wrapper {
            background-color: rgba(45, 55, 72, 0.6);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.08) inset,
              0 2px 6px rgba(0, 0, 0, 0.2);

            &:hover {
              box-shadow:
                0 0 0 1px var(--el-color-primary-light-6) inset,
                0 3px 10px rgba(0, 0, 0, 0.3);
            }

            &.is-focus {
              box-shadow:
                0 0 0 2px var(--el-color-primary-light-7) inset,
                0 0 0 1px var(--el-color-primary) inset,
                0 6px 12px rgba(64, 158, 255, 0.25);
            }
          }
        }
      }
    }
  }
}

// 工具提示样式
:deep(.el-tooltip__popper) {
  font-size: 11px;
}
</style>
