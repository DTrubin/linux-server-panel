
// ========== 基础模块导入 ==========
import express, { json, urlencoded } from 'express'
import cors from 'cors'
import fs from 'fs'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import https from 'https'
import http from 'http'
import { WebSocketServer } from 'ws'

// ========== 中间件导入 ==========
import { notFoundHandler, errorHandler, requestLogger } from './middleware/interceptors.js';
import { authenticateToken } from './middleware/routeInterceptors.js';
import { auditLogger } from './middleware/auditLogger.js';

// ========== 数据库导入 ==========
import { initDatabase, insertInitialData } from './database/index.js';

// ========== 路由导入 ==========
import authRoutes from './routes/auth.js';
import serverRoutes from './routes/server-new.js';
import monitorRoutes from './routes/monitor.js';
import fileRoutes from './routes/file.js';
import systemRoutes from './routes/system.js';
import taskRoutes from './routes/task.js';

// ========== WebSocket处理器导入 ==========
import { initWebSocketHandlers, cleanupAllSessions } from './websocket/terminal.js';
import { cleanupAllMonitorConnections } from './websocket/monitor.js';

// ========== 应用和服务器初始化 ==========
const app = express()
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}
const PORT = global.__config.port || 3000
const protocol = global.__config.protocol === 'https' ? https : http
const server = protocol.createServer(options, app)
const wss = new WebSocketServer({ server })

// ========== 安全中间件配置 ==========
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
    },
  },
}))

// ========== CORS配置 ==========
const corsOptions = {
  origin: function (origin, callback) {
    return callback(null, true)
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(cors(corsOptions))

// ========== 基础中间件配置 ==========
app.use(morgan('combined'))
app.use(json({ limit: '10mb' }))
app.use(urlencoded({ extended: true, limit: '10mb' }))

// ========== 限流中间件配置 ==========
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 限制每个IP在窗口期内最多1000个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// ========== 中间件配置 ==========
app.use(requestLogger)
app.use(auditLogger()) // 添加审计日志中间件
app.use(authenticateToken)

// ========== 健康检查路由 ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// ========== API路由配置 ==========
app.use('/api/auth', authRoutes)
app.use('/api/server', serverRoutes)
app.use('/api/monitor', monitorRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/tasks', taskRoutes)

// ========== 错误处理中间件（必须放在所有路由之后） ==========
app.use(notFoundHandler)// 404处理
app.use(errorHandler)// 错误处理中间件

// ========== WebSocket配置 ==========
// 初始化WebSocket处理器（包含终端和监控连接处理）
initWebSocketHandlers(wss)

// ========== 服务器启动 ==========
const startServer = async () => {
  try {
    initDatabase()
    logger.info('数据库初始化完成')
    await insertInitialData()
    logger.info('初始数据插入完成')
    server.listen(PORT, () => {
      const startupInfo = {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      }

      logger.info(`接口已启动 ${global.__config.protocol}://127.0.0.1:${PORT}`);
      logger.info(`环境: ${startupInfo.environment}`);

      // 使用全局logger记录启动信息
      logger.mark('服务器启动成功', JSON.stringify(startupInfo));

    })
  } catch (error) {
    logger.error('启动服务器失败: ' + error)
    throw error
  }
}

// ========== 进程信号处理 ==========
// 优雅关闭处理函数
const gracefulShutdown = async (signal) => {
  logger.warn(`收到${signal}信号，正在关闭服务器...`);
  logger.info(`收到${signal}信号，开始优雅关闭`);

  // 首先清理所有终端会话和监控连接
  cleanupAllSessions();
  cleanupAllMonitorConnections();

  // 关闭WebSocket连接
  wsLogger.info('正在关闭WebSocket连接...');
  logger.info('正在关闭WebSocket连接...');
  const closePromises = [];
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      closePromises.push(new Promise((resolve) => {
        const timeout = setTimeout(() => {
          wsLogger.warn('WebSocket连接关闭超时，强制终止');
          logger.warn('WebSocket连接关闭超时，强制终止');
          client.terminate();
          resolve();
        }, 5000); // 5秒超时

        client.once('close', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.close(1000, 'Server shutting down');
      }));
    }
  });

  // 等待所有WebSocket连接关闭
  try {
    await Promise.race([
      Promise.all(closePromises),
      new Promise(resolve => setTimeout(resolve, 10000)) // 最多等待10秒
    ]);
    wsLogger.info('所有WebSocket连接已关闭');
  } catch (error) {
    wsLogger.error('关闭WebSocket连接时出错: ' + error.message);
    throw error;
  }

  // 关闭WebSocket服务器
  const wsClosePromise = new Promise((resolve) => {
    wss.close(() => {
      wsLogger.info('WebSocket服务器已关闭');
      logger.info('WebSocket服务器已关闭');
      resolve();
    });
  });

  await wsClosePromise;

  server.close(async () => {
    logger.info('HTTP服务器已关闭');

    try {
      // 刷新并关闭全局logger
      await logger.flushAll();

      logger.info('日志存储已安全关闭');
    } catch (error) {
      logger.error('关闭日志存储时出错: ' + error.message); throw error;
    }

    // 等待日志写入完成
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
};

// SIGTERM信号处理
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// SIGINT信号处理
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// ========== 异常处理 ==========
// 未捕获的异常处理
process.on('uncaughtException', async (error) => {
  logger.error('未捕获的异常: ' + error.message);

  try {
    // 确保异常日志被写入
    await logger.flushAll();
  } catch (closeError) {
    logger.error('关闭日志存储时出错: ' + closeError.message);
    throw closeError;
  }

  // 给日志一些时间写入
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// 未处理的Promise拒绝处理
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('未处理的Promise拒绝: ' + (reason?.message || reason))

  try {
    // 确保异常日志被写入
    await logger.flushAll()
  } catch (closeError) {
    logger.error('关闭日志存储时出错: ' + closeError.message)
    throw closeError;
  }

  // 给日志一些时间写入
  setTimeout(() => {
    process.exit(1)
  }, 1000)
})


export default { startServer }