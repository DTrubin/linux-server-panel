// 通用中间件和拦截器

// 请求日志记录中间件
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  // 记录请求开始
  logger.info('http', `${req.method} ${req.path}`, {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // 拦截响应结束事件
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;

    // 记录响应
    logger.info('http', `${req.method} ${req.path} - ${res.statusCode}`, {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    // 调用原始的send方法
    originalSend.call(this, data);
  };

  next();
};

// 404处理
export const notFoundHandler = (req, res) => {
  logger.warn('http', `404 - 接口不存在: ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(404).json({
    error: '接口不存在',
    code: 'NOT_FOUND',
    path: req.path
  });
};

// 错误处理中间件
export const errorHandler = (err, req, res, next) => {
  logger.error('http', '请求处理错误', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    requestId: req.requestId
  });

  // 如果响应已经发送，委托给默认的Express错误处理器
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default {
  requestLogger,
  notFoundHandler,
  errorHandler
};
