import os from 'os'
import _path from 'path'

// 邮箱验证
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 密码验证（至少8位，包含大小写字母和数字）
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

// 用户名验证（3-20位，只能包含字母、数字和下划线）
const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
  return usernameRegex.test(username)
}

// 手机号验证（中国大陆手机号）
const validatePhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 文件路径验证（支持Unix/Linux和Windows路径，以及我们的路径映射）
export const validateFilePath = (path, create) => {
  if (!path || typeof path !== 'string') {
    return false
  }

  // 如果是创建文件的路径，取文件夹路径
  if (create) {
    path = _path.dirname(path)
  }

  // 检查是否包含危险字符
  if (path.includes('..') || path.includes('<') || path.includes('>')) {
    return false
  }

  // Unix/Linux 路径格式：以/开头，支持中文字符
  const unixPathRegex = /^\/[\u4e00-\u9fa5a-zA-Z0-9._\-\/\s:()（）【】\[\]]*$/

  // Windows 路径格式：C:\ 或 \\server\share，支持中文字符
  const windowsPathRegex = /^[a-zA-Z]:[\\\/][\u4e00-\u9fa5a-zA-Z0-9._\-\\\/\s()（）【】\[\]]*$|^\\\\[\u4e00-\u9fa5a-zA-Z0-9._\-]+\\[\u4e00-\u9fa5a-zA-Z0-9._\-\\\/\s()（）【】\[\]]*$/

  // 我们的路径映射格式：/c, /c/, /c/path, /users, /windows 等，支持中文字符
  const mappedPathRegex = /^\/([a-z]:?|users|windows|tmp)(\/[\u4e00-\u9fa5a-zA-Z0-9._\-\/\s()（）【】\[\]]*)?$/

  return unixPathRegex.test(path) || windowsPathRegex.test(path) || mappedPathRegex.test(path)
}

// 任务名称验证
const validateTaskName = (name) => {
  const nameRegex = /^[a-zA-Z0-9\u4e00-\u9fa5._\-\s]{1,50}$/
  return nameRegex.test(name)
}

// 权限代码验证
const validatePermissionCode = (code) => {
  const codeRegex = /^[a-zA-Z0-9:_\-]+$/
  return codeRegex.test(code)
}

// 角色代码验证
const validateRoleCode = (code) => {
  const codeRegex = /^[a-zA-Z0-9_\-]{2,20}$/
  return codeRegex.test(code)
}

// 输入清理（防止XSS）
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

// HTML清理（更严格的清理）
const sanitizeHTML = (html) => {
  if (typeof html !== 'string') {
    return html
  }

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

// SQL注入防护（基础检查）
const validateSQLInput = (input) => {
  if (typeof input !== 'string') {
    return true
  }

  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(;|--|\||\*)/,
    /('|('')|[";])/
  ]

  return !dangerousPatterns.some(pattern => pattern.test(input))
}

/**
 * 检查文件名是否有效
 * @param {string} filename 要检查的文件名（不包含路径）
 * @returns {boolean} 文件名是否有效
 */
export function validateFileName(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // 检查长度限制（通常255字节，但这里简化检查）
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }

  // 系统保留字符（Windows更严格）
  const platform = os.platform();
  const reservedChars = platform === 'win32'
    ? /[<>:"/\\|?*\x00-\x1F]/g  // Windows保留字符
    : /[\x00-\x1F/]/g;          // Linux/Unix保留字符（主要是控制字符和斜杠）

  if (reservedChars.test(filename)) {
    return false;
  }

  // Windows保留文件名（如CON, PRN, AUX等）
  if (platform === 'win32') {
    const windowsReservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (windowsReservedNames.includes(nameWithoutExt)) {
      return false;
    }
  }

  // 检查以点开头（Unix隐藏文件允许，但某些系统可能限制）
  if (filename === '.' || filename === '..') {
    return false;
  }

  // 检查空格开头/结尾（允许但可能不推荐）
  if (filename.trim() !== filename) {
    return false; // 可根据需求调整
  }

  return true;
}

// 文件大小验证（字节）
const validateFileSize = (size, maxSize = 100 * 1024 * 1024) => { // 默认100MB
  return typeof size === 'number' && size > 0 && size <= maxSize
}

// MIME类型验证
const validateMimeType = (mimeType, allowedTypes = []) => {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    return true // 如果没有限制，则允许所有类型
  }

  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.slice(0, -2)
      return mimeType.startsWith(category + '/')
    }
    return mimeType === type
  })
}

// 日期验证
const validateDate = (dateString) => {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// 时间范围验证
const validateTimeRange = (startTime, endTime) => {
  const start = new Date(startTime)
  const end = new Date(endTime)

  return !isNaN(start.getTime()) &&
    !isNaN(end.getTime()) &&
    start < end
}

// 分页参数验证
const validatePagination = (page, pageSize, maxPageSize = 100) => {
  const pageNum = parseInt(page)
  const pageSizeNum = parseInt(pageSize)

  return !isNaN(pageNum) && pageNum >= 1 &&
    !isNaN(pageSizeNum) && pageSizeNum >= 1 && pageSizeNum <= maxPageSize
}

// 批量验证
const validateBatch = (data, validators) => {
  const errors = {}

  Object.keys(validators).forEach(field => {
    const value = data[field]
    const validator = validators[field]

    if (typeof validator === 'function') {
      if (!validator(value)) {
        errors[field] = `${field} validation failed`
      }
    } else if (typeof validator === 'object') {
      const { required, validate, message } = validator

      if (required && (value === undefined || value === null || value === '')) {
        errors[field] = message || `${field} is required`
      } else if (value !== undefined && value !== null && value !== '' && !validate(value)) {
        errors[field] = message || `${field} validation failed`
      }
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// 创建验证中间件
const createValidator = (schema) => {
  return (req, res, next) => {
    const { isValid, errors } = validateBatch(req.body, schema)

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
      })
    }

    next()
  }
}

// 常用验证模式
const commonSchemas = {
  login: {
    username: {
      required: true,
      validate: validateUsername,
      message: '用户名格式不正确'
    },
    password: {
      required: true,
      validate: (password) => password && password.length >= 6,
      message: '密码至少6位'
    }
  },

  register: {
    username: {
      required: true,
      validate: validateUsername,
      message: '用户名格式不正确，只能包含字母、数字和下划线，长度3-20位'
    },
    password: {
      required: true,
      validate: validatePassword,
      message: '密码强度不够，至少8位，包含大小写字母、数字'
    },
    email: {
      required: true,
      validate: validateEmail,
      message: '邮箱格式不正确'
    },
    phone: {
      required: false,
      validate: validatePhone,
      message: '手机号格式不正确'
    }
  },

  pagination: {
    page: {
      required: false,
      validate: (page) => validatePagination(page, 10),
      message: '页码必须是正整数'
    },
    pageSize: {
      required: false,
      validate: (pageSize) => validatePagination(1, pageSize),
      message: '页面大小必须是1-100之间的整数'
    }
  }
}

export default {
  validateEmail,
  validatePassword,
  validateUsername,
  validatePhone,
  validateFilePath,
  validateFileName
};
