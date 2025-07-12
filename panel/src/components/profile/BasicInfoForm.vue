<template>
  <el-form
    ref="formRef"
    :model="localUserForm"
    :rules="formRules"
    label-width="120px"
    label-position="left"
    class="basic-info-form"
  >
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="localUserForm.username"
            placeholder="用户名不可修改"
            disabled
            clearable
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
          <div class="field-tip">用户名创建后不可修改</div>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="localUserForm.email"
            placeholder="请输入邮箱地址"
            :disabled="!editMode"
            clearable
            @input="handleInput"
          >
            <template #prefix>
              <el-icon><Message /></el-icon>
            </template>
          </el-input>
          <div class="field-tip">用于接收系统通知和找回密码</div>
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="localUserForm.phone"
            placeholder="请输入手机号码"
            :disabled="!editMode"
            clearable
            @input="handleInput"
          >
            <template #prefix>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
          <div class="field-tip">用于接收短信通知和安全验证</div>
        </el-form-item>
      </el-col>

      <el-col :span="12">
        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="localUserForm.nickname"
            placeholder="请输入昵称"
            :disabled="!editMode"
            clearable
            @input="handleInput"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
          <div class="field-tip">显示给其他用户的友好名称</div>
        </el-form-item>
      </el-col>
    </el-row>

    <!-- 操作按钮 -->
    <el-form-item class="button-group">
      <el-button v-show="!editMode" type="primary" @click="enterEdit">
        <el-icon><Edit /></el-icon>
        编辑信息
      </el-button>
      <el-button v-show="editMode" type="primary" @click="saveUserInfo" :loading="saving">
        <el-icon><Check /></el-icon>
        保存修改
      </el-button>
      <el-button v-show="editMode" @click="cancelEdit">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { User, Message, Phone, Edit, Check, Close } from '@element-plus/icons-vue'
import type { FormRules, FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/modules/auth'

// 定义 props
interface Props {
  userForm: {
    id?: string
    username: string
    email: string
    phone: string
    nickname: string
    [key: string]: any
  }
}

const props = withDefaults(defineProps<Props>(), {
  userForm: () => ({
    username: '',
    email: '',
    phone: '',
    nickname: ''
  })
})

// 定义 emits
const emit = defineEmits<{
  'update:userForm': [value: any]
  'error': [message: string]
}>()

const authStore = useAuthStore()

// 内部状态管理
const editMode = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

// 本地表单数据
const localUserForm = ref({
  username: '',
  email: '',
  phone: '',
  nickname: ''
})

// 原始数据备份（用于取消编辑时恢复）
const originalData = ref({
  username: '',
  email: '',
  phone: '',
  nickname: ''
})

// 监听 props 变化，更新本地数据
watch(() => props.userForm, (newVal) => {
  if (newVal) {
    localUserForm.value = {
      username: newVal.username || '',
      email: newVal.email || '',
      phone: newVal.phone || '',
      nickname: newVal.nickname || ''
    }
    // 备份原始数据
    originalData.value = { ...localUserForm.value }
  }
}, { immediate: true, deep: true })

// 表单验证规则
const formRules: FormRules = {
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  nickname: [
    { min: 2, max: 20, message: '昵称长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 进入编辑模式
const enterEdit = () => {
  editMode.value = true
  // 备份当前数据
  originalData.value = { ...localUserForm.value }
}

// 保存用户信息
const saveUserInfo = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (saving.value) return

  saving.value = true
  try {
    console.log('BasicInfoForm 开始保存用户信息:', localUserForm.value)

    // 调用真实的API保存用户信息
    const result = await authStore.updateUserInfo({
      id: props.userForm.id || '',
      email: localUserForm.value.email,
      phone: localUserForm.value.phone,
      nickname: localUserForm.value.nickname
    })

    console.log('BasicInfoForm 保存结果:', result)
    console.log('BasicInfoForm result.success:', result.success)
    console.log('BasicInfoForm typeof result.success:', typeof result.success)

    if (result.success) {
      console.log('BasicInfoForm 保存成功，发送更新事件')
      // 发送更新事件到父组件
      emit('update:userForm', { ...props.userForm, ...localUserForm.value })

      editMode.value = false
      ElMessage.success('用户信息保存成功!')
    } else {
      console.error('BasicInfoForm 保存失败，success为false:', result)
      emit('error', result.message || '保存失败，请重试!')
    }
  } catch (error: any) {
    console.error('BasicInfoForm 进入catch块，错误:', error)
    console.error('BasicInfoForm 错误类型:', typeof error)
    console.error('BasicInfoForm 错误堆栈:', error.stack)
    emit('error', error.message || '保存失败，请重试!')
  } finally {
    saving.value = false
  }
}

// 取消编辑
const cancelEdit = () => {
  editMode.value = false
  // 恢复原始数据
  localUserForm.value = { ...originalData.value }
}

// 处理输入事件
const handleInput = () => {
  // 可以在这里添加实时验证或其他逻辑
}
</script>

<style scoped lang="scss">
.basic-info-form {
  padding: 20px 0;

  .button-group {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f0f0f0;

    :deep(.el-form-item__content) {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .el-button {
      border-radius: 8px;
      padding: 12px 24px;
      font-weight: 500;
      min-width: 120px;
    }
  }

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #555;
  }

  .field-tip {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
    line-height: 1.4;
  }

  :deep(.el-input) {
    .el-input__wrapper {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.is-focus {
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      }

      &.is-disabled {
        background-color: #f8f9fa;
        border-color: #e9ecef;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .basic-info-form {
    .button-group {
      :deep(.el-form-item__content) {
        flex-direction: column;

        .el-button {
          width: 100%;
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    :deep(.el-col) {
      margin-bottom: 16px;
    }
  }
}
</style>
