<template>
  <div class="security-form">
    <!-- 安全信息 -->
    <div class="info-section">
      <h3 class="section-title">
        <el-icon><Key /></el-icon>
        账户安全信息
      </h3>
      <el-row :gutter="20">
        <el-col :span="24">
          <div class="security-items">
            <div class="security-item">
              <div class="security-icon">
                <el-icon color="#67C23A"><CircleCheckFilled /></el-icon>
              </div>
              <div class="security-content">
                <div class="security-title">密码保护</div>
                <div class="security-desc">账户密码已设置，最后修改时间：{{ getPasswordChangeTime() }}</div>
              </div>
              <div class="security-action">
                <el-button type="primary" size="small" @click="openPasswordDialog">
                  <el-icon><Edit /></el-icon>
                  修改密码
                </el-button>
              </div>
            </div>

            <div class="security-item">
              <div class="security-icon">
                <el-icon :color="getEmailVerifyColor()"><Message /></el-icon>
              </div>
              <div class="security-content">
                <div class="security-title">邮箱验证</div>
                <div class="security-desc">{{ getEmailVerifyStatus() }}</div>
              </div>
              <div class="security-action">
                <el-button type="success" size="small" @click="verifyEmail" v-if="!isEmailVerified">
                  <el-icon><Message /></el-icon>
                  验证邮箱
                </el-button>
                <el-button type="warning" size="small" @click="changeEmail" v-else>
                  <el-icon><Edit /></el-icon>
                  更换邮箱
                </el-button>
              </div>
            </div>

            <div class="security-item">
              <div class="security-icon">
                <el-icon :color="getPhoneVerifyColor()"><Phone /></el-icon>
              </div>
              <div class="security-content">
                <div class="security-title">手机验证</div>
                <div class="security-desc">{{ getPhoneVerifyStatus() }}</div>
              </div>
              <div class="security-action">
                <el-button type="success" size="small" @click="verifyPhone" v-if="!isPhoneVerified">
                  <el-icon><Phone /></el-icon>
                  验证手机
                </el-button>
                <el-button type="warning" size="small" @click="changePhone" v-else>
                  <el-icon><Edit /></el-icon>
                  更换手机
                </el-button>
              </div>
            </div>

            <div class="security-item">
              <div class="security-icon">
                <el-icon color="#F56C6C"><Lock /></el-icon>
              </div>
              <div class="security-content">
                <div class="security-title">双因素认证</div>
                <div class="security-desc">{{ getTwoFactorStatus() }}</div>
              </div>
              <div class="security-action">
                <el-button type="danger" size="small" @click="toggleTwoFactor">
                  <el-icon><Lock /></el-icon>
                  {{ isTwoFactorEnabled ? '关闭' : '开启' }}双因素认证
                </el-button>
              </div>
            </div>

            <div class="security-item">
              <div class="security-icon">
                <el-icon color="#909399"><Monitor /></el-icon>
              </div>
              <div class="security-content">
                <div class="security-title">登录设备管理</div>
                <div class="security-desc">管理已登录的设备和会话</div>
              </div>
              <div class="security-action">
                <el-button type="info" size="small" @click="manageDevices">
                  <el-icon><Monitor /></el-icon>
                  管理设备
                </el-button>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts" name="SecurityInfoForm">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Key,
  CircleCheckFilled,
  Message,
  Phone,
  Edit,
  Lock,
  Monitor
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

// 安全设置相关的响应式变量
const isEmailVerified = ref(true)
const isPhoneVerified = ref(true)
const isTwoFactorEnabled = ref(false)

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

// 获取密码修改时间
const getPasswordChangeTime = () => {
  // 这里应该从后端获取真实的密码修改时间
  return '2025年6月15日'
}

// 获取邮箱验证状态
const getEmailVerifyStatus = () => {
  return localUserForm.value.email ? '邮箱已验证' : '未绑定邮箱'
}

// 获取邮箱验证颜色
const getEmailVerifyColor = () => {
  return localUserForm.value.email ? '#67C23A' : '#909399'
}

// 获取手机验证状态
const getPhoneVerifyStatus = () => {
  return localUserForm.value.phone ? '手机号已验证' : '未绑定手机号'
}

// 获取手机验证颜色
const getPhoneVerifyColor = () => {
  return localUserForm.value.phone ? '#67C23A' : '#909399'
}

// 获取双因素认证状态
const getTwoFactorStatus = () => {
  return isTwoFactorEnabled.value ? '已开启双因素认证' : '未开启双因素认证'
}

// 安全操作方法
const openPasswordDialog = () => {
  ElMessage.info('密码修改功能开发中...')
}

const verifyEmail = () => {
  ElMessage.info('邮箱验证功能开发中...')
}

const changeEmail = () => {
  ElMessage.info('更换邮箱功能开发中...')
}

const verifyPhone = () => {
  ElMessage.info('手机验证功能开发中...')
}

const changePhone = () => {
  ElMessage.info('更换手机功能开发中...')
}

const toggleTwoFactor = () => {
  isTwoFactorEnabled.value = !isTwoFactorEnabled.value
  ElMessage.success(isTwoFactorEnabled.value ? '双因素认证已开启' : '双因素认证已关闭')
}

const manageDevices = () => {
  ElMessage.info('设备管理功能开发中...')
}
</script>

<style scoped lang="scss">
.security-form {
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

    .security-items {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .security-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
        border: 1px solid #e8eaff;
        border-radius: 10px;
        transition: all 0.3s ease;

        &:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .security-icon {
          .el-icon {
            font-size: 24px;
          }
        }

        .security-content {
          flex: 1;

          .security-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
          }

          .security-desc {
            font-size: 13px;
            color: #666;
          }
        }

        .security-action {
          flex-shrink: 0;

          .el-button {
            transition: all 0.3s ease;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .security-form {
    padding: 12px 0;

    .info-section {
      padding: 16px;
      margin-bottom: 20px;

      .section-title {
        font-size: 16px;
      }

      .security-items .security-item {
        padding: 12px;
        gap: 12px;

        .security-icon .el-icon {
          font-size: 20px;
        }
      }
    }
  }
}
</style>
