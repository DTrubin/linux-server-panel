<script setup lang="ts" name="profile-header">
import { ref, onBeforeMount, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  User,
  Camera,
  Message,
  Phone,
  CircleCheckFilled,
  Loading,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/modules/auth'
// @ts-ignore
import FrontendImageProcessor from '@/utils/frontendImageProcessor'
import authAPI from '@/api/auth.ts'

const authStore = useAuthStore()

const localUserInfo = ref({
  id: 'unknown',
  username: 'unknown',
  email: 'unknown',
  phone: 'unknown',
  nickname: 'unknown',
  lastLoginAt: '',
  createdAt: '',
  status: 'active'
})

// 头像状态
const avatarBase64 = ref<string>('')
const uploading = ref(false)
const fileInput = ref<HTMLInputElement>()

// 验证状态（模拟数据，实际应该从后端获取）
const isEmailVerified = computed(() => {
  return localUserInfo.value.email && localUserInfo.value.email.includes('@')
})

const isPhoneVerified = computed(() => {
  return localUserInfo.value.phone && /^1[3-9]\d{9}$/.test(localUserInfo.value.phone)
})

// 获取用户头像
const loadUserAvatar = async () => {
  avatarBase64.value = await authStore.getUserAvatar()
}

// 打开文件选择器
const openFileSelector = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 立即清空文件输入，防止重复触发
  target.value = ''

  uploading.value = true
  let localPreviewUrl = ''

  try {
    // 验证文件
    const validation = await FrontendImageProcessor.validateImage(file)
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '))
    }

    // 转换为WebP格式
    const processResult = await FrontendImageProcessor.resizeAndConvertToWebP(
      file,
      {
        width: 200,
        height: 200,
        quality: 0.85
      }
    )

    // 保存本地预览URL，用于立即更新头像显示
    localPreviewUrl = processResult.previewUrl

    // 创建WebP文件对象
    const webpFile = FrontendImageProcessor.createWebPFile(
      processResult.blob,
      'avatar.webp'
    )

    // 创建FormData并上传
    const formData = new FormData()
    formData.append('avatar', webpFile)

    // 上传到后端
    const response: any = await authAPI.uploadAvatar(formData)

    if (response?.success) {
      // 立即使用本地处理的头像更新界面
      avatarBase64.value = localPreviewUrl

      // 同时更新 store 中的头像缓存，确保其他组件也能获取到最新头像
      authStore.setAvatarBase64(localPreviewUrl)

      ElMessage.success('头像更新成功!')

      // 不需要后台刷新，本地头像已经是最新的
      // 本地头像就是上传到服务器的头像，保持一致性
    } else {
      throw new Error(response?.message || '上传失败')
    }

  } catch (error: any) {
    ElMessage.error(error.message || '头像上传失败，请重试!')
    // 如果上传失败，清理本地预览URL
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }
  } finally {
    uploading.value = false
  }
}

// 格式化最后登录时间
const lastLogin = computed(() => {
  const lastLoginAt = localUserInfo.value.lastLoginAt
  if (!lastLoginAt) return '从未登录'

  const now = new Date()
  const loginTime = new Date(lastLoginAt)
  const diff = now.getTime() - loginTime.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return loginTime.toLocaleDateString('zh-CN')
})

// 格式化手机号
const formattedPhone = computed(() => {
  if (!localUserInfo.value.phone) return ''
  return localUserInfo.value.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3')
})

onBeforeMount(async () => {
  try {
    const info = await authStore.getUserInfo()
    if (info) {
      Object.assign(localUserInfo.value, info)

      // 加载头像
      if (info.username) {
        loadUserAvatar()
      }
    }
  } catch (error) {
    console.error('Failed to get user info:', error)
  }
})

