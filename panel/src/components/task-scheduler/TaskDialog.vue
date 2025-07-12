<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="isEditMode ? '编辑任务' : '创建任务'"
    width="800px"
    @close="resetForm"
  >
    <el-form
      ref="taskFormRef"
      :model="taskForm"
      :rules="taskFormRules"
      label-width="100px"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="任务名称" prop="name">
            <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="任务类型" prop="type">
            <el-select v-model="taskForm.type" placeholder="选择任务类型">
              <el-option label="Shell脚本" value="shell" />
              <el-option label="备份任务" value="backup" />
              <el-option label="维护任务" value="maintenance" />
              <el-option label="自定义" value="custom" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="描述">
        <el-input
          v-model="taskForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入任务描述"
        />
      </el-form-item>

      <el-form-item label="执行命令" prop="command">
        <el-input
          v-model="taskForm.command"
          type="textarea"
          :rows="4"
          placeholder="请输入要执行的命令"
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="工作目录">
            <el-input v-model="taskForm.workingDirectory" placeholder="默认为当前目录" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="优先级">
            <el-select v-model="taskForm.priority" placeholder="选择优先级">
              <el-option label="低" value="low" />
              <el-option label="普通" value="normal" />
              <el-option label="高" value="high" />
              <el-option label="紧急" value="urgent" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 调度设置 -->
      <el-divider content-position="left">调度设置</el-divider>
      <el-form-item label="触发类型">
        <el-radio-group v-model="scheduleForm.triggerType">
          <el-radio value="manual">手动执行</el-radio>
          <el-radio value="cron">Cron表达式</el-radio>
          <el-radio value="interval">定时间隔</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item
        v-if="scheduleForm.triggerType === 'cron'"
        label="Cron表达式"
        prop="cronExpression"
      >
        <el-input
          v-model="scheduleForm.cronExpression"
          placeholder="例如: 0 0 * * * (每天零点执行)"
        />
        <div class="form-tip">
          格式: 秒 分 时 日 月 周 年
        </div>
      </el-form-item>

      <el-form-item
        v-if="scheduleForm.triggerType === 'interval'"
        label="间隔时间"
        prop="interval"
      >
        <el-input-number
          v-model="scheduleForm.interval"
          :min="60"
          :step="60"
          placeholder="秒"
        />
        <span style="margin-left: 8px">秒</span>
      </el-form-item>

      <el-form-item label="启用任务">
        <el-switch v-model="taskForm.enabled" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        {{ isEditMode ? '更新' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type {
  CreateTaskParams,
  TriggerType
} from '@/types/task'

const props = defineProps<{
  visible: boolean
  isEditMode: boolean
  taskData: any
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
  (e: 'save', taskData: any): void
}>()

const taskFormRef = ref()

const taskForm = reactive<CreateTaskParams>({
  name: '',
  description: '',
  type: 'shell',
  command: '',
  arguments: [],
  workingDirectory: '',
  environment: {},
  priority: 'normal',
  enabled: true
})

const scheduleForm = reactive({
  triggerType: 'manual' as TriggerType,
  cronExpression: '',
  interval: 3600
})

// 表单验证规则
const taskFormRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择任务类型', trigger: 'change' }
  ],
  command: [
    { required: true, message: '请输入执行命令', trigger: 'blur' }
  ],
  cronExpression: [
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (scheduleForm.triggerType === 'cron' && !value) {
          callback(new Error('请输入Cron表达式'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  interval: [
    {
      validator: (rule: any, value: number, callback: Function) => {
        if (scheduleForm.triggerType === 'interval' && (!value || value < 60)) {
          callback(new Error('间隔时间不能少于60秒'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 监听任务数据变化，填充表单
watch(() => props.taskData, (val) => {
  if (val) {
    Object.assign(taskForm, {
      name: val.name,
      description: val.description || '',
      type: val.type,
      command: val.command,
      arguments: val.arguments || [],
      workingDirectory: val.workingDirectory || '',
      environment: val.environment || {},
      priority: val.priority,
      enabled: val.enabled
    })

    if (val.schedule) {
      scheduleForm.triggerType = val.schedule.triggerType || 'manual'
      scheduleForm.cronExpression = val.schedule.cronExpression || ''
      scheduleForm.interval = val.schedule.interval || 3600
    } else {
      scheduleForm.triggerType = 'manual'
      scheduleForm.cronExpression = ''
      scheduleForm.interval = 3600
    }
  }
}, { deep: true })

const closeDialog = () => {
  emit('update:visible', false)
}

const handleSave = async () => {
  try {
    await taskFormRef.value?.validate()

    const taskData = {
      ...taskForm,
      schedule: scheduleForm.triggerType !== 'manual' ? {
        triggerType: scheduleForm.triggerType,
        cronExpression: scheduleForm.cronExpression,
        interval: scheduleForm.interval
      } : undefined
    }

    emit('save', taskData)
  } catch (error) {
    // 表单验证失败
    console.error('表单验证失败:', error)
  }
}

const resetForm = () => {
  taskFormRef.value?.clearValidate()
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 20px;
  border-top: 1px solid #ebeef5;
}
</style>
