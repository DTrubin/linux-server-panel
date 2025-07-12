# API 参考文档

本文档详细说明了 Linux Server Panel 的所有 REST API 和 WebSocket 接口，便于开发者进行集成或二次开发。

## 📚 目录

1. [API 概览](#api-概览)
2. [认证与鉴权](#认证与鉴权)
3. [REST API 接口](#rest-api-接口)
   - [认证 API](#认证-api)
   - [系统监控 API](#系统监控-api)
   - [文件管理 API](#文件管理-api)
   - [任务调度 API](#任务调度-api)
   - [日志管理 API](#日志管理-api)
   - [系统设置 API](#系统设置-api)
   - [用户管理 API](#用户管理-api)
4. [WebSocket 接口](#websocket-接口)
5. [状态码与错误处理](#状态码与错误处理)
6. [API 调用限制](#api-调用限制)
7. [SDK 示例](#sdk-示例)

## 🌐 API 概览

### 基本信息

- **基础 URL**: `https://{服务器地址}:{端口}/api`
- **API 版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8

### 请求格式

```http
GET /api/system/info HTTP/1.1
Host: your-server.com
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### 响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 返回的数据
  }
}
```

## 🔐 认证与鉴权

### 认证流程

1. 通过 `/api/auth/login` 获取 JWT 令牌
2. 在后续请求中使用该令牌进行身份验证
3. 令牌过期时使用 `/api/auth/refresh` 刷新令牌

### JWT 结构

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "用户ID",
  "username": "用户名",
  "role": "用户角色",
  "iat": 1657627456,
  "exp": 1657631056
}

// 签名
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

### 权限检查

API 根据用户角色实施权限控制：

| 角色 | 权限范围 |
|------|---------|
| admin | 所有操作 |
| operator | 大多数操作，除系统关键设置外 |
| viewer | 只读操作 |
| custom | 自定义权限 |

## 📡 REST API 接口

### 认证 API

#### 登录

```
POST /api/auth/login
```

**请求参数：**

```json
{
  "username": "admin",
  "password": "your_password"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "1",
      "username": "admin",
      "role": "admin",
      "lastLogin": "2025-07-11T14:30:00Z"
    }
  }
}
```

#### 刷新令牌

```
POST /api/auth/refresh
```

**请求参数：**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应：**

```json
{
  "code": 200,
  "message": "令牌刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### 登出

```
POST /api/auth/logout
```

**请求参数：** 无

**响应：**

```json
{
  "code": 200,
  "message": "登出成功"
}
```

#### 修改密码

```
PUT /api/auth/password
```

**请求参数：**

```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

### 系统监控 API

#### 获取系统信息

```
GET /api/system/info
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "hostname": "server-01",
    "os": {
      "platform": "linux",
      "distro": "Ubuntu 20.04.3 LTS",
      "kernel": "5.4.0-74-generic",
      "arch": "x64"
    },
    "uptime": 1324512,
    "loadavg": [1.2, 1.5, 1.8],
    "lastBoot": "2025-06-27T14:30:15Z"
  }
}
```

#### 获取 CPU 使用率

```
GET /api/monitor/cpu
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| interval | number | 历史数据间隔(秒) | 60 |
| count | number | 返回的数据点数量 | 60 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "current": {
      "usage": 25.6,
      "cores": 8,
      "threads": 16,
      "speed": 2.4,
      "load": [1.2, 1.5, 1.8]
    },
    "history": [
      { "timestamp": 1657627456000, "usage": 24.5 },
      { "timestamp": 1657627516000, "usage": 25.6 },
      // 更多历史数据...
    ]
  }
}
```

#### 获取内存使用率

```
GET /api/monitor/memory
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| interval | number | 历史数据间隔(秒) | 60 |
| count | number | 返回的数据点数量 | 60 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "current": {
      "total": 17179869184,
      "used": 8589934592,
      "free": 8589934592,
      "cache": 2254857830,
      "buffers": 536870912,
      "usagePercent": 50
    },
    "history": [
      { "timestamp": 1657627456000, "usage": 48.5 },
      { "timestamp": 1657627516000, "usage": 50.0 },
      // 更多历史数据...
    ]
  }
}
```

#### 获取磁盘使用率

```
GET /api/monitor/disk
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "filesystems": [
      {
        "fs": "/dev/sda1",
        "type": "ext4",
        "size": 536870912000,
        "used": 268435456000,
        "available": 268435456000,
        "usedPercent": 50,
        "mountpoint": "/"
      },
      {
        "fs": "/dev/sdb1",
        "type": "ext4",
        "size": 1073741824000,
        "used": 214748364800,
        "available": 859032498688,
        "usedPercent": 20,
        "mountpoint": "/data"
      }
    ],
    "io": {
      "read_bytes": 1073741824,
      "write_bytes": 536870912,
      "reads": 1024,
      "writes": 512
    }
  }
}
```

#### 获取网络状态

```
GET /api/monitor/network
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| interval | number | 历史数据间隔(秒) | 60 |
| count | number | 返回的数据点数量 | 60 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "interfaces": [
      {
        "name": "eth0",
        "ip": "192.168.1.100",
        "mac": "00:11:22:33:44:55",
        "upload_speed": 1572864,
        "download_speed": 3355443,
        "connections": 45
      },
      {
        "name": "wlan0",
        "ip": "192.168.1.101",
        "mac": "AA:BB:CC:DD:EE:FF",
        "upload_speed": 524288,
        "download_speed": 1048576,
        "connections": 12
      }
    ],
    "history": [
      {
        "timestamp": 1657627456000,
        "upload": 1468006,
        "download": 3145728
      },
      {
        "timestamp": 1657627516000,
        "upload": 1572864,
        "download": 3355443
      },
      // 更多历史数据...
    ]
  }
}
```

#### 获取系统服务状态

```
GET /api/monitor/services
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "name": "nginx",
      "status": "active",
      "memory": 52428800,
      "cpu": 0.5,
      "uptime": 864000
    },
    {
      "name": "mysql",
      "status": "active",
      "memory": 536870912,
      "cpu": 1.2,
      "uptime": 691200
    },
    {
      "name": "docker",
      "status": "active",
      "memory": 268435456,
      "cpu": 0.8,
      "uptime": 777600
    },
    {
      "name": "ssh",
      "status": "active",
      "memory": 10485760,
      "cpu": 0.1,
      "uptime": 864000
    }
  ]
}
```

### 文件管理 API

#### 获取目录列表

```
GET /api/file/list
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 目录路径 | / |
| showHidden | boolean | 是否显示隐藏文件 | false |
| sort | string | 排序字段(name,size,mtime) | name |
| order | string | 排序方式(asc,desc) | asc |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "path": "/home/user",
    "files": [
      {
        "name": "documents",
        "type": "directory",
        "size": 0,
        "permissions": "rwxr-xr-x",
        "owner": "user",
        "group": "user",
        "modifiedTime": "2025-07-10T12:30:00Z",
        "isHidden": false
      },
      {
        "name": "example.txt",
        "type": "file",
        "size": 1024,
        "permissions": "rw-r--r--",
        "owner": "user",
        "group": "user",
        "modifiedTime": "2025-07-11T09:15:30Z",
        "isHidden": false
      },
      {
        "name": ".config",
        "type": "directory",
        "size": 0,
        "permissions": "rwxr-xr-x",
        "owner": "user",
        "group": "user",
        "modifiedTime": "2025-06-20T18:45:12Z",
        "isHidden": true
      }
    ],
    "parent": "/home"
  }
}
```

#### 创建目录

```
POST /api/file/mkdir
```

**请求参数：**

```json
{
  "path": "/home/user/new_folder"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "目录创建成功"
}
```

#### 创建文件

```
POST /api/file/touch
```

**请求参数：**

```json
{
  "path": "/home/user/new_file.txt"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "文件创建成功"
}
```

#### 删除文件/目录

```
DELETE /api/file/delete
```

**请求参数：**

```json
{
  "paths": ["/home/user/file1.txt", "/home/user/folder1"],
  "recursive": true
}
```

**响应：**

```json
{
  "code": 200,
  "message": "删除成功",
  "data": {
    "success": ["/home/user/file1.txt", "/home/user/folder1"],
    "failed": []
  }
}
```

#### 复制文件/目录

```
POST /api/file/copy
```

**请求参数：**

```json
{
  "source": "/home/user/source_file.txt",
  "destination": "/home/user/destination/source_file.txt",
  "overwrite": true
}
```

**响应：**

```json
{
  "code": 200,
  "message": "复制成功"
}
```

#### 移动/重命名文件/目录

```
POST /api/file/move
```

**请求参数：**

```json
{
  "source": "/home/user/old_name.txt",
  "destination": "/home/user/new_name.txt",
  "overwrite": false
}
```

**响应：**

```json
{
  "code": 200,
  "message": "移动/重命名成功"
}
```

#### 获取文件内容

```
GET /api/file/read
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 文件路径 | 必填 |
| offset | number | 起始位置(字节) | 0 |
| length | number | 读取长度(字节) | -1(全部) |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "path": "/home/user/example.txt",
    "content": "这是文件内容...",
    "encoding": "utf-8",
    "size": 1024,
    "offset": 0,
    "length": 1024
  }
}
```

#### 写入文件内容

```
PUT /api/file/write
```

**请求参数：**

```json
{
  "path": "/home/user/example.txt",
  "content": "新的文件内容...",
  "encoding": "utf-8",
  "append": false
}
```

**响应：**

```json
{
  "code": 200,
  "message": "文件写入成功",
  "data": {
    "bytesWritten": 1024
  }
}
```

#### 上传文件

```
POST /api/file/upload
```

**表单数据：**

| 字段名 | 类型 | 说明 |
|-------|------|------|
| file | File | 要上传的文件 |
| path | string | 上传目标路径 |
| overwrite | boolean | 是否覆盖已存在文件 |

**响应：**

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "filename": "uploaded_file.txt",
    "path": "/home/user/uploaded_file.txt",
    "size": 1024,
    "mimetype": "text/plain"
  }
}
```

#### 下载文件

```
GET /api/file/download
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 文件路径 | 必填 |

**响应：**

二进制文件流，带有适当的 Content-Type 和 Content-Disposition 头

#### 批量下载

```
POST /api/file/download-batch
```

**请求参数：**

```json
{
  "paths": [
    "/home/user/file1.txt",
    "/home/user/file2.txt"
  ],
  "filename": "archive.zip"
}
```

**响应：**

ZIP 文件二进制流

#### 获取文件属性

```
GET /api/file/stat
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 文件路径 | 必填 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "name": "example.txt",
    "path": "/home/user/example.txt",
    "size": 1024,
    "type": "file",
    "permissions": "rw-r--r--",
    "owner": "user",
    "group": "user",
    "modifiedTime": "2025-07-11T09:15:30Z",
    "accessTime": "2025-07-12T14:20:10Z",
    "createTime": "2025-07-10T15:30:45Z",
    "isHidden": false,
    "isSymlink": false,
    "mimetype": "text/plain"
  }
}
```

### 任务调度 API

#### 获取所有任务

```
GET /api/task/list
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| status | string | 任务状态(enabled,disabled,all) | all |
| page | number | 页码 | 1 |
| pageSize | number | 每页条数 | 20 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "total": 25,
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": "task-001",
        "name": "系统备份任务",
        "description": "每日凌晨备份重要数据",
        "command": "/home/scripts/backup.sh",
        "workdir": "/home/scripts",
        "schedule": {
          "type": "cron",
          "expression": "0 2 * * *"
        },
        "status": "enabled",
        "createdAt": "2025-06-15T10:20:30Z",
        "lastRun": "2025-07-12T02:00:00Z",
        "nextRun": "2025-07-13T02:00:00Z",
        "lastResult": {
          "exitCode": 0,
          "status": "success",
          "duration": 45
        }
      },
      // 更多任务...
    ]
  }
}
```

#### 获取单个任务详情

```
GET /api/task/:id
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "task-001",
    "name": "系统备份任务",
    "description": "每日凌晨备份重要数据",
    "command": "/home/scripts/backup.sh",
    "workdir": "/home/scripts",
    "schedule": {
      "type": "cron",
      "expression": "0 2 * * *"
    },
    "status": "enabled",
    "timeout": 3600,
    "retries": 3,
    "env": {
      "BACKUP_DIR": "/backups",
      "LOG_LEVEL": "info"
    },
    "createdAt": "2025-06-15T10:20:30Z",
    "updatedAt": "2025-07-10T16:45:12Z",
    "lastRun": "2025-07-12T02:00:00Z",
    "nextRun": "2025-07-13T02:00:00Z",
    "lastResult": {
      "exitCode": 0,
      "status": "success",
      "duration": 45,
      "output": "备份完成: 25 个文件, 总大小 1.2GB",
      "error": ""
    }
  }
}
```

#### 创建任务

```
POST /api/task
```

**请求参数：**

```json
{
  "name": "日志清理任务",
  "description": "定期清理过期日志文件",
  "command": "find /var/log -name \"*.log\" -mtime +30 -delete",
  "workdir": "/var/log",
  "schedule": {
    "type": "cron",
    "expression": "0 0 * * 0"
  },
  "timeout": 1800,
  "retries": 1,
  "env": {
    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  },
  "status": "enabled"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "任务创建成功",
  "data": {
    "id": "task-026"
  }
}
```

#### 更新任务

```
PUT /api/task/:id
```

**请求参数：**

```json
{
  "name": "修改后的任务名称",
  "description": "更新后的描述",
  "command": "find /var/log -name \"*.log\" -mtime +60 -delete",
  "schedule": {
    "type": "cron",
    "expression": "0 0 1 * *"
  }
}
```

**响应：**

```json
{
  "code": 200,
  "message": "任务更新成功"
}
```

#### 删除任务

```
DELETE /api/task/:id
```

**响应：**

```json
{
  "code": 200,
  "message": "任务删除成功"
}
```

#### 启用/禁用任务

```
PUT /api/task/:id/status
```

**请求参数：**

```json
{
  "status": "enabled" // 或 "disabled"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "任务状态已更新"
}
```

#### 手动执行任务

```
POST /api/task/:id/execute
```

**响应：**

```json
{
  "code": 200,
  "message": "任务已开始执行",
  "data": {
    "executionId": "exec-123456"
  }
}
```

#### 获取任务执行历史

```
GET /api/task/:id/history
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| page | number | 页码 | 1 |
| pageSize | number | 每页条数 | 20 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "total": 35,
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": "exec-123456",
        "taskId": "task-001",
        "startTime": "2025-07-12T02:00:00Z",
        "endTime": "2025-07-12T02:00:45Z",
        "status": "success",
        "exitCode": 0,
        "duration": 45,
        "output": "备份完成: 25 个文件, 总大小 1.2GB",
        "error": "",
        "triggeredBy": "schedule" // 或 "manual"
      },
      // 更多历史记录...
    ]
  }
}
```

#### 获取任务执行详情

```
GET /api/task/execution/:executionId
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "exec-123456",
    "taskId": "task-001",
    "taskName": "系统备份任务",
    "command": "/home/scripts/backup.sh",
    "startTime": "2025-07-12T02:00:00Z",
    "endTime": "2025-07-12T02:00:45Z",
    "status": "success", // success, failed, running, timeout, cancelled
    "exitCode": 0,
    "duration": 45,
    "output": "备份完成: 25 个文件, 总大小 1.2GB",
    "error": "",
    "triggeredBy": "schedule", // schedule, manual
    "triggeredByUser": null,
    "retryCount": 0
  }
}
```

### 日志管理 API

#### 获取日志文件列表

```
GET /api/logs/files
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 日志目录路径 | /var/log |
| pattern | string | 文件名匹配模式 | *.log |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "name": "syslog",
      "path": "/var/log/syslog",
      "size": 1048576,
      "modifiedTime": "2025-07-12T15:20:30Z"
    },
    {
      "name": "auth.log",
      "path": "/var/log/auth.log",
      "size": 524288,
      "modifiedTime": "2025-07-12T14:10:15Z"
    },
    // 更多日志文件...
  ]
}
```

#### 读取日志内容

```
GET /api/logs/read
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 日志文件路径 | 必填 |
| tail | number | 读取末尾行数 | 0 |
| head | number | 读取开头行数 | 0 |
| start | number | 起始行号 | 1 |
| limit | number | 最大行数 | 1000 |
| filter | string | 内容过滤关键词 | 无 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "path": "/var/log/syslog",
    "totalLines": 12543,
    "from": 12443,
    "to": 12543,
    "lines": [
      {
        "number": 12443,
        "content": "Jul 12 15:10:00 server-01 systemd[1]: Started Daily apt download activities."
      },
      {
        "number": 12444,
        "content": "Jul 12 15:15:01 server-01 CRON[12345]: (root) CMD (/usr/local/bin/backup.sh)"
      },
      // 更多日志行...
    ]
  }
}
```

#### 搜索日志内容

```
GET /api/logs/search
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 日志文件路径 | 必填 |
| query | string | 搜索关键词 | 必填 |
| caseSensitive | boolean | 区分大小写 | false |
| regexp | boolean | 使用正则表达式 | false |
| contextLines | number | 上下文行数 | 2 |
| limit | number | 最大结果数 | 1000 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "path": "/var/log/syslog",
    "totalMatches": 25,
    "matches": [
      {
        "lineNumber": 12444,
        "line": "Jul 12 15:15:01 server-01 CRON[12345]: (root) CMD (/usr/local/bin/backup.sh)",
        "context": [
          {
            "lineNumber": 12442,
            "line": "Jul 12 15:09:58 server-01 systemd[1]: Starting Daily apt download activities..."
          },
          {
            "lineNumber": 12443,
            "line": "Jul 12 15:10:00 server-01 systemd[1]: Started Daily apt download activities."
          },
          {
            "lineNumber": 12445,
            "line": "Jul 12 15:15:02 server-01 CRON[12345]: (root) DONE (/usr/local/bin/backup.sh)"
          },
          {
            "lineNumber": 12446,
            "line": "Jul 12 15:20:00 server-01 systemd[1]: Starting System Cleanup..."
          }
        ]
      },
      // 更多匹配结果...
    ]
  }
}
```

#### 下载日志文件

```
GET /api/logs/download
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| path | string | 日志文件路径 | 必填 |

**响应：**

二进制文件流，带有适当的 Content-Type 和 Content-Disposition 头

### 系统设置 API

#### 获取系统设置

```
GET /api/settings
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "server": {
      "hostname": "server-01",
      "port": 3000,
      "timezone": "Asia/Shanghai"
    },
    "security": {
      "jwtSecret": "[hidden]",
      "jwtExpiry": 3600,
      "allowedIPs": ["192.168.1.0/24"],
      "sessionTimeout": 1800,
      "maxLoginAttempts": 5,
      "lockoutTime": 900
    },
    "notifications": {
      "email": {
        "enabled": true,
        "smtpServer": "smtp.example.com",
        "smtpPort": 587,
        "smtpUser": "alerts@example.com",
        "recipients": ["admin@example.com"]
      },
      "webhooks": [
        {
          "name": "Slack Alerts",
          "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
          "events": ["system.alert", "task.failed"]
        }
      ]
    },
    "monitor": {
      "retention": 30,
      "interval": 60,
      "thresholds": {
        "cpu": {
          "warning": 70,
          "critical": 85
        },
        "memory": {
          "warning": 75,
          "critical": 90
        },
        "disk": {
          "warning": 80,
          "critical": 95
        },
        "network": {
          "warning": 100,
          "critical": 500
        }
      }
    },
    "backup": {
      "enabled": true,
      "schedule": "0 2 * * *",
      "retention": 7,
      "paths": [
        "/etc",
        "/home",
        "/var/www"
      ]
    }
  }
}
```

#### 更新系统设置

```
PUT /api/settings
```

**请求参数：**

```json
{
  "security": {
    "sessionTimeout": 3600,
    "maxLoginAttempts": 3
  },
  "monitor": {
    "interval": 30,
    "thresholds": {
      "cpu": {
        "warning": 60
      }
    }
  }
}
```

**响应：**

```json
{
  "code": 200,
  "message": "设置更新成功"
}
```

#### 重置系统设置

```
POST /api/settings/reset
```

**请求参数：**

```json
{
  "sections": ["monitor", "notifications"]
}
```

**响应：**

```json
{
  "code": 200,
  "message": "设置已重置"
}
```

### 用户管理 API

#### 获取用户列表

```
GET /api/users
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| page | number | 页码 | 1 |
| pageSize | number | 每页条数 | 20 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "total": 3,
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": "1",
        "username": "admin",
        "role": "admin",
        "email": "admin@example.com",
        "lastLogin": "2025-07-12T10:15:30Z",
        "status": "active",
        "createdAt": "2025-01-01T00:00:00Z"
      },
      {
        "id": "2",
        "username": "operator",
        "role": "operator",
        "email": "operator@example.com",
        "lastLogin": "2025-07-11T14:20:00Z",
        "status": "active",
        "createdAt": "2025-01-15T00:00:00Z"
      },
      {
        "id": "3",
        "username": "viewer",
        "role": "viewer",
        "email": "viewer@example.com",
        "lastLogin": "2025-07-10T09:45:15Z",
        "status": "active",
        "createdAt": "2025-02-10T00:00:00Z"
      }
    ]
  }
}
```

#### 获取单个用户

```
GET /api/users/:id
```

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "1",
    "username": "admin",
    "role": "admin",
    "email": "admin@example.com",
    "fullName": "管理员",
    "lastLogin": "2025-07-12T10:15:30Z",
    "lastLoginIp": "192.168.1.100",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-07-01T12:30:45Z",
    "permissions": ["*"],
    "settings": {
      "theme": "dark",
      "language": "zh-CN",
      "timezone": "Asia/Shanghai"
    }
  }
}
```

#### 创建用户

```
POST /api/users
```

**请求参数：**

```json
{
  "username": "newuser",
  "password": "securePassword123!",
  "role": "operator",
  "email": "newuser@example.com",
  "fullName": "新用户",
  "status": "active"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "用户创建成功",
  "data": {
    "id": "4"
  }
}
```

#### 更新用户

```
PUT /api/users/:id
```

**请求参数：**

```json
{
  "email": "updated@example.com",
  "fullName": "更新的名称",
  "role": "admin",
  "status": "active"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "用户更新成功"
}
```

#### 删除用户

```
DELETE /api/users/:id
```

**响应：**

```json
{
  "code": 200,
  "message": "用户删除成功"
}
```

#### 修改用户密码

```
PUT /api/users/:id/password
```

**请求参数：**

```json
{
  "password": "newSecurePassword456!"
}
```

**响应：**

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

#### 获取登录历史

```
GET /api/users/:id/login-history
```

**查询参数：**

| 参数名 | 类型 | 说明 | 默认值 |
|-------|------|------|-------|
| page | number | 页码 | 1 |
| pageSize | number | 每页条数 | 20 |

**响应：**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "total": 24,
    "page": 1,
    "pageSize": 20,
    "items": [
      {
        "id": "login-123",
        "userId": "1",
        "username": "admin",
        "ip": "192.168.1.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
        "status": "success",
        "time": "2025-07-12T10:15:30Z"
      },
      // 更多记录...
    ]
  }
}
```

## 🔌 WebSocket 接口

### WebSocket 连接

```
WebSocket 地址: ws(s)://{服务器地址}:{端口}/ws
```

身份验证需要在连接时提供 token 参数：

```
ws(s)://{服务器地址}:{端口}/ws?token={JWT_TOKEN}
```

### 消息格式

**客户端发送消息：**

```json
{
  "type": "command",
  "id": "msg-12345", // 客户端生成的唯一消息ID
  "action": "terminal.command",
  "data": {
    "command": "ls -la"
  }
}
```

**服务器响应消息：**

```json
{
  "type": "response",
  "id": "msg-12345", // 对应请求ID
  "action": "terminal.command",
  "status": "success",
  "data": {
    "output": "total 20\ndrwxr-xr-x  2 user user 4096 Jul 12 10:00 .\ndrwxr-xr-x 10 user user 4096 Jul 10 15:30 .."
  }
}
```

**服务器事件消息：**

```json
{
  "type": "event",
  "id": "evt-67890",
  "event": "monitor.alert",
  "data": {
    "level": "warning",
    "metric": "cpu",
    "value": 75.2,
    "threshold": 70,
    "message": "CPU 使用率超过警告阈值",
    "time": "2025-07-12T16:45:30Z"
  }
}
```

### WebSocket 接口列表

#### 实时监控数据

**订阅：**

```json
{
  "type": "command",
  "id": "sub-001",
  "action": "monitor.subscribe",
  "data": {
    "metrics": ["cpu", "memory", "disk", "network"],
    "interval": 5
  }
}
```

**数据推送：**

```json
{
  "type": "event",
  "id": "evt-monitor-12345",
  "event": "monitor.update",
  "data": {
    "timestamp": 1657630056000,
    "metrics": {
      "cpu": {
        "usage": 25.6,
        "load": [1.2, 1.5, 1.8]
      },
      "memory": {
        "total": 17179869184,
        "used": 8589934592,
        "free": 8589934592,
        "usagePercent": 50
      },
      "disk": {
        "read_bytes": 1048576,
        "write_bytes": 524288
      },
      "network": {
        "upload_speed": 1572864,
        "download_speed": 3355443
      }
    }
  }
}
```

#### 终端会话

**创建会话：**

```json
{
  "type": "command",
  "id": "term-001",
  "action": "terminal.create",
  "data": {
    "columns": 80,
    "rows": 24
  }
}
```

**执行命令：**

```json
{
  "type": "command",
  "id": "term-cmd-001",
  "action": "terminal.command",
  "data": {
    "sessionId": "sess-12345",
    "command": "ls -la"
  }
}
```

**调整终端大小：**

```json
{
  "type": "command",
  "id": "term-resize-001",
  "action": "terminal.resize",
  "data": {
    "sessionId": "sess-12345",
    "columns": 100,
    "rows": 30
  }
}
```

**终端输入：**

```json
{
  "type": "command",
  "id": "term-input-001",
  "action": "terminal.input",
  "data": {
    "sessionId": "sess-12345",
    "data": "echo hello\n"
  }
}
```

**终端输出：**

```json
{
  "type": "event",
  "id": "evt-term-output-001",
  "event": "terminal.output",
  "data": {
    "sessionId": "sess-12345",
    "data": "hello\n"
  }
}
```

#### 任务执行状态

**订阅任务更新：**

```json
{
  "type": "command",
  "id": "task-sub-001",
  "action": "task.subscribe",
  "data": {
    "taskIds": ["task-001", "task-002"]
  }
}
```

**任务状态更新：**

```json
{
  "type": "event",
  "id": "evt-task-001",
  "event": "task.update",
  "data": {
    "taskId": "task-001",
    "status": "running",
    "executionId": "exec-123456",
    "progress": 45,
    "startTime": "2025-07-12T16:30:00Z",
    "output": "正在处理文件 45/100..."
  }
}
```

**任务完成通知：**

```json
{
  "type": "event",
  "id": "evt-task-002",
  "event": "task.completed",
  "data": {
    "taskId": "task-001",
    "executionId": "exec-123456",
    "status": "success",
    "exitCode": 0,
    "startTime": "2025-07-12T16:30:00Z",
    "endTime": "2025-07-12T16:35:45Z",
    "duration": 345,
    "output": "处理完成: 100/100 文件",
    "error": ""
  }
}
```

#### 文件操作通知

**文件变更事件：**

```json
{
  "type": "event",
  "id": "evt-file-001",
  "event": "file.changed",
  "data": {
    "path": "/home/user/documents",
    "type": "created",
    "item": {
      "name": "new_file.txt",
      "type": "file",
      "size": 1024,
      "modifiedTime": "2025-07-12T16:40:15Z"
    }
  }
}
```

#### 系统警报

**系统警报事件：**

```json
{
  "type": "event",
  "id": "evt-alert-001",
  "event": "monitor.alert",
  "data": {
    "level": "critical",
    "source": "system",
    "metric": "disk",
    "value": 96.5,
    "threshold": 95,
    "message": "磁盘使用率超过危险阈值",
    "path": "/",
    "time": "2025-07-12T16:42:30Z"
  }
}
```

## 📊 状态码与错误处理

### HTTP 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 201 | 已创建 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 请求参数验证失败 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "name",
      "message": "名称不能为空"
    },
    {
      "field": "schedule.expression",
      "message": "无效的 Cron 表达式"
    }
  ]
}
```

### 常见错误代码

| 错误代码 | 说明 |
|---------|------|
| AUTH_INVALID_CREDENTIALS | 无效的用户名或密码 |
| AUTH_TOKEN_EXPIRED | 令牌已过期 |
| AUTH_INSUFFICIENT_PERMISSIONS | 权限不足 |
| VALIDATION_ERROR | 请求参数验证失败 |
| RESOURCE_NOT_FOUND | 资源不存在 |
| RESOURCE_ALREADY_EXISTS | 资源已存在 |
| SYSTEM_ERROR | 系统内部错误 |
| RATE_LIMIT_EXCEEDED | 超出请求频率限制 |

## 🚦 API 调用限制

为防止滥用，API 实施了请求频率限制：

| API 类型 | 限制 |
|---------|------|
| 认证 API | 10 请求/分钟/IP |
| 监控 API | 60 请求/分钟/用户 |
| 文件 API | 300 请求/分钟/用户 |
| 上传 API | 10 请求/分钟/用户 |
| 其他 API | 120 请求/分钟/用户 |

超出限制时，API 将返回 429 状态码。响应头部会包含：

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1625097346
```

## 🔧 SDK 示例

### JavaScript/TypeScript SDK

```typescript
// Linux Server Panel API 客户端
import axios from 'axios';

class LinuxServerPanelClient {
  private baseUrl: string;
  private token: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  // 认证方法
  async login(username: string, password: string) {
    const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
      username,
      password
    });
    
    if (response.data.code === 200) {
      this.token = response.data.data.token;
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      return response.data.data;
    } else {
      throw new Error(response.data.message);
    }
  }
  
  // 系统信息方法
  async getSystemInfo() {
    if (!this.token) {
      throw new Error('未认证，请先登录');
    }
    
    const response = await axios.get(`${this.baseUrl}/api/system/info`);
    return response.data.data;
  }
  
  // 文件管理方法
  async listFiles(path = '/', showHidden = false) {
    const response = await axios.get(`${this.baseUrl}/api/file/list`, {
      params: { path, showHidden }
    });
    return response.data.data;
  }
  
  // WebSocket 连接
  createWebSocketConnection() {
    if (!this.token) {
      throw new Error('未认证，请先登录');
    }
    
    const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/ws?token=${this.token}`);
    
    ws.onopen = () => {
      console.log('WebSocket 连接已建立');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('收到消息:', message);
    };
    
    ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
    };
    
    return ws;
  }
}

// 使用示例
const client = new LinuxServerPanelClient('https://your-server.com');

async function demo() {
  try {
    await client.login('admin', 'password');
    const systemInfo = await client.getSystemInfo();
    console.log('系统信息:', systemInfo);
    
    const files = await client.listFiles('/home/user');
    console.log('文件列表:', files);
    
    const ws = client.createWebSocketConnection();
    
    ws.onopen = () => {
      // 订阅实时监控数据
      ws.send(JSON.stringify({
        type: 'command',
        id: 'sub-001',
        action: 'monitor.subscribe',
        data: {
          metrics: ['cpu', 'memory'],
          interval: 5
        }
      }));
    };
    
  } catch (error) {
    console.error('错误:', error.message);
  }
}

demo();
```

### Python SDK

```python
import requests
import json
import websocket
import threading

class LinuxServerPanelClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.headers = {
            'Content-Type': 'application/json'
        }
    
    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={
                'username': username,
                'password': password
            }
        )
        
        data = response.json()
        if data['code'] == 200:
            self.token = data['data']['token']
            self.headers['Authorization'] = f"Bearer {self.token}"
            return data['data']
        else:
            raise Exception(data['message'])
    
    def get_system_info(self):
        if not self.token:
            raise Exception("未认证，请先登录")
        
        response = requests.get(
            f"{self.base_url}/api/system/info",
            headers=self.headers
        )
        
        data = response.json()
        return data['data']
    
    def list_files(self, path='/', show_hidden=False):
        if not self.token:
            raise Exception("未认证，请先登录")
        
        response = requests.get(
            f"{self.base_url}/api/file/list",
            params={'path': path, 'showHidden': show_hidden},
            headers=self.headers
        )
        
        data = response.json()
        return data['data']
    
    def create_websocket_connection(self, on_message=None, on_error=None, on_close=None):
        if not self.token:
            raise Exception("未认证，请先登录")
        
        ws_url = f"{self.base_url.replace('http', 'ws')}/ws?token={self.token}"
        
        def on_open(ws):
            print("WebSocket 连接已建立")
        
        ws = websocket.WebSocketApp(
            ws_url,
            on_open=on_open,
            on_message=on_message or (lambda ws, msg: print(f"收到消息: {msg}")),
            on_error=on_error or (lambda ws, err: print(f"错误: {err}")),
            on_close=on_close or (lambda ws, close_status_code, close_msg: print("WebSocket 连接已关闭"))
        )
        
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()
        
        return ws

# 使用示例
def demo():
    client = LinuxServerPanelClient("https://your-server.com")
    
    try:
        client.login("admin", "password")
        system_info = client.get_system_info()
        print("系统信息:", system_info)
        
        files = client.list_files("/home/user")
        print("文件列表:", files)
        
        def on_message(ws, message):
            data = json.loads(message)
            if data['type'] == 'event' and data['event'] == 'monitor.update':
                print(f"CPU 使用率: {data['data']['metrics']['cpu']['usage']}%")
                print(f"内存使用率: {data['data']['metrics']['memory']['usagePercent']}%")
        
        ws = client.create_websocket_connection(on_message=on_message)
        
        # 订阅实时监控数据
        ws.send(json.dumps({
            'type': 'command',
            'id': 'sub-001',
            'action': 'monitor.subscribe',
            'data': {
                'metrics': ['cpu', 'memory'],
                'interval': 5
            }
        }))
        
        # 保持程序运行以接收 WebSocket 消息
        input("按 Enter 键退出...\n")
        
    except Exception as e:
        print("错误:", str(e))

if __name__ == "__main__":
    demo()
```

---

本文档提供了 Linux Server Panel 所有 API 和 WebSocket 接口的完整参考。开发者可以利用这些接口进行系统集成或开发自定义功能。如有任何问题或需要进一步帮助，请联系技术支持。
