<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import router from '@/router'
import { useAuthStore } from '@/store/modules/auth'
import MainLayout from '@/layouts/MainLayout.vue'

const authStore = useAuthStore()
const route = useRoute()

// 全局错误处理
const globalError = ref<string | null>(null)

// 判断是否使用默认布局
const isMainLayout = computed(() => {
  return route.path.startsWith('/layout')
})

// 关闭错误提示的处理
const handleCloseError = () => {
  globalError.value = null
  // 如果是登录错误，关闭后立即跳转
  if (!authStore.token) {
    router.replace('/login')
  }
}

</script>

<template>
  <!-- 全局错误提示 -->
  <el-alert v-if="globalError" :title="globalError" type="error" show-icon closable @close="handleCloseError"
    class="global-alert" />

  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <!-- 根据路由元信息选择布局 -->
      <MainLayout v-if="isMainLayout" key="with-layout">
        <component :is="Component" :key="route.fullPath" />
      </MainLayout>
      <component v-else :is="Component" :key="route.fullPath" />
    </transition>
  </router-view>
</template>

<style lang="scss">
@use '@/assets/styles/variables.scss';

#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--el-text-color-primary);
  display: flex;
  flex-direction: column;
}

.global-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: 80%;
  max-width: 800px;
}

// 路由过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
