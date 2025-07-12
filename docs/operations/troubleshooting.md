# 故障排除指南

本指南提供 Linux Server Panel 常见问题的诊断和解决方案。

## 🔍 快速诊断

### 系统健康检查
在开始故障排除之前，建议先执行系统健康检查：

```bash
# 检查服务状态
curl -k https://localhost:3000/health

# 检查进程状态
ps aux | grep node

# 检查端口占用
netstat -tlnp | grep -E ":(3000|3001|443)"

# 检查系统资源
df -h
free -h
top
```

### 日志查看
```bash
# 应用日志
tail -f server/logs/error.log
tail -f server/logs/webSocket.log

# 系统日志
journalctl -f -u your-service
dmesg | tail

# Nginx 日志 (如使用)
tail -f /var/log/nginx/error.log
```

## 🚨 启动问题

### 1. 服务无法启动

#### 问题症状
- 执行 `npm start` 或 `npm run dev` 无响应
- 浏览器无法访问应用
- 控制台显示错误信息

#### 常见原因及解决方案

**Node.js 版本问题**
```bash
# 检查 Node.js 版本
node --version

# 版本要求: 18.0.0 或更高
# 更新 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**端口被占用**
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 终止占用进程
kill -9 <PID>

# 或者修改配置文件中的端口
vim server/config.json
```

