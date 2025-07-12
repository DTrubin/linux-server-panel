<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store/modules/app'
import Logo from './Logo.vue'
import * as Icons from '@element-plus/icons-vue'

const router = useRouter()
const appStore = useAppStore()
/* 计算属性 */
const isCollapse = computed(() => !appStore.sidebar.opened)
const defaultActive = computed(() => router.currentRoute.value.path)
const containerClass = computed(() => {
  return 'sidebar-container ' + (isCollapse.value ? 'collapse' : '')
})
</script>

<template>
  <div :class="containerClass">
    <Logo />
    <el-menu :default-active="defaultActive" :collapse="isCollapse" router :unique-opened="true">
      <!-- 首页 -->
      <el-menu-item index="/panel/home">
        <el-icon>
          <Icons.HomeFilled />
        </el-icon>
        <template #title>
          <span>首页</span>
        </template>
      </el-menu-item>
      <!-- 仪表盘 -->
      <el-menu-item index="/panel/dashboard">
        <el-icon>
          <Icons.Odometer />
        </el-icon>
        <template #title>
          <span>仪表盘</span>
        </template>
      </el-menu-item>
      <!-- 服务器管理 -->
      <!-- 暂未实现 -->
      <!-- <el-menu-item index="/panel/server">
        <el-icon>
          <Icons.Cloudy />
        </el-icon>
        <template #title>
          <span>服务器</span>
        </template>
      </el-menu-item> -->
      <!-- 终端 -->
      <el-menu-item index="/panel/terminal">
        <el-icon>
          <svg t="1751641492108" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
            p-id="4605" width="32" height="32">
            <path
              d="M341.333333 682.666667c-12.8 0-21.333333-4.266667-29.866666-12.8-17.066667-17.066667-17.066667-42.666667 0-59.733334L409.6 512 311.466667 413.866667c-17.066667-17.066667-17.066667-42.666667 0-59.733334s42.666667-17.066667 59.733333 0l128 128c17.066667 17.066667 17.066667 42.666667 0 59.733334l-128 128c-8.533333 8.533333-17.066667 12.8-29.866667 12.8zM682.666667 682.666667h-128c-25.6 0-42.666667-17.066667-42.666667-42.666667s17.066667-42.666667 42.666667-42.666667h128c25.6 0 42.666667 17.066667 42.666666 42.666667s-17.066667 42.666667-42.666666 42.666667z"
              p-id="4606"></path>
            <path
              d="M810.666667 896H213.333333c-72.533333 0-128-55.466667-128-128V256c0-72.533333 55.466667-128 128-128h597.333334c72.533333 0 128 55.466667 128 128v512c0 72.533333-55.466667 128-128 128zM213.333333 213.333333c-25.6 0-42.666667 17.066667-42.666666 42.666667v512c0 25.6 17.066667 42.666667 42.666666 42.666667h597.333334c25.6 0 42.666667-17.066667 42.666666-42.666667V256c0-25.6-17.066667-42.666667-42.666666-42.666667H213.333333z"
              p-id="4607"></path>
          </svg>
        </el-icon>
        <template #title>
          <span>终端</span>
        </template>
      </el-menu-item>
      <!-- 文件管理 -->
      <el-menu-item index="/panel/files">
        <el-icon>
          <Icons.Folder />
        </el-icon>
        <template #title>
          <span>文件管理</span>
        </template>
      </el-menu-item>
      <!-- 任务调度 -->
      <el-menu-item index="/panel/tasks">
        <el-icon>
          <Icons.Timer />
        </el-icon>
        <template #title>
          <span>任务调度</span>
        </template>
      </el-menu-item>
      <!-- 日志管理 -->
      <el-menu-item index="/panel/logs">
        <el-icon>
          <Icons.Document />
        </el-icon>
        <template #title>
          <span>日志管理</span>
        </template>
      </el-menu-item>
      <!-- 关于 -->
      <el-menu-item index="/panel/about">
        <el-icon>
          <Icons.InfoFilled />
        </el-icon>
        <template #title>
          <span>关于</span>
        </template>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-container {
  height: 100vh;
  /* 确保侧边栏占满视口高度 */
  width: var(--sidebar-width);
  transition: width var(--el-transition-duration);

  .el-menu {
    border: none;
    height: 100%;
    /* 菜单占满侧边栏高度 */
  }

  &.collapse {
    width: var(--sidebar-collapse-width);
  }
}
</style>
