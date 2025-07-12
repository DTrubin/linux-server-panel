<template>
  <div class="account-info-form">
    <!-- 账户基本信息 -->
    <div class="info-section">
      <h3 class="section-title">
        <el-icon><InfoFilled /></el-icon>
        账户基本信息
      </h3>
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="info-item">
            <label>用户ID</label>
            <div class="info-value">
              <el-input :value="localUserForm.id" disabled>
                <template #append>
                  <el-button @click="copyToClipboard(localUserForm.id)">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </template>
              </el-input>
            </div>
          </div>
        </el-col>

        <el-col :span="12">
          <div class="info-item">
            <label>账户状态</label>
            <div class="info-value">
              <el-tag :type="getStatusType(localUserForm.status)" size="large">
                <el-icon><CircleCheckFilled v-if="localUserForm.status === 'active'" /><Warning v-else /></el-icon>
                {{ getStatusText(localUserForm.status) }}
              </el-tag>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <div class="info-item">
            <label>创建时间</label>
            <div class="info-value">
              <el-input :value="formatDate(localUserForm.createdAt)" disabled>
                <template #prefix>
                  <el-icon><Calendar /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </el-col>

        <el-col :span="12">
          <div class="info-item">
            <label>最后登录</label>
            <div class="info-value">
              <el-input :value="formatLastLogin(localUserForm.lastLoginAt)" disabled>
                <template #prefix>
                  <el-icon><Clock /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 权限信息 -->
    <div class="info-section">
      <h3 class="section-title">
        <el-icon><Lock /></el-icon>
        权限信息
      </h3>
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="info-item">
            <label>用户角色</label>
            <div class="info-value">
              <el-tag type="primary" size="large">
                <el-icon><User /></el-icon>
                {{ getUserRole() }}
              </el-tag>
            </div>
          </div>
        </el-col>

        <el-col :span="12">
          <div class="info-item">
            <label>权限级别</label>
            <div class="info-value">
              <el-rate v-model="permissionLevel" disabled show-text text-color="#ff9900" />
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 使用统计 -->
    <div class="info-section">
      <h3 class="section-title">
        <el-icon><DataAnalysis /></el-icon>
        使用统计
      </h3>
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon color="#409EFF"><Monitor /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ getLoginCount() }}</div>
              <div class="stat-label">登录次数</div>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon color="#67C23A"><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ getOnlineTime() }}</div>
              <div class="stat-label">在线时长</div>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon color="#E6A23C"><Operation /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ getOperationCount() }}</div>
              <div class="stat-label">操作次数</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts" name="AccountInfoForm">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  InfoFilled,
  CopyDocument,
  CircleCheckFilled,
  Warning,
  Calendar,
  Clock,
  Lock,
  User,
  DataAnalysis,
  Monitor,
  Timer,
  Operation
} from '@element-plus/icons-vue'

// 定义 props
interface Props {
  userForm?: {
    id: string
    username: string
    email: string
    phone: string
    nickname: string
    createdAt: string
    lastLoginAt: string
    status: string
    [key: string]: any
  }
}

const props = withDefaults(defineProps<Props>(), {
  userForm: () => ({
    id: '',
    username: '',
    email: '',
    phone: '',
    nickname: '',
    createdAt: '',
    lastLoginAt: '',
    status: ''
  })
})

const localUserForm = ref({
  id: '',
  username: '',
  email: '',
  phone: '',
  nickname: '',
  createdAt: '',
  lastLoginAt: '',
  status: ''
})

// 权限级别（用于展示）
const permissionLevel = ref(5)

// 监听 props 变化，更新本地数据
watch(() => props.userForm, (newVal) => {
  if (newVal) {
    localUserForm.value = {
      id: newVal.id || '',
      username: newVal.username || '',
      email: newVal.email || '',
      phone: newVal.phone || '',
      nickname: newVal.nickname || '',
      createdAt: newVal.createdAt || '',
      lastLoginAt: newVal.lastLoginAt || '',
      status: newVal.status || ''
    }
  }
}, { immediate: true, deep: true })

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '--'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 格式化最后登录时间
const formatLastLogin = (lastLogin: string) => {
  if (!lastLogin) return '从未登录'

  const now = new Date()
  const loginTime = new Date(lastLogin)
  const diff = now.getTime() - loginTime.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return loginTime.toLocaleDateString('zh-CN')
}

// 获取状态类型
const getStatusType = (status: string) => {
  return status === 'active' ? 'success' : 'danger'
}

// 获取状态文本
const getStatusText = (status: string) => {
  return status === 'active' ? '正常' : '停用'
}

// 获取用户角色
const getUserRole = () => {
  // 这里应该从用户数据中获取真实的角色信息
  return '管理员'
}

// 获取登录次数
const getLoginCount = () => {
  // 这里应该从后端获取真实的登录统计
  return 168
}

// 获取在线时长
const getOnlineTime = () => {
  // 这里应该从后端获取真实的在线时长统计
  return '24.5h'
}

// 获取操作次数
const getOperationCount = () => {
  // 这里应该从后端获取真实的操作统计
  return 2580
}
</script>

<style scoped lang="scss">
.account-info-form {
  padding: 20px 0;

  .info-section {
    margin-bottom: 32px;
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;

      .el-icon {
        color: #667eea;
        font-size: 20px;
      }
    }

    .info-item {
      margin-bottom: 16px;

      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #333;
        font-size: 14px;
      }

      .info-value {
        :deep(.el-input) {
          .el-input__inner {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
          }
        }

        :deep(.el-tag) {
          padding: 8px 16px;
          font-size: 14px;
          border-radius: 6px;

          .el-icon {
            margin-right: 6px;
          }
        }
      }
    }

    // 统计卡片样式
    .stat-card {
      background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
      border: 1px solid #e8eaff;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
      }

      .stat-icon {
        margin-bottom: 12px;

        .el-icon {
          font-size: 32px;
        }
      }

      .stat-content {
        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #333;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
        }
      }
    }
  }

  :deep(.el-rate) {
    .el-rate__text {
      color: #666;
      font-weight: 500;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .account-info-form {
    padding: 12px 0;

    .info-section {
      padding: 16px;
      margin-bottom: 20px;

      .section-title {
        font-size: 16px;
      }

      :deep(.el-col) {
        margin-bottom: 16px;
      }

      .stat-card {
        padding: 16px;

        .stat-icon .el-icon {
          font-size: 28px;
        }

        .stat-content .stat-number {
          font-size: 20px;
        }
      }
    }
  }
}
</style>
