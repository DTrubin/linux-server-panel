# 前端部署配置指南

## 概述
本前端应用支持灵活的部署配置，可以通过修改配置文件来适应不同的部署环境，无需重新构建。

## 部署步骤

### 1. 构建应用
```bash
cd panel
npm run build
# 或者
pnpm build
```

### 2. 部署静态文件
将 `dist` 目录中的所有文件部署到您的Web服务器。

### 3. 配置后端地址（可选）
如果后端服务器地址与前端不在同一域名/端口，需要修改 `dist/config.js` 文件：

```javascript
window.APP_CONFIG = {
  // 自定义API服务器地址
  API_HOST: 'your-api-server.com',
  API_PORT: '3000',
  API_PROTOCOL: 'https',
  
  // 自定义WebSocket服务器地址
  WS_HOST: 'your-websocket-server.com',
  WS_PORT: '3000',
  WS_PROTOCOL: 'wss'
};
```

## 配置选项说明

### API_HOST
- **默认值**: 当前页面域名
- **说明**: API服务器的主机地址
- **示例**: `'api.example.com'`, `'192.168.1.100'`

### API_PORT
- **默认值**: 当前页面端口
- **说明**: API服务器的端口号
- **示例**: `'3000'`, `'8080'`

### API_PROTOCOL
- **默认值**: 当前页面协议
- **说明**: API服务器的协议
- **可选值**: `'http'`, `'https'`

### WS_HOST
- **默认值**: 当前页面域名
- **说明**: WebSocket服务器的主机地址
- **示例**: `'ws.example.com'`, `'192.168.1.100'`

### WS_PORT
- **默认值**: 当前页面端口
- **说明**: WebSocket服务器的端口号
- **示例**: `'3000'`, `'8081'`

### WS_PROTOCOL
- **默认值**: 根据当前页面协议自动选择
- **说明**: WebSocket协议
- **可选值**: `'ws'`, `'wss'`

## 部署场景示例

### 场景1: 前后端同域部署
如果前端和后端部署在同一台服务器上，无需修改 `config.js`，保持默认配置即可。

### 场景2: 前后端分离部署
```javascript
window.APP_CONFIG = {
  API_HOST: 'api.yourcompany.com',
  API_PORT: '443',
  API_PROTOCOL: 'https',
  WS_HOST: 'api.yourcompany.com',
  WS_PORT: '443',
  WS_PROTOCOL: 'wss'
};
```

### 场景3: 开发环境代理
开发环境下，配置会自动使用本地地址，无需修改。

### 场景4: 使用CDN部署前端
```javascript
window.APP_CONFIG = {
  API_HOST: 'backend.yourcompany.com',
  API_PORT: '3000',
  API_PROTOCOL: 'https',
  WS_HOST: 'backend.yourcompany.com',
  WS_PORT: '3000',
  WS_PROTOCOL: 'wss'
};
```

## 注意事项

1. **CORS配置**: 确保后端服务器的CORS配置允许前端域名访问
2. **HTTPS部署**: 在生产环境中建议使用HTTPS协议
3. **WebSocket配置**: 确保WebSocket服务器地址可达
4. **防火墙设置**: 确保所配置的端口在防火墙中已开放
5. **负载均衡**: 如果使用负载均衡，确保WebSocket连接的粘性会话配置

## 故障排查

### 1. API请求失败
- 检查 `config.js` 中的API配置
- 确认后端服务是否正常运行
- 检查网络连接和防火墙设置

### 2. WebSocket连接失败
- 检查 `config.js` 中的WebSocket配置
- 确认WebSocket服务是否正常运行
- 检查浏览器控制台中的错误信息

### 3. 跨域问题
- 确认后端CORS配置正确
- 检查预检请求(OPTIONS)是否成功

## 环境变量支持

在构建时，您也可以通过环境变量来配置默认值：

```bash
# 设置默认API地址
VITE_API_HOST=api.example.com npm run build

# 设置默认协议
VITE_API_PROTOCOL=https npm run build
```

这些环境变量会在构建时被注入，但运行时的 `config.js` 配置会覆盖这些默认值。
