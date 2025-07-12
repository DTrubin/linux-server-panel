<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="执行输出"
    width="800px"
  >
    <div class="output-container">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="标准输出" name="output">
          <pre class="output-content">{{ execution?.output || '无输出' }}</pre>
        </el-tab-pane>
        <el-tab-pane label="错误输出" name="error">
          <pre class="output-content error">{{ execution?.error || '无错误' }}</pre>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TaskExecution } from '@/types/task'

const props = defineProps<{
  visible: boolean
  execution: TaskExecution | undefined
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
}>()

const activeTab = ref('output')
</script>

<style scoped>
.output-container {
  max-height: 500px;
  overflow: auto;
}

.output-content {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow: auto;
}

.output-content.error {
  background-color: #fff5f5;
  border-color: #fed7d7;
  color: #c53030;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-dialog__body) {
  padding: 20px;
}
</style>
