#!/usr/bin/env node

import setLog from './src/utils/log.js';
import fs from 'fs';

setLog()// 初始化日志

// ========== 配置文件加载 ==========
const defaultConfig = {
    adminDefaultPassword: '123456',
    port: 3000,
    wsPort: 3001,
    staticPort: 8080,
};
let config = {};
try {
    config = JSON.parse(fs.readFileSync('config.json', 'utf-8'))
} catch (e) {
    console.error('读取配置文件失败:', e);
}

global.__config = {
    ...defaultConfig,
    ...config
};

// 启动应用程序
const app = await import('./src/app.js');
app.default.startServer();

const staticServer = await import('./src/utils/static.js');
staticServer.startStaticServer();
