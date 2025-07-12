<template>
  <el-card class="filter-card">
    <el-form :model="queryParams" inline class="filter-form">
      <el-form-item label="搜索">
        <el-input
          v-model="queryParams.keyword"
          placeholder="搜索任务名称或描述"
          :prefix-icon="Search"
          clearable
          @change="handleSearch"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select
          v-model="queryParams.status"
          placeholder="选择状态"
          clearable
          multiple
          @change="handleSearch"
          style="width: 150px"
        >
          <el-option label="待执行" value="pending" />
          <el-option label="运行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select
          v-model="queryParams.type"
          placeholder="选择类型"
          clearable
          multiple
          @change="handleSearch"
          style="width: 150px"
        >
          <el-option label="Shell脚本" value="shell" />
          <el-option label="备份任务" value="backup" />
          <el-option label="维护任务" value="maintenance" />
          <el-option label="自定义" value="custom" />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select
          v-model="queryParams.priority"
          placeholder="选择优先级"
          clearable
          multiple
          @change="handleSearch"
          style="width: 120px"
        >
          <el-option label="低" value="low" />
          <el-option label="普通" value="normal" />
          <el-option label="高" value="high" />
          <el-option label="紧急" value="urgent" />
        </el-select>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import type { TaskQueryParams } from '@/types/task'

const props = defineProps<{
  queryParams: TaskQueryParams
}>()

const emit = defineEmits<{
  (e: 'search'): void
}>()

const handleSearch = () => {
  emit('search')
}
</script>

<style scoped>
.filter-card {
  margin-bottom: 20px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-form {
  margin: 0;
}
</style>
