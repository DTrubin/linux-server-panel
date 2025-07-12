<script setup lang="ts">
import Sidebar from '@/components/main-layout/SideBar.vue'
import Navbar from '@/components/main-layout/NavBar.vue'
import AppMain from '@/components/main-layout/AppMain.vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'

const authStore = useAuthStore()
// 刷新用户信息
authStore.refreshProfile()
// 默认跳转 home
const router = useRouter()
if (router.currentRoute.value.path === '/panel') {
  router.replace({ path: '/panel/home' })
}

</script>

<template>
  <div class="layout-container">
    <!--侧边栏 -->
    <Sidebar />

    <!--主容器 -->
    <div class="main-container">
      <!--导航栏 -->
      <Navbar />

      <!--主内容区 -->
      <AppMain />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-container {
  display: flex;
  overflow: hidden;

  .main-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 防止超出 */
    transition: margin-left 0.28s;
  }
}
</style>
