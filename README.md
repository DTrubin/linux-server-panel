# Linux Server Panel

<div align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.5.17-4FC08D?style=flat&logo=vue.js" alt="Vue.js">
  <img src="https://img.shields.io/badge/TypeScript-5.8.0-3178C6?style=flat&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-4.18.2-000000?style=flat&logo=express" alt="Express.js">
  <img src="https://img.shields.io/badge/Element_Plus-2.10.2-409EFF?style=flat&logo=element" alt="Element Plus">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/Version-1.4.0-blue.svg" alt="Version">
</div>

## 📖 项目简介

Linux Server Panel 是一个基于 Vue3 + TypeScript + Node.js 的现代化服务器监控与管理平台。提供直观的 Web 界面来监控和管理 Linux 服务器，支持实时系统监控、文件管理、任务调度、日志查看、Web 终端等功能。

## ✨ 主要特性

### 🔧 核心功能
- **实时系统监控** - CPU、内存、磁盘、网络资源监控
- **文件管理器** - 完整的文件系统操作（浏览、上传、下载、编辑）
- **Web 终端** - 基于 WebSocket 的实时命令行终端
- **任务调度** - Cron 定时任务管理和监控
- **日志管理** - 系统和应用日志统一查看和搜索
- **用户认证** - JWT 认证和权限管理

### 🎨 界面特色
- **响应式设计** - 支持桌面和移动设备
- **深色/浅色主题** - 个性化界面主题
- **实时图表** - ECharts 实时数据可视化
- **虚拟滚动** - 大数据量高性能显示

### 🔒 安全特性
- **HTTPS 支持** - SSL/TLS 加密传输
- **审计日志** - 完整的操作审计追踪
- **访问控制** - 基于角色的权限管理
- **安全防护** - CORS、CSP、频率限制

## � 文档导航

- [详细文档目录](docs/README.md)
- [用户指南](docs/user-guide.md) - 详细功能说明与操作教程
- [API 参考](docs/api-reference.md) - REST API 和 WebSocket 接口文档
- [安全指南](docs/security-guide.md) - 安全特性和最佳实践
- [贡献指南](docs/contributing.md) - 参与项目开发流程
- [常见问题](docs/faq.md) - 常见问题解答
- [更新日志](docs/changelog.md) - 版本历史和功能更新

## �🚀 快速开始

### 系统要求
- Node.js 18+
- npm/pnpm
- Linux/Windows 操作系统

### 安装部署

1. **克隆项目**
```bash
git clone https://github.com/your-repo/linux-server-panel.git
cd linux-server-panel
```

2. **安装依赖**
```bash
# 安装前端依赖
cd panel
pnpm install

# 安装后端依赖
cd ../server
npm install
```

3. **配置环境**
```bash
# 复制配置文件
cp server/config.json.example server/config.json

# 生成 SSL 证书（可选，用于 HTTPS）
openssl req -x509 -newkey rsa:4096 -keyout server/key.pem -out server/cert.pem -days 365 -nodes
```

4. **启动服务**
```bash
# 启动后端服务（开发模式）
cd server
npm run dev

# 启动前端服务（开发模式）
cd panel
pnpm dev
```

5. **访问应用**
- 前端开发服务器: http://localhost:5173
- 后端 API 服务器: http://localhost:3000
- 生产环境访问: https://localhost (需要先构建)

### 生产环境部署

1. **构建前端**
```bash
cd panel
pnpm build
```

2. **启动生产服务**
```bash
cd server
npm start
```

3. **访问应用**
- 默认管理员账户: `admin`
- 默认密码: `123456` (首次登录后请修改)

## 📁 项目结构

```
linux-server-panel/
├── panel/                    # 前端 Vue3 应用
│   ├── src/
│   │   ├── api/             # API 接口定义
│   │   ├── components/      # Vue 组件
│   │   ├── composables/     # 组合式函数
│   │   ├── store/           # Pinia 状态管理
│   │   ├── router/          # Vue Router 路由
│   │   ├── utils/           # 工具函数
│   │   └── views/           # 页面组件
│   ├── public/              # 静态资源
│   └── dist/                # 构建输出
├── server/                   # 后端 Node.js 应用
│   ├── src/
│   │   ├── routes/          # Express 路由
│   │   ├── middleware/      # 中间件
│   │   ├── services/        # 业务逻辑
│   │   ├── database/        # 数据访问层
│   │   ├── utils/           # 工具函数
│   │   └── websocket/       # WebSocket 处理
│   ├── data/                # JSON 数据存储
│   ├── logs/                # 应用日志
│   └── cert.pem/key.pem     # SSL 证书
└── docs/                     # 项目文档
```

## 🔧 技术栈

