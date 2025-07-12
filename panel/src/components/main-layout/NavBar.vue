<script setup lang="ts">
import UserDropdown from './UserDropdown.vue'
import { useAppStore } from '@/store'
import { computed } from 'vue'
import { Sunny, Moon } from '@element-plus/icons-vue'

const appStore = useAppStore()

// 使用可写的计算属性
const isDarkTheme = computed({
  get: () => appStore.theme === 'dark',
  set: (value) => appStore.setTheme(value ? 'dark' : 'light')
})
</script>

<template>
  <div class="navbar">
    <el-switch v-model="isDarkTheme" :active-action-icon="Moon" :inactive-action-icon="Sunny" />
    <UserDropdown />
  </div>
</template>

<style lang="scss" scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: var(--navbar-height);
  /* 确保最小高度，防止被压缩 */
  min-height: var(--navbar-height);
  /* 防止在flex容器中被压缩 */
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  transition: width 0.28s;
  /* 添加内边距 */
  padding: 0 20px;
}
</style>