// 组件卸载时清理资源
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  // 清理头像blob URL（如果是blob格式）
  if (avatarBase64.value && avatarBase64.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarBase64.value)
  }
})
</script>
<template>
  <div class="profile-header">
    <div class="header-content">
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <el-avatar :size="100" :src="avatarBase64" class="user-avatar">
            <el-icon :size="50">
              <User />
            </el-icon>
          </el-avatar>
          <!-- 上传进度遮罩 -->
          <div v-if="uploading" class="upload-overlay">
            <el-icon class="uploading-icon">
              <Loading />
            </el-icon>
            <span class="upload-text">上传中...</span>
          </div>
          <div class="avatar-status-dot"></div>
        </div>
        <!-- 隐藏的文件输入 -->
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileSelect"
          style="display: none"
        />
        <el-button
          size="small"
          type="primary"
          plain
          class="upload-btn"
          @click="openFileSelector"
          :disabled="uploading"
        >
          <el-icon>
            <Camera />
          </el-icon>
          {{ uploading ? '上传中...' : '更换头像' }}
        </el-button>
      </div>

      <div class="user-info-section">
        <div class="basic-info">
          <h2 class="username">
            {{ localUserInfo.nickname || localUserInfo.username }}
            <el-tag v-if="localUserInfo.nickname" type="info" size="small" class="username-tag">
              @{{ localUserInfo.username }}
            </el-tag>
          </h2>
          <p class="user-id">用户ID: {{ localUserInfo.id }}</p>
          <div class="status-info">
            <el-tag type="success" size="small" class="status-tag">
              <el-icon>
                <CircleCheckFilled />
              </el-icon>
              在线
            </el-tag>
            <span class="last-login">最后登录: {{ lastLogin }}</span>
          </div>
        </div>

        <div class="contact-info">
          <div class="contact-item" v-if="localUserInfo.email">
            <el-icon class="contact-icon">
              <Message />
            </el-icon>
            <span class="contact-text">{{ localUserInfo.email }}</span>
            <el-tag v-if="isEmailVerified" type="success" size="small">已验证</el-tag>
          </div>
          <div class="contact-item" v-if="localUserInfo.phone">
            <el-icon class="contact-icon">
              <Phone />
            </el-icon>
            <span class="contact-text">{{ formattedPhone }}</span>
            <el-tag v-if="isPhoneVerified" type="success" size="small">已验证</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped lang="scss">
.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 24px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    z-index: 0;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 24px 32px;
    position: relative;
    z-index: 1;

    @media (max-width: 768px) {
      flex-direction: column;
      text-align: center;
      gap: 20px;
      padding: 20px;
    }
  }

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    .avatar-wrapper {
      position: relative;
      display: inline-block;

      .user-avatar {
        border: 4px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.05);
          border-color: rgba(255, 255, 255, 0.5);
        }
      }

      .avatar-status-dot {
        position: absolute;
        bottom: 8px;
        right: 8px;
        width: 18px;
        height: 18px;
        background: #67c23a;
        border: 3px solid white;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      .upload-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;

        .uploading-icon {
          font-size: 24px;
          animation: rotate 1s linear infinite;
          margin-bottom: 4px;
        }

        .upload-text {
          font-weight: 500;
        }
      }
    }

    .upload-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      backdrop-filter: blur(5px);
      transition: all 0.3s ease;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }

  .user-info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .basic-info {
      .username {
        margin: 0 0 8px 0;
        font-size: 28px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;

        @media (max-width: 768px) {
          justify-content: center;
          font-size: 24px;
        }

        .username-tag {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: rgba(255, 255, 255, 0.8);
          font-weight: normal;
        }
      }

      .user-id {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        font-family: 'Courier New', monospace;
      }

      .status-info {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;

        @media (max-width: 768px) {
          justify-content: center;
        }

        .status-tag {
          background: rgba(103, 194, 58, 0.2);
          border: 1px solid rgba(103, 194, 58, 0.3);
          color: #67c23a;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .last-login {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .contact-item {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.1);
        padding: 12px 16px;
        border-radius: 8px;
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(4px);
        }

        .contact-icon {
          color: rgba(255, 255, 255, 0.8);
          font-size: 16px;
        }

        .contact-text {
          flex: 1;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
        }

        .el-tag {
          background: rgba(103, 194, 58, 0.2);
          border: 1px solid rgba(103, 194, 58, 0.3);
          color: #67c23a;
        }
      }
    }
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 768px) {
      flex-direction: row;
      justify-content: center;
    }

    .el-button {
      min-width: 120px;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.3s ease;

      &[type="primary"] {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        backdrop-filter: blur(5px);

        &:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      }

      &[type="default"] {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(5px);

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
          transform: translateY(-2px);
        }
      }
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Element Plus 组件样式覆盖
:deep(.el-dropdown-menu) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);

  .el-dropdown-menu__item {
    color: #333;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(103, 194, 58, 0.1);
      color: #67c23a;
    }

    .el-icon {
      margin-right: 8px;
    }
  }
}
</style>
