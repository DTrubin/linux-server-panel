#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// 确保config.js文件存在于dist目录中
const configSource = path.join(__dirname, '../public/config.js')
const configDest = path.join(__dirname, '../dist/config.js')

try {
  // 检查源文件是否存在
  if (fs.existsSync(configSource)) {
    // 检查目标目录是否存在
    const distDir = path.dirname(configDest)
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true })
    }

    // 复制配置文件
    fs.copyFileSync(configSource, configDest)
    console.log('✓ 配置文件已复制到 dist/config.js')
  } else {
    console.warn('⚠ 警告: public/config.js 不存在，跳过复制')
  }

  // 创建部署说明文件
  const deploymentGuide = `
部署配置说明：

1. 当前构建已完成，静态文件位于 dist/ 目录中
2. 如需自定义后端服务器地址，请编辑 dist/config.js 文件
3. 详细配置说明请参考项目根目录的 DEPLOYMENT.md 文件

快速配置示例：
修改 dist/config.js 中的 window.APP_CONFIG 对象：
{
  API_HOST: '您的API服务器地址',
  API_PORT: '端口号',
  API_PROTOCOL: 'http 或 https',
  WS_HOST: '您的WebSocket服务器地址',
  WS_PORT: '端口号',
  WS_PROTOCOL: 'ws 或 wss'
}
`

  fs.writeFileSync(path.join(__dirname, '../dist/DEPLOYMENT_README.txt'), deploymentGuide)
  console.log('✓ 部署说明文件已创建: dist/DEPLOYMENT_README.txt')

} catch (error) {
  console.error('✗ 构建后处理脚本执行失败:', error.message)
  process.exit(1)
}
