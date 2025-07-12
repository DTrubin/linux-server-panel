<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <div class="user-dropdown">
      <el-avatar :size="32" :src="userAvatar">
        <el-icon>
          <User />
        </el-icon>
      </el-avatar>
      <span class="username">{{ userInfo.username }}</span>
      <el-icon class="el-icon--right">
        <ArrowDown />
      </el-icon>
    </div>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="profile">
          <el-icon>
            <User />
          </el-icon>
          <span>个人信息</span>
        </el-dropdown-item>
        <!-- <el-dropdown-item command="settings">
          <el-icon>
            <Setting />
          </el-icon>
          <span>设置</span>
        </el-dropdown-item> -->
        <el-dropdown-item divided command="logout">
          <el-icon>
            <SwitchButton />
          </el-icon>
          <span>退出登录</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Setting, SwitchButton, ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '@/store/modules/auth'
import type { UserInfo } from '@/api'

defineOptions({
  name: 'UserDropdown'
})

const router = useRouter()
const authStore = useAuthStore()
const userInfo = reactive({ username: 'Guest' } as UserInfo)
const userAvatar = ref('' as string)

const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/settings/system')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        await authStore.logout()
        ElMessage.success('退出登录成功')
        router.push('/login')
      } catch {
        // User cancelled
      }
      break
  }
}

onBeforeMount(async () => {
  try {
    let userInfoData = await authStore.getUserInfo()
    let userAvatarData = await authStore.getUserAvatar()
    userInfo.username = userInfoData?.username || 'Guest'
    userAvatar.value = userAvatarData
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败，请重试')
  }
})
</script>

<style lang="scss" scoped>
.user-dropdown {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;

  &:hover {
    background-color: var(--el-color-primary-light-9);
  }

  .username {
    margin: 0 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

:deep(.el-dropdown-menu__item) {
  padding: 8px 16px;

  .el-icon {
    margin-right: 8px;
  }
}
</style>
