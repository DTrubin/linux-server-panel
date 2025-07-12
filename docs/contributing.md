# 贡献指南

感谢您对 Linux Server Panel 项目的关注！我们非常欢迎社区的贡献，无论是 bug 报告、功能建议、代码贡献还是文档改进。

## 📋 目录

1. [开始之前](#开始之前)
2. [开发环境搭建](#开发环境搭建)
3. [代码规范](#代码规范)
4. [提交规范](#提交规范)
5. [Pull Request 流程](#pull-request-流程)
6. [Bug 报告](#bug-报告)
7. [功能建议](#功能建议)
8. [文档贡献](#文档贡献)

## 🚀 开始之前

### 行为准则

参与本项目的所有成员都需要遵守我们的行为准则：

- **尊重**: 尊重不同的观点和经验
- **包容**: 欢迎所有背景的贡献者
- **专业**: 保持专业和建设性的讨论
- **协作**: 与其他贡献者友好合作
- **学习**: 保持开放的学习态度

### 贡献方式

您可以通过以下方式为项目做出贡献：

- 🐛 报告 bug 和问题
- 💡 提出新功能建议
- 🔧 修复 bug 和实现新功能
- 📚 改进项目文档
- 🎨 优化用户界面和体验
- 🧪 编写和改进测试
- 🌐 提供多语言支持
- 📖 翻译项目文档

## 💻 开发环境搭建

### 前置要求

确保您的开发环境满足以下要求：

```bash
# Node.js 版本
node >= 18.0.0
npm >= 8.0.0
# 或者使用 pnpm
pnpm >= 7.0.0

# Git
git >= 2.20.0

# 操作系统 (后端测试)
Linux (推荐 Ubuntu 20.04+)
或 macOS 10.15+
或 Windows 10+ (使用 WSL2)
```

### 克隆项目

```bash
# 1. Fork 项目到您的 GitHub 账户
# 2. 克隆 fork 的项目
git clone https://github.com/your-username/Linux-server-panel.git
cd Linux-server-panel

# 3. 添加上游仓库
git remote add upstream https://github.com/original-repo/Linux-server-panel.git

# 4. 创建开发分支
git checkout -b feature/your-feature-name
```

### 安装依赖

```bash
# 安装前端依赖
cd panel
pnpm install

# 安装后端依赖
cd ../server
pnpm install

# 回到项目根目录
cd ..
```

### 开发配置

#### 前端配置
```bash
# panel/.env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_UPLOAD_MAX_SIZE=104857600
```

#### 后端配置
```bash
# server/config.json
{
  "port": 3000,
  "host": "localhost",
  "security": {
    "jwtSecret": "your-dev-jwt-secret",
    "sessionTimeout": 3600
  },
  "upload": {
    "maxSize": 104857600,
    "allowedTypes": ["*"]
  }
}
```

### 启动开发服务器

```bash
# 启动后端服务器 (在一个终端中)
cd server
npm run dev

# 启动前端开发服务器 (在另一个终端中)
cd panel
npm run dev
```

现在您可以在 `http://localhost:5173` 访问前端应用。

## 📏 代码规范

### TypeScript/JavaScript 规范

我们使用 ESLint 和 Prettier 来保持代码一致性：

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@vue/typescript/recommended',
    '@vue/prettier'
  ],
  rules: {
    // 自定义规则
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prettier/prettier': 'error'
  }
}

// prettier.config.js
module.exports = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 80
}
```

#### 命名规范

```typescript
// 文件命名: kebab-case
file-manager.vue
user-profile.ts
system-monitor.service.ts

// 组件命名: PascalCase
<template>
  <FileManager />
  <UserProfile />
</template>

// 变量和函数: camelCase
const userName = 'admin'
const getUserInfo = () => {}

// 常量: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:3000'
const MAX_UPLOAD_SIZE = 1024 * 1024 * 100

// 类型定义: PascalCase
interface UserInfo {
  id: number
  username: string
  role: UserRole
}

type UserRole = 'admin' | 'user'
```

#### 代码组织

```typescript
// Vue 组件结构
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from '@/types'

// 2. 类型定义
interface Props {
  user: User
}

// 3. Props 和 Emits
const props = defineProps<Props>()
const emit = defineEmits<{
  update: [user: User]
}>()

// 4. 响应式数据
const isLoading = ref(false)
const userList = ref<User[]>([])

// 5. 计算属性
const filteredUsers = computed(() => {
  return userList.value.filter(user => user.active)
})

// 6. 方法
const fetchUsers = async () => {
  isLoading.value = true
  try {
    // API 调用
  } finally {
    isLoading.value = false
  }
}

// 7. 生命周期钩子
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
/* 样式 */
</style>
```

### Vue 最佳实践

```vue
<!-- 1. 使用 Composition API -->
<script setup lang="ts">
// 推荐
import { ref, computed } from 'vue'
const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

<!-- 2. 类型安全 -->
<script setup lang="ts">
// 定义 Props 类型
interface Props {
  title: string
  count?: number
}
const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// 定义 Emits 类型
const emit = defineEmits<{
  update: [value: number]
  delete: [id: string]
}>()
</script>

<!-- 3. 响应式解构 -->
<script setup lang="ts">
import { reactive } from 'vue'
const state = reactive({
  name: '',
  age: 0
})

// 错误: 会失去响应性
// const { name, age } = state

// 正确: 保持响应性
const { name, age } = toRefs(state)
</script>
```

### CSS 规范

```scss
// 使用 BEM 命名规范
.file-manager {
  &__header {
    display: flex;
    justify-content: space-between;
    
    &--loading {
      opacity: 0.5;
    }
  }
  
  &__content {
    padding: 1rem;
  }
  
  &__item {
    &:hover {
      background-color: var(--color-hover);
    }
    
    &--selected {
      background-color: var(--color-primary);
    }
  }
}

// 使用 CSS 变量
:root {
  --color-primary: #409eff;
  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-danger: #f56c6c;
  --color-info: #909399;
  
  --font-size-base: 14px;
  --font-size-small: 12px;
  --font-size-large: 16px;
  
  --border-radius: 4px;
  --box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
```

## 📝 提交规范

我们使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

### 提交消息格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 提交类型

```bash
feat:     新功能
fix:      bug 修复
docs:     文档更新
style:    代码格式调整 (不影响功能)
refactor: 代码重构 (不是新功能也不是 bug 修复)
perf:     性能优化
test:     测试相关
build:    构建系统或依赖项更改
ci:       CI 配置文件和脚本更改
chore:    其他不修改源代码的更改
revert:   回退之前的提交
```

### 提交示例

```bash
# 新功能
feat(file-manager): add file upload progress indicator

# Bug 修复
fix(terminal): resolve websocket connection issue on mobile

# 文档更新
docs(api): update authentication endpoints documentation

# 重构
refactor(dashboard): extract chart components for reusability

# 性能优化
perf(log-viewer): implement virtual scrolling for large log files

# 破坏性变更
feat(api)!: change user authentication to JWT-based system

BREAKING CHANGE: The authentication system has been changed from session-based 
to JWT-based. Existing sessions will be invalidated.
```

### 提交前检查

```bash
# 运行代码检查
npm run lint

# 运行类型检查
npm run type-check

# 运行测试
npm run test

# 检查构建
npm run build
```

## 🔄 Pull Request 流程

### 创建 Pull Request

1. **更新本地代码**
```bash
git checkout main
git pull upstream main
git checkout your-feature-branch
git rebase main
```

2. **推送分支**
```bash
git push origin your-feature-branch
```

3. **创建 PR**
   - 访问项目的 GitHub 页面
   - 点击 "New Pull Request"
   - 选择您的分支
   - 填写 PR 描述

### PR 模板

```markdown
## 📝 变更描述
<!-- 简要描述这个 PR 的目的和变更内容 -->

## 🔧 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他:

## 🧪 测试
<!-- 描述如何测试这些变更 -->
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成

## 📸 截图 (如果适用)
<!-- 添加截图或 GIF 来展示变更 -->

## ✅ 检查清单
- [ ] 代码遵循项目的代码规范
- [ ] 我已经执行了自我代码审查
- [ ] 我已经添加了必要的注释
- [ ] 我已经更新了相关文档
- [ ] 我的变更没有产生新的警告
- [ ] 我已经添加了测试来验证修复/功能
- [ ] 新的和现有的单元测试都通过

## 🔗 相关 Issue
<!-- 关联相关的 Issue，例如: Closes #123 -->

## 📋 额外信息
<!-- 任何审查者需要知道的额外信息 -->
```

### 代码审查

#### 审查重点

1. **功能性**: 代码是否按预期工作
2. **可读性**: 代码是否清晰易懂
3. **性能**: 是否存在性能问题
4. **安全性**: 是否存在安全隐患
5. **测试**: 是否有足够的测试覆盖
6. **文档**: 是否需要更新文档

#### 审查清单

```markdown
## 代码审查清单

### 功能性
- [ ] 功能按需求规格实现
- [ ] 边界条件处理正确
- [ ] 错误处理完善

### 代码质量
- [ ] 代码逻辑清晰
- [ ] 命名规范
- [ ] 注释充分
- [ ] 无重复代码

### 性能
- [ ] 无明显性能问题
- [ ] 数据库查询优化
- [ ] 内存使用合理

### 安全性
- [ ] 输入验证
- [ ] 权限检查
- [ ] SQL 注入防护
- [ ] XSS 防护

### 测试
- [ ] 单元测试覆盖
- [ ] 集成测试覆盖
- [ ] 测试用例充分
```

## 🐛 Bug 报告

### Bug 报告模板

```markdown
## 🐛 Bug 描述
<!-- 清晰简洁地描述 bug -->

## 🔄 重现步骤
1. 进入 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

## 🎯 期望行为
<!-- 描述您期望发生的行为 -->

## 📸 截图
<!-- 如果适用，添加截图来帮助解释问题 -->

## 🖥️ 环境信息
- OS: [例如 Ubuntu 20.04]
- Browser: [例如 Chrome 91.0]
- Node.js: [例如 18.17.0]
- Panel Version: [例如 1.0.0]

## 📋 额外信息
<!-- 任何其他相关信息 -->

## 🔍 错误日志
```
<!-- 粘贴相关的错误日志 -->
```

### Bug 优先级

- **Critical**: 系统崩溃、数据丢失、安全漏洞
- **High**: 核心功能无法使用
- **Medium**: 功能受限但有替代方案
- **Low**: 小问题、改进建议

## 💡 功能建议

### 功能建议模板

```markdown
## 🚀 功能描述
<!-- 清晰描述想要的功能 -->

## 🎯 问题背景
<!-- 这个功能解决了什么问题？ -->

## 💭 解决方案
<!-- 描述您希望如何实现这个功能 -->

## 🔄 替代方案
<!-- 描述您考虑过的其他解决方案 -->

## 📋 额外信息
<!-- 任何其他相关信息或截图 -->

## ✅ 验收标准
<!-- 如何确定这个功能已经完成？ -->
- [ ] 标准 1
- [ ] 标准 2
- [ ] 标准 3
```

### 功能评估标准

- **影响范围**: 有多少用户会受益
- **实现复杂度**: 开发难度和时间成本
- **维护成本**: 长期维护的复杂性
- **架构影响**: 对现有架构的影响
- **资源需求**: 所需的人力和技术资源

## 📚 文档贡献

### 文档类型

1. **用户文档**: 用户使用指南
2. **开发文档**: 开发环境搭建、API 文档
3. **运维文档**: 部署、监控、故障排除
4. **设计文档**: 架构设计、技术选型

### 文档编写规范

#### Markdown 规范

```markdown
# 一级标题 (每个文档只有一个)

## 二级标题 (主要章节)

### 三级标题 (子章节)

#### 四级标题 (详细内容)

<!-- 代码块指定语言 -->
```typescript
const example: string = 'hello world'
```

<!-- 表格格式 -->
| 字段 | 类型 | 描述 |
|------|------|------|
| id   | number | 用户ID |
| name | string | 用户名 |

<!-- 引用 -->
> 这是一个重要的提示信息

<!-- 列表 -->
- 项目 1
- 项目 2
  - 子项目 2.1
  - 子项目 2.2

<!-- 链接 -->
[链接文本](相对路径或URL)

<!-- 图片 -->
![图片描述](图片路径)
```

#### 写作风格

- **简洁明了**: 使用简单直接的语言
- **结构清晰**: 合理使用标题和列表
- **示例丰富**: 提供具体的代码示例
- **用户友好**: 从用户角度出发编写
- **及时更新**: 保持文档与代码同步

### 文档维护

1. **定期审查**: 每个发版周期审查文档
2. **用户反馈**: 根据用户反馈改进文档
3. **链接检查**: 确保所有链接有效
4. **版本控制**: 为重要变更记录版本

## 🏆 贡献者认可

### 贡献者类型

- **代码贡献者**: 提交代码的开发者
- **文档贡献者**: 改进文档的作者
- **问题报告者**: 提交 bug 报告的用户
- **功能建议者**: 提出功能建议的用户
- **审查者**: 参与代码审查的成员
- **测试者**: 参与测试的用户

### 认可方式

- **贡献者列表**: 在 README 中列出所有贡献者
- **发版感谢**: 在发版说明中感谢贡献者
- **特殊徽章**: 为重要贡献者提供特殊徽章
- **年度奖励**: 年度最佳贡献者奖励

## 📞 联系方式

如果您在贡献过程中遇到任何问题，可以通过以下方式联系我们：

- **GitHub Issues**: 在项目中创建 Issue
- **GitHub Discussions**: 参与项目讨论
- **Email**: [项目邮箱]
- **微信群**: [加入微信群]

---

再次感谢您对 Linux Server Panel 项目的贡献！您的参与让这个项目变得更好。
