# API 文档

Linux Server Panel 提供了完整的 RESTful API 接口，支持所有主要功能的编程访问。

## 🔗 基础信息

- **Base URL**: `https://your-domain.com/api`
- **API 版本**: v1
- **数据格式**: JSON
- **认证方式**: JWT Bearer Token
- **编码**: UTF-8

## 🔐 认证机制

### JWT Token 认证

所有需要认证的接口都需要在请求头中包含 JWT Token：

```http
Authorization: Bearer <your-jwt-token>
```

### Token 获取

通过登录接口获取 Token：

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

## 📝 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 具体数据
  },
  "timestamp": "2025-07-12T10:30:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "details": {
    // 错误详情
  },
  "timestamp": "2025-07-12T10:30:00.000Z"
}
```

## 🔑 认证接口

### 用户登录
```http
POST /api/auth/login
```

**请求参数**:
```json
{
  "username": "string",  // 用户名
  "password": "string"   // 密码
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "1",
      "username": "admin",
      "role": "admin",
      "lastLogin": "2025-07-12T10:30:00.000Z"
    }
  }
}
```

### 用户登出
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### 获取用户信息
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

## 🖥️ 系统信息接口

### 获取系统信息
```http
GET /api/server/info
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "hostname": "server-name",
    "os": "Linux Ubuntu 20.04",
    "kernel": "5.4.0-74-generic",
    "uptime": 1234567,
    "cpu": {
      "model": "Intel(R) Core(TM) i7-8700K",
      "cores": 8,
      "usage": 25.6
    },
    "memory": {
      "total": 16777216000,
      "used": 8388608000,
      "usage": 50.0
    },
    "disk": {
      "total": 1073741824000,
      "used": 536870912000,
      "usage": 50.0
    }
  }
}
```

### 获取系统资源
```http
GET /api/server/resources
Authorization: Bearer <token>
```

## 📊 监控接口

### 获取实时系统状态
```http
GET /api/monitor/system
Authorization: Bearer <token>
```

### 获取进程列表
```http
GET /api/monitor/processes
Authorization: Bearer <token>
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `pageSize`: 每页数量 (默认: 20)
- `sortBy`: 排序字段 (cpu|memory|pid|name)
- `sortOrder`: 排序方向 (asc|desc)

### 获取网络统计
```http
GET /api/monitor/network
Authorization: Bearer <token>
```

### 获取硬件信息
```http
GET /api/monitor/hardware
Authorization: Bearer <token>
```

## 📁 文件管理接口

### 浏览目录
```http
GET /api/files/browse
Authorization: Bearer <token>
```

**查询参数**:
- `path`: 目录路径 (默认: /)

**响应**:
```json
{
  "success": true,
  "data": {
    "path": "/home/user",
    "items": [
      {
        "name": "document.txt",
        "type": "file",
        "size": 1024,
        "permissions": "rw-r--r--",
        "owner": "user",
        "group": "user",
        "modified": "2025-07-12T10:30:00.000Z"
      }
    ]
  }
}
```

### 上传文件
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求参数**:
- `files`: 文件数据
- `path`: 目标路径

### 下载文件
```http
GET /api/files/download
Authorization: Bearer <token>
```

**查询参数**:
- `path`: 文件路径

### 创建文件夹
```http
POST /api/files/create-folder
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "path": "/home/user",
  "name": "new-folder"
}
```

### 删除文件/文件夹
```http
DELETE /api/files/delete
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "items": [
    {
      "path": "/home/user/file1.txt",
      "type": "file"
    }
  ]
}
```

### 获取文件内容
```http
GET /api/files/content
Authorization: Bearer <token>
```

**查询参数**:
- `path`: 文件路径

### 保存文件内容
```http
PUT /api/files/content
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "path": "/home/user/file.txt",
  "content": "文件内容"
}
```

## ⏰ 任务调度接口

### 获取任务列表
```http
GET /api/tasks/list
Authorization: Bearer <token>
```

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量
- `status`: 任务状态筛选
- `type`: 任务类型筛选

### 创建任务
```http
POST /api/tasks/create
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "name": "备份任务",
  "description": "每日数据备份",
  "command": "backup.sh",
  "schedule": {
    "triggerType": "cron",
    "cronExpression": "0 2 * * *"
  },
  "enabled": true
}
```

### 更新任务
```http
PUT /api/tasks/update/:id
Authorization: Bearer <token>
```

### 删除任务
```http
DELETE /api/tasks/delete/:id
Authorization: Bearer <token>
```

### 执行任务
```http
POST /api/tasks/execute/:id
Authorization: Bearer <token>
```

