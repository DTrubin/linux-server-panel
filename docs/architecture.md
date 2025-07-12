# 项目架构

本文档详细介绍 Linux Server Panel 的技术架构、设计理念和实现方案。

## 🏗️ 整体架构

### 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
├─────────────────────────────────────────────────────────────┤
│  Web浏览器  │  移动端浏览器  │  API客户端  │  第三方集成      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       前端层 (Vue 3)                         │
├─────────────────────────────────────────────────────────────┤
│  路由管理   │  状态管理   │  组件系统   │  工具函数         │
│ Vue Router  │   Pinia     │ Components  │  Utils            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      后端层 (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│   API路由   │   WebSocket  │  中间件     │   服务层         │
│  Express    │   ws.js      │ Middleware  │  Services        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (JSON)                           │
├─────────────────────────────────────────────────────────────┤
│  用户数据   │   任务数据   │  日志数据   │   配置数据       │
│  users.json │  tasks.json  │ logs.json   │ config.json      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      系统层 (OS)                             │
├─────────────────────────────────────────────────────────────┤
│  文件系统   │   进程管理   │  系统服务   │   硬件资源       │
│ FileSystem  │  Processes   │  Services   │  Hardware        │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 前端架构

### 技术栈选择
- **Vue 3**: 采用 Composition API，提供更好的类型支持和逻辑复用
- **TypeScript**: 强类型支持，提高代码质量和开发效率
- **Vite**: 现代化构建工具，快速的开发体验
- **Element Plus**: 成熟的 Vue 3 组件库
- **Pinia**: 新一代状态管理方案

### 目录结构设计
```
panel/src/
├── api/                    # API 接口层
│   ├── auth.ts            # 认证相关 API
│   ├── file.ts            # 文件管理 API
│   ├── system.ts          # 系统管理 API
│   └── index.ts           # API 统一导出
├── components/            # 组件层
│   ├── dashboard/         # 仪表盘组件
│   ├── file-manager/      # 文件管理组件
│   ├── main-layout/       # 布局组件
│   └── common/            # 通用组件
├── composables/           # 组合式函数
│   ├── useFileManager.ts  # 文件管理逻辑
│   ├── useAuth.ts         # 认证逻辑
│   └── useWebSocket.ts    # WebSocket 连接
├── store/                 # 状态管理
│   ├── modules/           # 模块化 store
│   │   ├── auth.ts        # 用户认证状态
│   │   ├── system.ts      # 系统状态
│   │   └── ui.ts          # 界面状态
│   └── index.ts           # Store 入口
├── router/                # 路由管理
│   ├── routes.ts          # 路由定义
│   ├── guards.ts          # 路由守卫
│   └── index.ts           # 路由配置
├── utils/                 # 工具函数
│   ├── axios.ts           # HTTP 请求配置
│   ├── websocket.ts       # WebSocket 工具
│   ├── chartManager.ts    # 图表管理
│   └── common.ts          # 通用工具
├── types/                 # 类型定义
│   ├── api.ts             # API 类型
│   ├── system.ts          # 系统类型
│   └── common.ts          # 通用类型
└── views/                 # 页面组件
    ├── DashboardView.vue  # 仪表盘页面
    ├── FileManager.vue    # 文件管理页面
    └── TerminalView.vue   # 终端页面
```

### 组件设计原则

#### 1. 单一职责原则
每个组件只负责一个特定功能，保证组件的可维护性：
```typescript
// 好的示例：专门的文件上传组件
// FileUploader.vue - 只处理文件上传逻辑

// 坏的示例：一个组件处理所有文件操作
// FileManager.vue - 包含上传、下载、编辑等所有功能
```

#### 2. 组合式 API 设计
使用组合式函数封装复杂逻辑：
```typescript
// useFileManager.ts
export function useFileManager() {
  const files = ref([])
  const loading = ref(false)
  
  const loadFiles = async (path: string) => {
    loading.value = true
    try {
      files.value = await getDirectoryContents(path)
    } finally {
      loading.value = false
    }
  }
  
  return { files, loading, loadFiles }
}
```

#### 3. 类型安全
严格的 TypeScript 类型定义：
```typescript
// types/file.ts
export interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  permissions: string
  modified: string
  path: string
}

export interface FileOperationResult {
  success: boolean
  message: string
  data?: any
}
```

### 状态管理架构

#### Pinia Store 设计
```typescript
// store/modules/systemResource.ts
export const useSystemResourceStore = defineStore('systemResource', {
  state: () => ({
    currentResource: null as SystemResource | null,
    isConnected: false,
    isConnecting: false,
    connectionError: null as string | null
  }),
  
  getters: {
    cpuUsage: (state) => state.currentResource?.cpu.usage || 0,
    memoryUsage: (state) => state.currentResource?.memory.usage || 0
  },
  
  actions: {
    updateResource(resource: SystemResource) {
      this.currentResource = resource
    },
    setConnectionStatus(connected: boolean) {
      this.isConnected = connected
      this.isConnecting = false
    }
  }
})
```

### 路由设计

#### 路由结构
```typescript
// router/routes.ts
export const routes = [
  {
    path: '/panel',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'files',
        name: 'FileManager',
        component: () => import('@/views/FileManager.vue'),
        meta: { title: '文件管理' }
      }
    ]
  }
]
```

#### 路由守卫
```typescript
// router/guards.ts
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
  } else {
    next()
  }
})
```

## ⚙️ 后端架构

### 技术栈选择
- **Node.js**: 高性能的 JavaScript 运行时
- **Express.js**: 轻量级 Web 框架
- **WebSocket**: 实时双向通信
- **JSON 文件**: 轻量级数据存储
- **systeminformation**: 系统信息获取

### 分层架构设计

#### 1. 路由层 (Routes)
负责 HTTP 请求的路由分发：
```javascript
// routes/file.js
import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { FileService } from '../services/FileService.js'

const router = express.Router()

router.get('/browse', authenticateToken, async (req, res) => {
  const { path = '/' } = req.query
  const result = await FileService.getDirectoryContents(path)
  res.json(result)
})

export default router
```

#### 2. 中间件层 (Middleware)
处理横切关注点：
```javascript
// middleware/auditLogger.js
export const auditLogger = () => {
  return async (req, res, next) => {
    const startTime = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - startTime
      logAuditEvent({
        method: req.method,
        url: req.url,
        userId: req.user?.id,
        duration,
        statusCode: res.statusCode
      })
    })
    
    next()
  }
}
```

#### 3. 服务层 (Services)
核心业务逻辑：
```javascript
// services/SystemMonitorService.js
export class SystemMonitorService {
  static async getSystemResources() {
    const [cpu, memory, disk, network] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ])
    
    return {
      cpu: this.processCpuData(cpu),
      memory: this.processMemoryData(memory),
      disk: this.processDiskData(disk),
      network: this.processNetworkData(network)
    }
  }
}
```

#### 4. 数据访问层 (DAO)
数据持久化操作：
```javascript
// database/dao.js
export class BaseDAO {
  constructor(collectionName) {
    this.collectionName = collectionName
    this.filePath = path.join(dataDir, `${collectionName}.json`)
  }
  
  async findAll() {
    return readJsonFile(this.filePath, [])
  }
  
  async create(data) {
    const items = await this.findAll()
    const newItem = { id: uuidv4(), ...data, createdAt: new Date() }
    items.push(newItem)
    await writeJsonFile(this.filePath, items)
    return newItem
  }
}
```

### WebSocket 架构

#### 连接管理
```javascript
// websocket/connectionManager.js
export class ConnectionManager {
  constructor() {
    this.connections = new Map()
  }
  
  addConnection(sessionId, ws, type) {
    this.connections.set(sessionId, {
      ws,
      type,
      createdAt: new Date(),
      lastActivity: new Date()
    })
  }
  
  broadcast(type, message) {
    this.connections.forEach(({ ws, type: connType }) => {
      if (connType === type && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    })
  }
}
```

#### 实时监控
```javascript
// websocket/monitor.js
export function startMonitoring() {
  const interval = setInterval(async () => {
    const systemData = await getSystemResources()
    
    broadcastToMonitorClients({
      type: 'system_status',
      data: systemData,
      timestamp: new Date().toISOString()
    })
  }, 1000)
  
  return interval
}
```

## 📊 数据流架构

### 请求处理流程
```
用户操作 → Vue组件 → API调用 → Express路由 → 中间件 → 服务层 → 数据层 → 响应返回
```

### 实时数据流
```
系统监控 → WebSocket服务 → 前端Store → 组件更新 → 界面渲染
```

### 状态同步机制
1. **HTTP 请求**: 用于一次性数据获取和操作
2. **WebSocket**: 用于实时数据推送
3. **本地缓存**: 减少不必要的请求
4. **乐观更新**: 提升用户体验

## 🔒 安全架构

### 认证流程
```
登录请求 → 验证凭据 → 生成JWT → 客户端存储 → 请求头携带 → 服务端验证
```

### 权限控制
```javascript
// middleware/auth.js
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' })
    req.user = user
    next()
  })
}
```

### 安全措施
1. **HTTPS 加密**: 所有通信使用 SSL/TLS
2. **JWT 认证**: 无状态的用户认证
3. **CORS 保护**: 跨域请求控制
4. **CSP 策略**: 内容安全策略
5. **审计日志**: 操作记录和追踪

## 🚀 性能优化

### 前端优化
1. **代码分割**: 路由级别的懒加载
2. **组件缓存**: keep-alive 缓存
3. **虚拟滚动**: 大数据列表优化
4. **防抖节流**: 频繁操作优化

### 后端优化
1. **内存缓存**: 频繁数据的内存缓存
2. **连接池管理**: WebSocket 连接优化
3. **异步处理**: 非阻塞 I/O 操作
4. **资源监控**: 系统资源使用优化

### 数据库优化
1. **索引优化**: JSON 数据快速查找
2. **分页查询**: 大数据集分页处理
3. **缓存策略**: 热点数据缓存
4. **定期清理**: 过期数据清理

## 🔧 扩展性设计

### 插件架构预留
```javascript
// 插件接口设计
export interface Plugin {
  name: string
  version: string
  install(app: Vue): void
  routes?: RouteConfig[]
  store?: StoreModule
}
```

### 微服务化准备
- 模块化设计便于拆分
- API 网关预留
- 服务发现机制
- 配置中心支持

### 国际化支持
- i18n 框架集成
- 多语言资源管理
- 动态语言切换
- 本地化适配

## 📈 监控与运维

### 应用监控
- 性能指标收集
- 错误日志记录
- 用户行为分析
- 系统健康检查

### 部署架构
```
负载均衡器 → Web服务器 → 应用服务器 → 数据存储
    ↓           ↓           ↓          ↓
  Nginx      静态文件    Node.js     JSON文件
```

### 容器化支持
- Docker 镜像构建
- docker-compose 编排
- Kubernetes 部署
- 健康检查配置

---

这个架构设计确保了系统的：
- **可维护性**: 清晰的分层和模块化设计
- **可扩展性**: 预留扩展接口和插件机制
- **高性能**: 多层次的性能优化策略
- **安全性**: 全方位的安全防护措施
- **可靠性**: 错误处理和监控机制
