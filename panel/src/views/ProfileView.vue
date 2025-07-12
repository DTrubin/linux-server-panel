<template>
  <div class="user-info-container">
    <div class="user-info-card">
      <Header />

      <!-- 卡片切换导航 -->
      <div class="card-nav">
        <el-tabs v-model="activeTab" class="user-tabs">
          <el-tab-pane label="基本信息" name="basic">
            <template #label>
              <span class="tab-label">
                <el-icon>
                  <User />
                </el-icon>
                基本信息
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane label="安全信息" name="security">
            <template #label>
              <span class="tab-label">
                <el-icon>
                  <Lock />
                </el-icon>
                安全信息
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane label="账户信息" name="account">
            <template #label>
              <span class="tab-label">
                <el-icon>
                  <InfoFilled />
                </el-icon>
                账户信息
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 表单内容 -->
      <div class="card-body">
        <!-- 基本信息表单 -->
        <BasicInfoForm v-show="activeTab === 'basic'" :userForm="userForm" @update:userForm="handleUserInfoUpdate"
          @error="handleUserInfoError" />

        <!-- 安全信息表单 -->
        <SecurityInfoForm v-show="activeTab === 'security'" :userForm="userForm" />

        <!-- 账户信息表单 -->
        <AccountInfoForm v-show="activeTab === 'account'" :userForm="userForm" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/modules/auth'
import BasicInfoForm from '@/components/profile/BasicInfoForm.vue'
import SecurityInfoForm from '@/components/profile/SecurityInfoForm.vue'
import AccountInfoForm from '@/components/profile/AccountInfoForm.vue'
import Header from '@/components/profile/Header.vue'
import {
  User,
  Lock,
  InfoFilled
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const activeTab = ref('basic') // 当前激活的标签页

// 用户基本信息
const userForm = ref({
  id: '',
  username: '',
  email: '',
  phone: '',
  nickname: '',
  avatar: '',
  createdAt: '',
  lastLoginAt: '',
  status: 'active'
})

// 初始化用户数据
onMounted(async () => {
  try {
    console.log('ProfileView 开始加载用户信息...')
    const userInfo = await authStore.getUserInfo()
    console.log('ProfileView 获取到的用户信息:', userInfo)

    if (userInfo) {
      const newUserForm = {
        id: userInfo.id || '',
        username: userInfo.username || '',
        email: userInfo.email || '',
        phone: userInfo.phone || '',
        nickname: userInfo.nickname || '',
        createdAt: userInfo.createdAt || '',
        lastLoginAt: userInfo.lastLoginAt || '',
        status: (userInfo.status || 'active') as 'active' | 'inactive'
      }

      console.log('ProfileView 设置的表单数据:', newUserForm)
      userForm.value = newUserForm as any
    } else {
      console.warn('ProfileView 未获取到用户信息')
    }
  } catch (error) {
    console.error('Failed to load user info:', error)
  }
})

// 处理用户信息更新
const handleUserInfoUpdate = (updatedUser: any) => {
  userForm.value = { ...userForm.value, ...updatedUser }
}

// 处理用户信息更新失败
const handleUserInfoError = (error: string) => {
  ElMessage.error(error || '保存失败，请重试!')
}

// 处理头像更新
const handleAvatarUpdate = async () => {
  console.log('ProfileView 收到头像更新事件')
  // 头像已在 Header 组件中重新加载，这里只需要显示成功消息
  ElMessage.success('头像更新成功!')
}

// 处理快速编辑
const handleQuickEdit = () => {
  activeTab.value = 'basic'
  ElMessage.info('已切换到基本信息编辑')
}
</script>

<style scoped lang="scss">
.user-info-container {
  padding: 20px;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  .user-info-card {
    width: 100%;
    max-width: 1200px;
    height: 85vh;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
  }
}

.card-nav {
  background: white;
  padding: 0 32px;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;

  .user-tabs {
    :deep(.el-tabs__header) {
      margin: 0;
      border-bottom: none;
    }

    :deep(.el-tabs__nav-wrap) {
      &::after {
        display: none;
      }
    }

    :deep(.el-tabs__item) {
      height: 60px;
      line-height: 60px;
      padding: 0 24px;
      font-size: 16px;
      font-weight: 500;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s ease;

      &:hover {
        color: #667eea;
        background: rgba(102, 126, 234, 0.05);
      }

      &.is-active {
        color: #667eea;
        border-bottom-color: #667eea;
        background: rgba(102, 126, 234, 0.08);
      }

      .tab-label {
        display: flex;
        align-items: center;
        gap: 8px;

        .el-icon {
          font-size: 18px;
        }
      }
    }

    :deep(.el-tabs__active-bar) {
      display: none;
    }
  }
}

.card-body {
  padding: 32px;
  background: #fafbfc;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;

  // 自定义滚动条样式
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 3px;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: #a8a8a8;
    }
  }

  // 表单容器样式
  &>div {
    animation: fadeIn 0.3s ease-in-out;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .user-info-container {
    padding: 12px;

    .user-info-card {
      height: 90vh;
    }

    .card-nav {
      padding: 0 20px;

      .user-tabs {
        :deep(.el-tabs__item) {
          padding: 0 16px;
          font-size: 14px;
          height: 50px;
          line-height: 50px;

          .tab-label {
            flex-direction: column;
            gap: 4px;

            .el-icon {
              font-size: 16px;
            }
          }
        }
      }
    }

    .card-body {
      padding: 24px 20px;
    }
  }
}
</style>