### 获取任务执行历史
```http
GET /api/tasks/executions/:id
Authorization: Bearer <token>
```

## 📋 日志接口

### 获取系统日志
```http
GET /api/system/logs
Authorization: Bearer <token>
```

**查询参数**:
- `page`: 页码
- `pageSize`: 每页数量
- `level`: 日志级别 (debug|info|warn|error)
- `category`: 日志分类
- `startDate`: 开始日期
- `endDate`: 结束日期
- `keyword`: 关键字搜索

### 获取日志文件内容
```http
GET /api/logs/file
Authorization: Bearer <token>
```

**查询参数**:
- `path`: 日志文件路径
- `lines`: 读取行数
- `from`: 起始行号

### 下载日志文件
```http
GET /api/logs/download
Authorization: Bearer <token>
```

## 🎛️ 系统操作接口

### 重启系统
```http
POST /api/system/reboot
Authorization: Bearer <token>
```

**请求参数**:
```json
{
  "delay": 30  // 延迟秒数
}
```

### 关闭系统
```http
POST /api/system/shutdown
Authorization: Bearer <token>
```

### 取消系统操作
```http
POST /api/system/cancel-operation
Authorization: Bearer <token>
```

### 获取系统配置
```http
GET /api/system/config
Authorization: Bearer <token>
```

### 更新系统配置
```http
PUT /api/system/config
Authorization: Bearer <token>
```

## 🔌 WebSocket 接口

Linux Server Panel 使用 WebSocket 提供实时数据传输。

### 连接地址
```
wss://your-domain.com:3001
```

### 认证
连接建立后发送认证消息：
```json
{
  "type": "auth",
  "token": "your-jwt-token"
}
```

### 订阅系统资源监控
```json
{
  "type": "subscribe",
  "channel": "system_monitor"
}
```

### 实时数据推送
```json
{
  "type": "system_status",
  "data": {
    "cpu": { "usage": 25.6 },
    "memory": { "usage": 50.0 },
    "disk": { "usage": 30.0 }
  },
  "timestamp": "2025-07-12T10:30:00.000Z"
}
```

### Web 终端连接
```json
{
  "type": "terminal_connect",
  "sessionId": "session-id"
}
```

## 📊 状态码说明

### HTTP 状态码
- `200`: 请求成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未认证
- `403`: 权限不足
- `404`: 资源不存在
- `429`: 请求频率限制
- `500`: 服务器内部错误

### 业务错误码
- `AUTH_FAILED`: 认证失败
- `TOKEN_EXPIRED`: Token 过期
- `PERMISSION_DENIED`: 权限不足
- `RESOURCE_NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 参数验证错误
- `OPERATION_FAILED`: 操作失败

## 🛡️ 安全注意事项

1. **Token 管理**: JWT Token 有效期为 24 小时，过期需重新登录
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **权限控制**: 不同用户角色有不同的 API 访问权限
4. **频率限制**: API 请求有频率限制，避免恶意调用
5. **输入验证**: 所有输入参数都会进行严格验证

## 📝 SDK 示例

### JavaScript/Node.js
```javascript
class ServerPanelAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(method, endpoint, data = null) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: data ? JSON.stringify(data) : null
    });
    
    return await response.json();
  }

  async getSystemInfo() {
    return await this.request('GET', '/server/info');
  }

  async uploadFile(path, file) {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('path', path);
    
    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });
    
    return await response.json();
  }
}

// 使用示例
const api = new ServerPanelAPI('https://your-domain.com/api', 'your-token');
const systemInfo = await api.getSystemInfo();
```

### Python
```python
import requests
import json

class ServerPanelAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    
    def request(self, method, endpoint, data=None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method, url, 
            headers=self.headers, 
            json=data
        )
        return response.json()
    
    def get_system_info(self):
        return self.request('GET', '/server/info')
    
    def create_task(self, task_data):
        return self.request('POST', '/tasks/create', task_data)

# 使用示例
api = ServerPanelAPI('https://your-domain.com/api', 'your-token')
system_info = api.get_system_info()
```

## 🔄 版本更新

### v1.0.0 (当前)
- 基础 API 接口
- 认证和权限管理
- 系统监控接口
- 文件管理接口
- 任务调度接口
- WebSocket 实时通信

### 计划更新
- v1.1.0: 增加用户管理接口
- v1.2.0: 增加服务管理接口
- v1.3.0: 增加插件系统接口

---

如有 API 相关问题，请参考 [故障排除文档](operations/troubleshooting.md) 或提交 Issue。
