/*
 * 环境配置文件
 * 此文件在构建时会被复制到 dist 目录
 * 部署时可以修改此文件来配置不同的服务器地址
 */

window.APP_CONFIG = {
  // API 服务器配置
  API_HOST: '',  // 留空则使用当前域名
  API_PORT: '3000',  // 留空则使用当前端口(默认3000)
  API_PROTOCOL: '', // 留空则使用当前协议

  // WebSocket 服务器配置
  WS_HOST: '',   // 留空则使用当前域名
  WS_PORT: '3000',   // 留空则使用当前端口
  WS_PROTOCOL: '', // 留空则使用当前协议

  // 自定义配置示例：
  // API_HOST: 'api.example.com',
  // API_PORT: '8080',
  // API_PROTOCOL: 'https',
  // WS_HOST: 'ws.example.com',
  // WS_PORT: '8081',
  // WS_PROTOCOL: 'wss'
};
