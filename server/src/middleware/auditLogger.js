/**
 * 审计日志中间件
 * 自动记录所有API操作到审计日志
 */

import { auditLogDAO } from '../database/dao.js';

// 需要记录的操作类型映射
const ACTION_MAPPINGS = {
  // 认证操作
  'POST /auth/login': 'USER_LOGIN',
  'POST /auth/logout': 'USER_LOGOUT',
  'POST /auth/refresh': 'TOKEN_REFRESH',
  'POST /auth/register': 'USER_REGISTER',
  'PUT /auth/profile': 'UPDATE_PROFILE',
  'POST /auth/upload-avatar': 'UPLOAD_AVATAR',
  'PUT /auth/change-password': 'CHANGE_PASSWORD',

  // 文件操作
  'GET /file/list': 'VIEW_FILES',
  'POST /file/upload': 'UPLOAD_FILE',
  'DELETE /file/delete': 'DELETE_FILE',
  'PUT /file/rename': 'RENAME_FILE',
  'POST /file/copy': 'COPY_FILE',
  'POST /file/move': 'MOVE_FILE',
  'POST /file/create-folder': 'CREATE_FOLDER',
  'GET /file/download': 'DOWNLOAD_FILE',
  'POST /file/extract': 'EXTRACT_FILE',
  'POST /file/compress': 'COMPRESS_FILE',
  'PUT /file/edit': 'EDIT_FILE',
  'POST /file/chmod': 'CHANGE_PERMISSIONS',

  // 任务管理
  'GET /task/list': 'VIEW_TASKS',
  'POST /task/create': 'CREATE_TASK',
  'PUT /task/update': 'UPDATE_TASK',
  'DELETE /task/delete': 'DELETE_TASK',
  'POST /task/execute': 'EXECUTE_TASK',
  'POST /task/stop': 'STOP_TASK',
  'GET /task/logs': 'VIEW_TASK_LOGS',

  // 系统操作
  'GET /system/info': 'VIEW_SYSTEM_INFO',
  'POST /system/shutdown': 'SYSTEM_SHUTDOWN',
  'POST /system/reboot': 'SYSTEM_REBOOT',
  'GET /system/processes': 'VIEW_PROCESSES',
  'POST /system/kill-process': 'KILL_PROCESS',
  'GET /system/services': 'VIEW_SERVICES',
  'POST /system/service/start': 'START_SERVICE',
  'POST /system/service/stop': 'STOP_SERVICE',
  'POST /system/service/restart': 'RESTART_SERVICE',

  // 监控操作
  'GET /monitor/system': 'VIEW_SYSTEM_MONITOR',
  'GET /monitor/processes': 'VIEW_PROCESS_MONITOR',
  'GET /monitor/network': 'VIEW_NETWORK_MONITOR',
  'GET /monitor/disk': 'VIEW_DISK_MONITOR',

  // 日志操作
  'GET /logs/system': 'VIEW_SYSTEM_LOGS',
  'GET /logs/audit': 'VIEW_AUDIT_LOGS',
  'GET /logs/stats': 'VIEW_LOG_STATS',
  'POST /logs/export': 'EXPORT_LOGS',

  // 权限管理
  'GET /permission/users': 'VIEW_USERS',
  'POST /permission/users': 'CREATE_USER',
  'PUT /permission/users': 'UPDATE_USER',
  'DELETE /permission/users': 'DELETE_USER',
  'GET /permission/roles': 'VIEW_ROLES',
  'POST /permission/roles': 'CREATE_ROLE',
  'PUT /permission/roles': 'UPDATE_ROLE',
  'DELETE /permission/roles': 'DELETE_ROLE'
};

// 敏感字段，记录时需要过滤或脱敏
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'authorization'];

// 过滤敏感信息
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  for (const field of SENSITIVE_FIELDS) {
    if (sanitized[field]) {
      sanitized[field] = '***';
    }
  }

  return sanitized;
}

// 获取客户端IP地址
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

