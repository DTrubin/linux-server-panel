# 安装指南

本指南将指导您完成 Linux Server Panel 的安装和基础配置。

## 📋 系统要求

### 硬件要求
- **CPU**: 1 核心以上
- **内存**: 1GB RAM 以上
- **存储**: 2GB 可用磁盘空间
- **网络**: 稳定的网络连接

### 软件要求
- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+, Debian 9+) 或 Windows 10+
- **Node.js**: 18.0.0 或更高版本
- **包管理器**: npm 或 pnpm
- **浏览器**: Chrome 80+, Firefox 74+, Safari 13+

## 🚀 安装步骤

### 1. 安装 Node.js

#### Ubuntu/Debian
```bash
# 更新包列表
sudo apt update

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### CentOS/RHEL
```bash
# 安装 Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

#### Windows
1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本安装包
3. 运行安装程序，按提示完成安装
4. 打开命令提示符验证：`node --version`

### 2. 安装 pnpm (推荐)

```bash
# 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### 3. 下载项目

#### 方式一：Git 克隆
```bash
# 克隆仓库
git clone https://github.com/your-repo/linux-server-panel.git
cd linux-server-panel
```

#### 方式二：下载压缩包
1. 访问项目 GitHub 页面
2. 点击 "Code" -> "Download ZIP"
3. 解压到目标目录

### 4. 安装依赖

```bash
# 安装前端依赖
cd panel
pnpm install

# 安装后端依赖
cd ../server
npm install
```

## ⚙️ 配置设置

### 1. 后端配置

复制并编辑配置文件：
```bash
cd server
cp config.json.example config.json
```

编辑 `config.json`：
```json
{
  "adminDefaultPassword": "your-secure-password",
  "port": 3000,
  "wsPort": 3001,
  "staticPort": 443,
  "protocol": "https"
}
```

**配置说明**：
- `adminDefaultPassword`: 默认管理员密码（建议修改）
- `port`: API 服务端口
- `wsPort`: WebSocket 端口
- `staticPort`: 静态文件服务端口
- `protocol`: 协议类型 (http/https)

### 2. SSL 证书配置（推荐）

#### 生成自签名证书（开发环境）
```bash
cd server
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### 使用 Let's Encrypt（生产环境）
```bash
# 安装 certbot
sudo apt install certbot

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 复制证书
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem server/key.pem
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem server/cert.pem
```

### 3. 前端配置

编辑 `panel/public/config.js`：
```javascript
window.APP_CONFIG = {
  API_BASE_URL: 'https://localhost:3000/api',
  WS_BASE_URL: 'wss://localhost:3001',
  APP_TITLE: 'Linux Server Panel',
  // 其他配置...
}
```

## 🔧 环境变量

创建 `.env` 文件（可选）：
```bash
# 服务器环境
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# 数据库配置（如使用外部数据库）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=server_panel
DB_USER=admin
DB_PASS=password

# 安全配置
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret
```

## 🏃 启动服务

### 开发模式
```bash
# 启动后端服务
cd server
npm run dev

# 新终端启动前端服务
cd panel
pnpm dev
```

### 生产模式
```bash
# 构建前端
cd panel
pnpm build

# 启动后端服务
cd ../server
npm start
```

## 🌐 访问应用

### 开发环境
- 前端开发服务器: http://localhost:5173
- 后端 API 服务器: http://localhost:3000
- WebSocket 服务: ws://localhost:3001

### 生产环境
- 应用访问地址: https://localhost 或 https://your-domain.com
- 默认登录信息:
  - 用户名: `admin`
  - 密码: 配置文件中设置的 `adminDefaultPassword`

## ✅ 安装验证

### 1. 检查服务状态
```bash
# 检查进程
ps aux | grep node

# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
```

### 2. 测试 API 接口
```bash
# 健康检查
curl -k https://localhost:3000/health

# 预期响应：
# {
#   "status": "ok",
#   "timestamp": "2025-07-12T...",
#   "uptime": 123.45
# }
```

### 3. 浏览器访问测试
1. 打开浏览器访问应用地址
2. 应该看到登录页面
3. 使用默认管理员账户登录
4. 验证各功能模块正常加载

## 🔧 故障排除

### 常见问题

#### 1. 端口占用错误
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3001

# 终止进程
kill -9 <PID>
```

#### 2. 权限错误
```bash
# 给予执行权限
chmod +x server/index.js

# 使用 sudo 运行（如需要）
sudo npm start
```

#### 3. 依赖安装失败
```bash
# 清除缓存
npm cache clean --force
pnpm store prune

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 4. SSL 证书错误
```bash
# 检查证书文件权限
ls -la server/*.pem

# 重新生成证书
rm server/key.pem server/cert.pem
openssl req -x509 -newkey rsa:4096 -keyout server/key.pem -out server/cert.pem -days 365 -nodes
```

### 日志查看
```bash
# 应用日志
tail -f server/logs/error.log
tail -f server/logs/webSocket.log

# 系统日志
journalctl -f
```

## 📊 性能优化

### 1. 生产环境优化
```bash
# 使用 PM2 管理进程
npm install -g pm2
pm2 start server/index.js --name "server-panel"
pm2 startup
pm2 save
```

### 2. Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass https://localhost:443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass https://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass https://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔐 安全建议

1. **修改默认密码**: 首次登录后立即修改管理员密码
2. **启用 HTTPS**: 生产环境必须使用 HTTPS
3. **防火墙配置**: 只开放必要端口
4. **定期更新**: 保持依赖包和系统更新
5. **备份数据**: 定期备份配置和数据文件

## 📞 获取帮助

如果在安装过程中遇到问题：

1. 查看 [故障排除文档](operations/troubleshooting.md)
2. 搜索 [GitHub Issues](https://github.com/your-repo/linux-server-panel/issues)
3. 提交新的 Issue 寻求帮助
4. 加入社区讨论群

---

**恭喜！** 您已成功安装 Linux Server Panel。接下来可以阅读 [快速上手指南](quick-start.md) 来了解如何使用系统。
