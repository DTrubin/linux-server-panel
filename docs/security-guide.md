# 安全指南

本指南概述了 Linux Server Panel 的安全功能和推荐的安全最佳实践，帮助管理员维护系统安全。

## 📚 目录

1. [系统安全基础](#系统安全基础)
2. [身份验证与授权](#身份验证与授权)
3. [数据安全](#数据安全)
4. [通信安全](#通信安全)
5. [安全监控与审计](#安全监控与审计)
6. [安全更新与维护](#安全更新与维护)
7. [安全强化指南](#安全强化指南)

## 🔐 系统安全基础

### 安全架构

Linux Server Panel 采用分层安全架构：

```
+------------------------------------+
|            用户界面层              |
| (身份验证, 授权检查, 输入验证)     |
+------------------------------------+
|            业务逻辑层              |
| (权限检查, 数据校验, 业务规则)     |
+------------------------------------+
|            数据存储层              |
| (数据加密, 访问控制, 备份机制)     |
+------------------------------------+
|            系统底层                |
| (操作系统安全, 依赖项安全)         |
+------------------------------------+
```

### 安全原则

**1. 最小权限原则**
- 用户仅被授予执行任务所需的最低权限
- 默认使用非特权用户运行服务
- 严格限制 root 访问权限

**2. 深度防御**
- 实施多层安全控制
- 每层独立提供安全保障
- 单层失效不会导致整个系统安全崩溃

**3. 安全默认配置**
- 所有功能默认采用安全设置
- 不安全功能需要显式启用
- 初始安装后无需额外配置即可保持基本安全

**4. 数据保护**
- 敏感数据加密存储
- 传输中数据加密
- 适当的数据备份与恢复机制

## 🔑 身份验证与授权

### 身份验证机制

#### 密码身份验证
- 强密码策略强制执行
  - 最小长度：8 字符
  - 复杂性要求：大小写字母、数字和特殊字符
  - 历史检查：防止重复使用最近 5 个密码
- 密码存储采用 bcrypt 算法加密
- 登录失败处理：
  - 连续 5 次失败后账户锁定 15 分钟
  - 异常登录通知机制

#### JWT 身份验证
- 基于 JWT (JSON Web Token) 的认证
- 令牌结构：
  ```
  Header: {
    "alg": "HS256",
    "typ": "JWT"
  }
  
  Payload: {
    "sub": "用户ID",
    "name": "用户名",
    "role": "用户角色",
    "iat": 令牌签发时间,
    "exp": 令牌过期时间
  }
  
  签名: HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
  ```
- 令牌有效期：默认 60 分钟
- 自动刷新机制：令牌过期前 10 分钟

#### 双因素认证 (计划功能)
- 支持基于 TOTP 的二次验证
- 兼容 Google Authenticator、Microsoft Authenticator 等
- 备用恢复码机制

### 授权控制

#### 基于角色的访问控制 (RBAC)
- 预定义角色：
  - `admin`: 系统管理员，拥有全部权限
  - `operator`: 操作员，有大部分管理权限但不能修改系统关键设置
  - `viewer`: 只读用户，只能查看但不能修改系统
  - `custom`: 自定义角色，可按需配置权限

- 权限粒度控制：
  ```javascript
  // 权限示例
  permissions = {
    // 文件管理权限
    "file:read": "查看文件",
    "file:write": "修改文件",
    "file:delete": "删除文件",
    
    // 任务权限
    "task:read": "查看任务",
    "task:create": "创建任务",
    "task:execute": "执行任务",
    "task:delete": "删除任务",
    
    // 终端权限
    "terminal:access": "访问终端",
    "terminal:sudo": "使用 sudo 命令",
    
    // 系统设置权限
    "settings:read": "查看设置",
    "settings:modify": "修改设置"
  }
  ```

#### 权限检查机制
- API 级权限验证
- 前端权限控制（隐藏未授权功能）
- 后端强制权限检查
- 权限变更审计日志

## 🔒 数据安全

### 数据存储安全

#### 敏感数据加密
敏感数据（如用户密码、API 密钥）在存储前加密：

```javascript
// 密码哈希示例
const bcrypt = require('bcrypt');
const saltRounds = 12;

async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('密码加密失败:', error);
    throw error;
  }
}
```

#### 数据分类
- **公开数据**: 无需特殊保护
- **内部数据**: 需基本保护
- **敏感数据**: 需加密和访问控制
- **高度敏感数据**: 需强加密和严格访问控制

#### 数据隔离
- 不同用户数据逻辑隔离
- 敏感配置与代码分离
- 临时文件安全处理

### 数据备份与恢复

#### 备份策略
- 自动定时备份
- 增量和全量备份结合
- 备份加密存储
- 异地备份（推荐）

#### 备份内容
- 用户数据
- 配置文件
- 系统日志
- 自定义脚本

#### 恢复流程
1. 验证备份完整性
2. 停止相关服务
3. 恢复数据文件
4. 验证数据一致性
5. 重启服务和验证功能

## 🔐 通信安全

### HTTPS 配置

#### SSL/TLS 设置
- 最低支持 TLS 1.2
- 推荐配置为 TLS 1.3
- 强加密套件支持
- HSTS 启用

#### 证书管理
- 自动证书续期
- 证书有效性监控
- 支持商业和 Let's Encrypt 证书

#### HTTPS 示例配置

```nginx
# Nginx HTTPS 配置示例
server {
    listen 443 ssl http2;
    server_name your-panel-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 现代兼容性
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS (1 年，包括子域名)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 其他安全头部
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # 其余配置...
}
```

### WebSocket 安全

#### WSS (WebSocket Secure)
- 强制使用 WSS 而非 WS
- 与 HTTPS 共享相同证书
- 保持长连接活跃检查

#### 认证与授权
- 连接时 JWT 验证
- 定期令牌验证
- 连接限制和速率控制

## 📊 安全监控与审计

### 安全日志

#### 日志内容
记录以下安全相关事件：
- 所有用户认证尝试（成功/失败）
- 权限变更
- 敏感操作（文件删除、配置修改等）
- 系统错误和异常
- 资源访问

#### 日志格式
```
{
  "timestamp": "2025-07-12T08:45:32.123Z",
  "level": "INFO",
  "event": "USER_LOGIN",
  "status": "SUCCESS",
  "user": "admin",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "method": "password",
    "2fa": false
  }
}
```

#### 日志保护
- 日志不记录敏感数据（密码等）
- 日志文件权限控制
- 日志轮转和归档
- 考虑使用集中式日志系统

### 行为审计

#### 审计范围
- 用户活动审计
- 系统变更审计
- 异常行为检测
- 合规性验证

#### 审计报告
- 定期生成安全审计报告
- 异常行为自动通知
- 趋势分析和安全建议

## 🔄 安全更新与维护

### 依赖项管理

#### 定期更新
- 框架和库的定期更新
- 系统组件安全补丁
- 依赖项漏洞扫描

#### 版本控制
```bash
# 检查过期或有漏洞的依赖项
npm audit
npm outdated

# 更新依赖到安全版本
npm update
npm audit fix
```

### 安全测试

#### 自动化安全测试
- 静态代码分析
- 漏洞扫描
- 依赖项检查
- 渗透测试（推荐）

#### 测试类型
- 身份验证和授权测试
- 输入验证测试
- API 安全测试
- 会话管理测试
- 数据保护测试

## 🛡️ 安全强化指南

### 系统强化

#### 操作系统级别
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 检查开放端口
sudo netstat -tulpn

# 配置防火墙
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow https
sudo ufw allow http
sudo ufw status

# 禁用不必要服务
sudo systemctl disable <不必要的服务>
sudo systemctl stop <不必要的服务>

# 设置安全限制
sudo vim /etc/security/limits.conf
```

#### Web 服务器强化
```bash
# Nginx 安全配置
sudo vim /etc/nginx/nginx.conf

# 添加安全头部
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";

# 禁用不安全HTTP方法
if ($request_method !~ ^(GET|POST|PUT|DELETE)$) {
    return 405;
}
```

### 应用程序强化

#### 防止常见攻击
- **XSS 防护**:
  - 输入验证和输出编码
  - CSP 策略实施
  - XSS-Protection 头部

- **CSRF 防护**:
  - 使用 CSRF 令牌
  - SameSite Cookie 属性
  - 检查来源头部

- **注入防护**:
  - 参数化查询
  - 输入验证
  - 最小权限执行

- **安全配置**:
  - 移除调试信息
  - 禁用错误堆栈跟踪
  - 隐藏服务器信息

#### 代码示例

```javascript
// XSS 防护 - 输出编码
const escapeHTML = (str) => {
  return str.replace(/[&<>"']/g, (match) => {
    const replacement = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return replacement[match];
  });
};

// CSRF 防护 - 令牌生成
const crypto = require('crypto');
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 参数化查询示例
const getUser = async (id) => {
  // 错误方式 (容易受到 SQL 注入):
  // const query = `SELECT * FROM users WHERE id = ${id}`;
  
  // 正确方式 (参数化):
  const query = 'SELECT * FROM users WHERE id = ?';
  const [rows] = await db.execute(query, [id]);
  return rows[0];
};
```

### 部署安全

#### 安全部署流程
1. 构建前代码审查
2. 自动化安全测试
3. 构建环境隔离
4. 签名和验证制品
5. 安全配置检查
6. 蓝绿部署或金丝雀发布

#### 环境隔离
```
+------------+      +--------------+     +------------+
| 开发环境   | ---> | 测试/QA环境   | --> | 生产环境   |
+------------+      +--------------+     +------------+
    完全隔离             受限制              高度安全
    测试数据           模拟生产数据          真实数据
```

### 安全响应计划

#### 事件响应流程
1. **准备**: 制定安全策略和响应计划
2. **检测**: 识别并确认安全事件
3. **遏制**: 限制损害范围
4. **消除**: 移除威胁源
5. **恢复**: 恢复正常运行
6. **总结**: 记录经验教训并更新策略

#### 事件分类
- **低**: 无敏感数据暴露，系统可正常运行
- **中**: 有限的数据暴露，系统部分影响
- **高**: 敏感数据暴露，系统严重受损
- **严重**: 大规模数据泄露，系统完全瘫痪

## 📝 安全检查清单

### 定期安全审核

使用以下检查清单定期审核系统安全：

#### 身份验证与授权
- [ ] 密码策略符合最新安全标准
- [ ] 定期审查用户账户和权限
- [ ] 检查是否存在未授权访问记录
- [ ] 验证双因素认证有效性

#### 系统配置
- [ ] 检查不必要的开放端口
- [ ] 审查服务器防火墙规则
- [ ] 确认系统和依赖项已更新至最新安全版本
- [ ] 验证备份流程和恢复能力

#### 代码和应用
- [ ] 运行依赖项安全扫描
- [ ] 检查 API 端点的安全性
- [ ] 验证 HTTPS 配置和证书有效性
- [ ] 审查安全日志中的异常模式

#### 数据安全
- [ ] 确认敏感数据加密存储
- [ ] 验证数据访问控制
- [ ] 检查数据备份加密
- [ ] 审查第三方数据访问

---

本安全指南旨在帮助管理员维护 Linux Server Panel 的安全性。请定期查看最新的安全最佳实践，并根据您的特定环境需求调整安全措施。
