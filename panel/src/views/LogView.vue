<script setup lang="ts" name="LogView">
import LogViewer from '@/components/log-manager/LogViewer.vue'
</script>

<template>
  <div class="log-view">
    <div class="page-header">
      <h1 class="page-title">日志管理</h1>
      <p class="page-description">查看和管理服务器日志文件</p>
    </div>

    <div class="log-content">
      <LogViewer />
    </div>
  </div>
</template>

<style scoped>
.log-view {
  flex:1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-description {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.log-content {
  flex: 1;
  overflow: hidden;
}
</style>
