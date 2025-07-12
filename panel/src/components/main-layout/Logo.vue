<template>
  <div class="logo" @click="toggleSidebar" style="cursor:pointer;">
    <el-icon :size="28" class="logo-icon">
      <Monitor />
    </el-icon>
    <h1 v-show="appStore.sidebar.opened" class="logo-title">
      {{ APP_TITLE }}
    </h1>
  </div>
</template>

<script setup lang="ts">
import { Monitor } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/modules/app'
import { APP_TITLE } from '@/config/constants'

defineOptions({
  name: 'AppLogo'
})

const appStore = useAppStore()
const toggleSidebar = () => {
  appStore.toggleSidebar()
}
</script>

<style lang="scss" scoped>
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  height: 48px;
  background-color: var(--el-color-primary);

  .logo-icon {
    color: white;
    flex-shrink: 0;
  }

  .logo-title {
    color: white;
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    margin-left: 12px;
    white-space: nowrap;
    transition: all 0.3s;
  }

  &.collapse {
    justify-content: center;

    .logo-title {
      width: 0;
      margin-left: 0;
      opacity: 0;
    }
  }
}
</style>
