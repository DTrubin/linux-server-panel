// 路由拦截器
import jwt from 'jsonwebtoken';

// JWT密钥 (在生产环境中应该从环境变量读取)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 认证Token中间件
export const authenticateToken = (req, res, next) => {
  // 跳过登录、健康检查、静态文件等不需要认证的路由
  const skipAuthPaths = ['/api/auth/login', '/health', '/api/auth/register', '/api/auth/refresh'];
  
  // 跳过静态文件路径
  const staticFilePaths = ['/', '/index.html', '/favicon.ico'];
  const isStaticAsset = req.path.startsWith('/assets/') || req.path.startsWith('/uploads/');
  
  if (skipAuthPaths.includes(req.path) || staticFilePaths.includes(req.path) || isStaticAsset) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('auth', '访问令牌缺失', {
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('auth', 'Token验证失败', {
        error: err.message,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({
        success: false,
        message: 'Token无效或已过期',
      });
    }

    req.user = user;
    next();
  });
};

// 404 处理器
export const notFoundHandler = (req, res) => {
  logger.warn('not_found', '请求的资源未找到', {
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  return res.status(404).json({
    error: '请求的资源未找到',
    code: 'NOT_FOUND'
  });
};

export default {
  authenticateToken,
  notFoundHandler,
};