### 前端技术
- **框架**: Vue 3.5.17 (Composition API)
- **语言**: TypeScript 5.8.0
- **构建工具**: Vite 7.0.0
- **UI 框架**: Element Plus 2.10.2
- **状态管理**: Pinia 3.0.3
- **路由**: Vue Router 4.5.1
- **图表**: ECharts 5.6.0
- **终端**: xterm.js 5.5.0

### 后端技术
- **运行时**: Node.js 18+
- **框架**: Express.js 4.18.2
- **语言**: JavaScript (ES Modules)
- **WebSocket**: ws
- **系统信息**: systeminformation
- **安全**: helmet, cors, bcryptjs
- **工具**: nodemon, chalk

### 开发工具
- **代码规范**: ESLint + Prettier
- **类型检查**: TypeScript
- **包管理**: pnpm (前端) + npm (后端)
- **构建**: Vite + Terser

## 📊 功能模块

### 1. 仪表盘 (Dashboard)
- 实时系统资源监控
- CPU、内存、磁盘、网络使用率
- 交互式图表展示
- 系统告警和通知

### 2. 文件管理器 (File Manager)
- 目录浏览和导航
- 文件/文件夹操作（创建、删除、重命名）
- 批量文件上传下载
- 在线文件编辑器
- 文件权限管理

### 3. Web 终端 (Terminal)
- 实时命令执行
- 支持 PowerShell / Bash
- 会话管理
- 命令历史记录
- 终端大小自适应

### 4. 任务调度 (Task Scheduler)
- Cron 表达式任务创建
- 任务执行状态监控
- 执行历史和日志查看
- 批量任务管理
- 任务统计分析

### 5. 日志管理 (Log Manager)
- 系统日志统一查看
- 关键字搜索和过滤
- 大文件虚拟滚动加载
- 日志下载和导出
- 日志查看历史

### 6. 系统管理 (System)
- 系统信息查看
- 服务管理
- 进程监控
- 系统操作（重启、关机）
- 配置管理

## ⚙️ 配置说明

### 服务器配置 (server/config.json)
```json
{
  "adminDefaultPassword": "123456",  // 默认管理员密码
  "port": 3000,                      // API 服务端口
  "wsPort": 3001,                    // WebSocket 端口
  "staticPort": 443,                 // 静态文件服务端口
  "protocol": "https"                // 协议类型
}
```

### 环境变量
- `NODE_ENV`: 运行环境 (development/production)
- `LOG_LEVEL`: 日志级别 (debug/info/warn/error)

## 🔒 安全特性

### 认证与授权
- JWT Token 认证
- 基于角色的权限控制
- 会话管理和超时机制
- 密码加密存储

### 安全防护
- HTTPS/SSL 加密传输
- CORS 跨域保护
- CSP 内容安全策略
- 请求频率限制
- 输入验证和过滤

### 审计日志
- 完整的操作审计记录
- 用户行为追踪
- 系统事件记录
- 安全事件告警

## 📝 API 文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息

### 系统监控
- `GET /api/server/info` - 获取系统信息
- `GET /api/server/resources` - 获取系统资源
- `GET /api/monitor/system` - 获取监控数据

### 文件管理
- `GET /api/files/browse` - 浏览目录
- `POST /api/files/upload` - 上传文件
- `GET /api/files/download` - 下载文件
- `POST /api/files/create-folder` - 创建文件夹

详细 API 文档请参考 [docs/api.md](docs/api.md)

## 🐛 问题排查

### 常见问题

1. **启动失败**
   - 检查 Node.js 版本是否满足要求
   - 确认端口是否被占用
   - 检查依赖是否完整安装

2. **WebSocket 连接失败**
   - 检查防火墙设置
   - 确认 WebSocket 端口配置
   - 查看浏览器控制台错误信息

3. **SSL 证书问题**
   - 生成新的自签名证书
   - 配置证书路径
   - 检查证书权限

### 日志查看
```bash
# 查看应用日志
tail -f server/logs/error.log
tail -f server/logs/webSocket.log

# 查看系统日志
journalctl -f -u your-service-name
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 开发流程
1. Fork 项目
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交变更: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 提交 Pull Request

### 代码规范
- 遵循 ESLint 配置规则
- 使用 TypeScript 进行类型检查
- 编写有意义的提交信息
- 添加必要的注释和文档

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

感谢以下开源项目：
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [Express.js](https://expressjs.com/) - Node.js Web 框架
- [ECharts](https://echarts.apache.org/) - 数据可视化图表库
- [xterm.js](https://xtermjs.org/) - Web 终端组件

## 📞 支持

如果您在使用过程中遇到问题或有建议，请通过以下方式联系我们：

- 🐛 [提交 Issue](https://github.com/your-repo/linux-server-panel/issues)
- 💬 [讨论区](https://github.com/your-repo/linux-server-panel/discussions)
- 📧 Email: support@example.com

---

<div align="center">
  Made with ❤️ by Server Panel Team
</div>