// 审计日志中间件
export const auditLogger = (options = {}) => {
  return async (req, res, next) => {
    // 记录请求开始时间
    const startTime = Date.now();
    
    // 保存原始的 res.json 方法
    const originalJson = res.json;
    
    // 重写 res.json 方法来捕获响应
    res.json = function(body) {
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      // 异步记录审计日志，不阻塞响应
      setImmediate(async () => {
        try {
          await recordAuditLog(req, res, body, responseTime);
        } catch (error) {
          logger.error('记录审计日志失败:', error);
          throw error;
        }
      });
      
      // 调用原始的 json 方法
      return originalJson.call(this, body);
    };
    
    next();
  };
};

// 记录审计日志的核心函数
async function recordAuditLog(req, res, responseBody, responseTime) {
  try {
    const method = req.method;
    const path = req.route ? req.route.path : req.path;
    const fullPath = req.originalUrl || req.url;
    const actionKey = `${method} ${path}`;
    const action = ACTION_MAPPINGS[actionKey] || `${method}_${path.replace(/\//g, '_').toUpperCase()}`;
    
    // 跳过不需要记录的操作（如健康检查、静态资源等）
    if (shouldSkipLogging(req, path)) {
      return;
    }

    // 构建审计日志数据
    const auditData = {
      user_id: req.user?.id || 'anonymous',
      action: action,
      resource: extractResourceName(path, req.params),
      details: {
        method: method,
        path: fullPath,
        userAgent: req.get('User-Agent'),
        params: sanitizeData(req.params),
        query: sanitizeData(req.query),
        body: sanitizeData(req.body),
        responseStatus: res.statusCode,
        responseTime: responseTime,
        success: res.statusCode < 400,
        timestamp: new Date().toISOString()
      },
      ip_address: getClientIP(req),
      user_agent: req.get('User-Agent'),
      level: res.statusCode >= 400 ? 'error' : 'info',
      created_at: new Date().toISOString()
    };

    // 如果响应包含错误信息，添加到详情中
    if (responseBody && !responseBody.success && responseBody.error) {
      auditData.details.error = responseBody.error;
      auditData.level = 'error';
    }

    // 记录到数据库
    await auditLogDAO.create(auditData);
    
  } catch (error) {
    logger.error('记录审计日志时发生错误:', error);
    throw error;
  }
}

// 判断是否需要跳过日志记录
function shouldSkipLogging(req, path) {
  const skipPaths = [
    '/health',
    '/ping',
    '/favicon.ico',
    '/monitor/websocket',
    '/logs/stream',
    '/logs/tail'
  ];
  
  const skipMethods = ['OPTIONS'];
  
  // 跳过静态资源
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    return true;
  }
  
  // 跳过特定路径
  if (skipPaths.some(skipPath => path.includes(skipPath))) {
    return true;
  }
  
  // 跳过特定方法
  if (skipMethods.includes(req.method)) {
    return true;
  }
  
  return false;
}

// 从路径中提取资源名称
function extractResourceName(path, params) {
  // 移除API前缀和版本
  let resource = path.replace(/^\/api\/v?\d*\/?/, '');
  
  // 替换参数
  if (params) {
    Object.keys(params).forEach(key => {
      resource = resource.replace(`:${key}`, params[key]);
    });
  }
  
  // 清理并返回
  return resource.replace(/\//g, '_').toLowerCase() || 'unknown';
}

// 导出单独的记录函数，供手动调用
export async function logAuditEvent(userId, action, resource, details = {}, level = 'info', req = null) {
  try {
    const auditData = {
      user_id: userId || 'system',
      action: action,
      resource: resource,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      ip_address: req ? getClientIP(req) : 'system',
      user_agent: req ? req.get('User-Agent') : 'system',
      level: level,
      created_at: new Date().toISOString()
    };
    
    await auditLogDAO.create(auditData);
  } catch (error) {
    logger.error('手动记录审计日志失败:', error);
    throw error;
  }
}

export default auditLogger;
