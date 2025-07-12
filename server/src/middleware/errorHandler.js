// logger现在是全局变量，无需导入

/**
 * 全局错误处理中间件
 */
export function errorHandler(err, req, res, next) {
    // 记录错误日志
    logger.error('Global error handler:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    // 设置错误响应
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    // 生产环境隐藏详细错误信息
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal Server Error';
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

/**
 * 404 错误处理中间件
 */
export function notFoundHandler(req, res, next) {
    logger.warn('404 Not Found:', {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
}

/**
 * 异步错误处理包装器
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default errorHandler;