**依赖缺失**
```bash
# 重新安装依赖
cd server && rm -rf node_modules package-lock.json
npm install

cd panel && rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**权限问题**
```bash
# 检查文件权限
ls -la server/
ls -la server/*.pem

# 修改权限
chmod +x server/index.js
chmod 600 server/key.pem server/cert.pem
```

### 2. SSL 证书问题

#### 问题症状
- HTTPS 连接失败
- 浏览器显示证书错误
- WebSocket 连接被拒绝

#### 解决方案
```bash
# 重新生成自签名证书
cd server
rm -f key.pem cert.pem
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# 检查证书有效性
openssl x509 -in cert.pem -text -noout

# 配置浏览器信任证书 (开发环境)
# Chrome: 访问 chrome://flags/#allow-insecure-localhost 启用
```

### 3. 数据库连接问题

#### 问题症状
- 用户登录失败
- 数据保存失败
- JSON 文件读写错误

#### 解决方案
```bash
# 检查数据目录权限
ls -la server/data/
chmod -R 755 server/data/

# 检查 JSON 文件格式
cat server/data/users.json | jq .

# 修复损坏的 JSON 文件
cp server/data/users.json server/data/users.json.backup
echo "[]" > server/data/users.json
```

## 🌐 网络连接问题

### 1. WebSocket 连接失败

#### 问题症状
- 仪表盘显示"连接断开"
- 终端无法连接
- 实时监控数据不更新

#### 诊断步骤
```javascript
// 在浏览器控制台执行
// 测试 WebSocket 连接
const ws = new WebSocket('wss://localhost:3001')
ws.onopen = () => console.log('WebSocket 连接成功')
ws.onerror = (error) => console.error('WebSocket 错误:', error)
ws.onclose = (event) => console.log('WebSocket 关闭:', event.code, event.reason)
```

#### 解决方案
```bash
# 检查 WebSocket 服务状态
netstat -tlnp | grep :3001

# 检查防火墙设置
sudo ufw status
sudo ufw allow 3001

# 检查 Nginx 配置 (如使用代理)
nginx -t
sudo systemctl reload nginx
```

### 2. API 请求失败

#### 问题症状
- 登录失败，显示网络错误
- 文件操作无响应
- 页面显示"请求失败"

#### 解决方案
```bash
# 测试 API 连接
curl -k https://localhost:3000/health
curl -k -X POST https://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 检查 CORS 配置
# 在 server/src/app.js 中确认 CORS 设置
```

### 3. 跨域问题

#### 问题症状
- 浏览器控制台显示 CORS 错误
- API 请求被阻止
- 开发环境正常，生产环境异常

#### 解决方案
```javascript
// server/src/app.js
app.use(cors({
  origin: ['https://localhost', 'https://your-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

## 💾 数据问题

### 1. 数据丢失

#### 问题症状
- 用户设置重置
- 任务列表清空
- 配置文件恢复默认

#### 应急恢复
```bash
# 检查备份文件
ls -la server/data/*.backup

# 恢复备份数据
cp server/data/users.json.backup server/data/users.json
cp server/data/tasks.json.backup server/data/tasks.json

# 重启服务
npm restart
```

### 2. 数据同步问题

#### 问题症状
- 前后端数据不一致
- 刷新页面后数据恢复
- 多用户数据冲突

#### 解决方案
```javascript
// 强制刷新本地缓存
localStorage.clear()
sessionStorage.clear()

// 清除浏览器缓存
// Ctrl + Shift + Delete (Chrome)
// 或在开发者工具中 Network -> Disable cache
```

## 🖥️ 性能问题

### 1. 页面加载缓慢

#### 诊断工具
```bash
# 检查系统资源
htop
iotop
nethogs

# 检查 Node.js 进程
ps aux | grep node
pmap -x $(pidof node)
```

#### 优化方案
```javascript
// 启用 Gzip 压缩
app.use(compression())

// 静态文件缓存
app.use(express.static('dist', {
  maxAge: '1d',
  etag: true
}))

// 数据库查询优化
const users = await UserDAO.findMany({ 
  limit: 100,
  fields: ['id', 'username', 'lastLogin']
})
```

### 2. 内存使用过高

#### 问题症状
- 系统响应缓慢
- Node.js 进程占用内存过多
- 出现内存溢出错误

#### 解决方案
```bash
# 设置 Node.js 内存限制
node --max-old-space-size=1024 server/index.js

# 使用 PM2 管理进程
pm2 start server/index.js --max-memory-restart 1G

# 清理日志文件
find server/logs/ -name "*.log" -mtime +7 -delete
```

### 3. 磁盘空间不足

#### 清理策略
```bash
# 清理日志文件
sudo journalctl --vacuum-time=7d
rm -f server/logs/*.log.*

# 清理临时文件
rm -rf /tmp/*
rm -rf server/uploads/temp/*

# 清理 Docker (如使用)
docker system prune -a
```

## 🔐 认证问题

### 1. 登录失败

#### 问题症状
- 用户名密码正确但无法登录
- Token 验证失败
- 登录后立即跳转到登录页

#### 解决方案
```bash
# 重置管理员密码
cd server
node -e "
const bcrypt = require('bcryptjs');
const fs = require('fs');
const users = JSON.parse(fs.readFileSync('data/users.json'));
users[0].password = bcrypt.hashSync('newpassword', 10);
fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
console.log('Password reset to: newpassword');
"
```

### 2. Token 过期

#### 问题症状
- 操作一段时间后需要重新登录
- API 返回 401 错误
- 页面自动跳转到登录页

#### 解决方案
```javascript
// 调整 Token 有效期
// server/src/middleware/auth.js
const token = jwt.sign(
  { userId: user.id, username: user.username },
  JWT_SECRET,
  { expiresIn: '24h' } // 延长到 24 小时
)

// 前端自动刷新 Token
// utils/axios.ts
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // 尝试刷新 Token
      const refreshed = await refreshToken()
      if (refreshed) {
        return axios.request(error.config)
      }
    }
    return Promise.reject(error)
  }
)
```

## 🔧 配置问题

### 1. 环境变量问题

#### 问题症状
- 配置不生效
- 默认值被使用
- 环境特定功能异常

#### 解决方案
```bash
# 检查环境变量
printenv | grep NODE
echo $NODE_ENV

# 设置环境变量
export NODE_ENV=production
export LOG_LEVEL=info

# 永久设置
echo "export NODE_ENV=production" >> ~/.bashrc
source ~/.bashrc
```

### 2. 配置文件问题

#### 配置验证
```bash
# 验证 JSON 格式
cat server/config.json | jq .

# 检查配置项
node -e "console.log(require('./server/config.json'))"
```

#### 配置模板
```json
{
  "adminDefaultPassword": "secure-password-123",
  "port": 3000,
  "wsPort": 3001,
  "staticPort": 443,
  "protocol": "https",
  "jwt": {
    "secret": "your-jwt-secret-key",
    "expiresIn": "24h"
  },
  "upload": {
    "maxFileSize": 104857600,
    "allowedTypes": ["image/*", "text/*", "application/json"]
  }
}
```

## 🖥️ 系统兼容性问题

### 1. Windows 环境问题

#### 问题症状
- 路径分隔符错误
- 权限设置失败
- 脚本执行失败

#### 解决方案
```javascript
// 使用 path 模块处理路径
const path = require('path')
const filePath = path.join(basePath, fileName)

// Windows 权限处理
if (process.platform === 'win32') {
  // Windows 特殊处理
  const { exec } = require('child_process')
  exec(`icacls "${filePath}" /grant Users:F`)
}
```

### 2. 浏览器兼容性

#### 支持的浏览器版本
- Chrome 80+
- Firefox 74+
- Safari 13+
- Edge 80+

#### 兼容性检查
```javascript
// 检测浏览器支持
const checkBrowserSupport = () => {
  const features = {
    websocket: 'WebSocket' in window,
    es6: typeof Symbol !== 'undefined',
    fetch: 'fetch' in window,
    promises: 'Promise' in window
  }
  
  const unsupported = Object.entries(features)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature)
  
  if (unsupported.length > 0) {
    alert(`您的浏览器不支持以下功能: ${unsupported.join(', ')}`)
  }
}
```

## 📱 移动端问题

### 1. 触摸操作问题

#### 解决方案
```css
/* 改善触摸体验 */
.touch-friendly {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* 增加点击区域 */
.button-mobile {
  min-height: 44px;
  min-width: 44px;
}
```

### 2. 响应式布局问题

#### 调试工具
```javascript
// 在控制台执行
console.log('Screen size:', window.screen.width, 'x', window.screen.height)
console.log('Viewport size:', window.innerWidth, 'x', window.innerHeight)
console.log('Device pixel ratio:', window.devicePixelRatio)
```

## 🔧 开发工具

### 1. 调试模式启用

```bash
# 启用详细日志
export DEBUG=*
export LOG_LEVEL=debug

# 启动开发模式
npm run dev -- --debug
```

### 2. 性能分析

```javascript
// 前端性能监控
console.time('page-load')
window.addEventListener('load', () => {
  console.timeEnd('page-load')
  console.log('Performance:', performance.getEntriesByType('navigation')[0])
})

// 后端性能监控
const startTime = Date.now()
// ... 执行操作
const duration = Date.now() - startTime
console.log(`Operation took ${duration}ms`)
```

## 📞 获取帮助

### 1. 收集诊断信息

在寻求帮助前，请收集以下信息：

```bash
# 创建诊断报告
cat > diagnostic-report.txt << EOF
=== System Information ===
OS: $(uname -a)
Node.js: $(node --version)
NPM: $(npm --version)
Memory: $(free -h)
Disk: $(df -h)

=== Application Status ===
Processes: $(ps aux | grep node)
Ports: $(netstat -tlnp | grep -E ":(3000|3001|443)")

=== Error Logs ===
$(tail -50 server/logs/error.log)

=== Configuration ===
$(cat server/config.json)
EOF
```

### 2. 联系方式

- **GitHub Issues**: [提交问题报告](https://github.com/your-repo/linux-server-panel/issues)
- **讨论区**: [社区讨论](https://github.com/your-repo/linux-server-panel/discussions)
- **邮件支持**: support@example.com

### 3. 社区资源

- **文档**: [在线文档](https://docs.example.com)
- **FAQ**: [常见问题](https://faq.example.com)
- **教程**: [视频教程](https://tutorials.example.com)

---

**提示**: 在生产环境中遇到问题时，请优先检查日志文件，它们通常包含解决问题的关键信息。
