import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import multer from 'multer';
import mime from 'mime-types';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { authenticateToken } from '../middleware/routeInterceptors.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateFilePath, validateFileName } from '../utils/validation.js';
import { logAuditEvent } from '../middleware/auditLogger.js';
import setLog from '../utils/log.js';

// 初始化日志
setLog();
const logger = global.logger;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const router = express.Router();

// 上传进度跟踪
const uploadProgress = new Map();

/**
 * 检测日志级别
 * @param {string} line 日志行内容
 * @returns {string} 日志级别：'error', 'warn', 'info', 'debug', 'default'
 */
const detectLogLevel = (line) => {
  if (!line) return 'default'

  const lowerLine = line.toLowerCase()

  if (lowerLine.includes('error') || lowerLine.includes('err') || lowerLine.includes('fatal')) {
    return 'error'
  } else if (lowerLine.includes('warn') || lowerLine.includes('warning')) {
    return 'warn'
  } else if (lowerLine.includes('info')) {
    return 'info'
  } else if (lowerLine.includes('debug') || lowerLine.includes('trace')) {
    return 'debug'
  }

  return 'default'
}

// 所有路由都需要认证
router.use(authenticateToken)

/**
 * 路径转换辅助函数
 * 将前端的 Unix 风格路径转换为后端实际的系统路径
 */
const convertUnixPathToSystem = (unixPath) => {
  if (process.platform !== 'win32') {
    return unixPath // 在非 Windows 系统上直接返回
  }

  // 删除开头的斜杠和替换 \ 为 /
  return unixPath.replace(/^\//, '').replace(/\\/g, '/')
}

/**
 * 将系统路径转换为前端使用的 Unix 风格路径
 */
const convertSystemPathToUnix = (systemPath) => {
  if (process.platform !== 'win32') {
    return systemPath // 在非 Windows 系统上直接返回
  }

  // 将 C:\path 转换为 C:/path
  return systemPath.replace(/\\/g, '/')
}

// 配置multer用于文件上传 - 在路由中动态配置

/**
 * 获取Windows系统的所有驱动器盘符
 * @returns {Promise<string[]>} 返回驱动器盘符数组（如 ['C:', 'D:', 'E:']）
 */
function getAllDriveLetters() {
  return new Promise((resolve, reject) => {
    if (os.platform() !== 'win32') {
      reject(new Error('此方法仅适用于Windows系统'));
      return;
    }

    // 使用PowerShell命令替代WMIC
    exec('powershell "Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root"',
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`执行错误: ${error.message}`));
          return;
        }
        if (stderr) {
          reject(new Error(`PowerShell错误: ${stderr}`));
          return;
        }

        // 处理输出结果
        const drives = stdout.split('\r\n')
          .filter(line => line.trim().length > 0)
          .map(line => line.trim().replace(/\\$/, '')); // 移除末尾的反斜杠

        resolve(drives);
      });
  });
}

/**
 * 获取系统默认路径信息
 */
router.get('/system-paths', asyncHandler(async (req, res) => {
  const platform = os.platform()
  let defaultPaths = []
  let homePath = os.homedir()

  try {
    // 根据操作系统平台推荐默认路径
    switch (platform) {
      case 'win32':
        defaultPaths = [
          { path: '/', name: '根目录', type: 'root' },
          { path: '/', name: '用户目录', type: 'home' },
          { path: '/', name: '系统根目录', type: 'users' }
        ]
        break
      case 'darwin':
        defaultPaths = [
          { path: '/', name: '根目录', type: 'root' },
          { path: homePath, name: '用户目录', type: 'home' },
          { path: '/Users', name: '用户文件夹', type: 'users' },
          { path: '/Applications', name: '应用程序', type: 'applications' }
        ]
        break
      default: // Linux and other Unix-like systems
        defaultPaths = [
          { path: '/', name: '根目录', type: 'root' },
          { path: homePath, name: '用户目录', type: 'home' },
          { path: '/home', name: '用户文件夹', type: 'users' },
          { path: '/var', name: '变量数据', type: 'var' }
        ]
    }

    // 验证路径是否可访问
    const accessiblePaths = []
    for (const pathInfo of defaultPaths) {
      try {
        await fs.access(pathInfo.path)
        const stats = await fs.stat(pathInfo.path)
        if (stats.isDirectory()) {
          accessiblePaths.push({ ...pathInfo, accessible: true })
        }
      } catch (error) {
        accessiblePaths.push({ ...pathInfo, accessible: false })
        throw error;
      }
    }

    // 推荐一个默认的可访问路径
    const recommendedPath = accessiblePaths.find(p => p.accessible && p.type === 'home') ||
      accessiblePaths.find(p => p.accessible && p.type === 'users') ||
      accessiblePaths.find(p => p.accessible)

    // 记录审计日志
    await logAuditEvent(
      req.user?.id || 'anonymous',
      'VIEW_SYSTEM_PATHS',
      'file_system',
      {
        platform,
        accessiblePathsCount: accessiblePaths.filter(p => p.accessible).length,
        recommendedPath: recommendedPath?.path
      },
      'info',
      req
    );

    res.json({
      success: true,
      message: '获取系统路径信息成功',
      data: {
        platform,
        homePath,
        paths: accessiblePaths,
        recommended: recommendedPath?.path || '/'
      }
    })

  } catch (error) {
    logger.error('http', '获取系统路径失败:', error)
    res.status(500).json({
      success: false,
      message: '获取系统路径失败',
    })
  }
}))

/**
 * 获取目录内容
 */
router.get('/browse', asyncHandler(async (req, res) => {
  let dirPath = req.query.path

  // 验证输入路径
  if (!dirPath) {
    return res.status(400).json({
      success: false,
      message: '请提供路径参数',
    })
  }

  // 验证路径格式
  if (!validateFilePath(dirPath)) {
    return res.status(400).json({
      success: false,
      message: '路径格式不正确',
    })
  }

  // 如果以冒号结尾，则加上斜杠
  if (dirPath && dirPath.endsWith(':')) {
    dirPath += '/'
  }

  // 在 Windows 上，如果请求根路径，返回所有驱动器
  if (process.platform === 'win32' && dirPath === '/') {
    try {
      const drives = []
      // 驱动盘符
      const driveLetters = await getAllDriveLetters();
      // 检查常见的驱动器盘符
      for (let drive of driveLetters) {
        try {
          const stats = await fs.stat(drive + '\\')
          if (stats.isDirectory()) {
            drives.push({
              name: drive,
              path: '/' + drive,
              type: 'directory',
              size: 0,
              modified: stats.mtime.toISOString(),
              isHidden: false,
              permissions: {
                readable: true,
                writable: true,
                executable: true
              },
              owner: 'system',
              group: 'system'
            })
          }
        } catch (e) {
          logger.warn('http', `无法访问驱动器 ${drive}:`, e.message)
        }
      }

      return res.json({
        success: true,
        message: '获取目录内容成功',
        data: {
          path: dirPath,
          items: drives
        }
      })
    } catch (error) {
      logger.error('http', 'Windows root directory access error:', error)
      // 如果所有方法都失败，返回空列表
      return res.json({
        success: true,
        message: '获取目录内容成功',
        data: {
          path: dirPath,
          items: []
        }
      })
    }
  }

  // 使用辅助函数转换路径
  const systemPath = convertUnixPathToSystem(dirPath)

  try {
    // 检查路径是否存在
    const stats = await fs.stat(systemPath)
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径不是目录',
      })
    }

    // 检查目录访问权限
    try {
      await fs.access(systemPath, fs.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限访问该目录',
      })
    }

    const entries = await fs.readdir(systemPath)
    const items = []

    for (const entry of entries) {
      // 验证文件名
      if (!validateFileName(entry)) {
        logger.warn('http', `跳过非法文件名: ${entry}`)
        continue
      }

      const fullPath = path.join(systemPath, entry)
      let isHidden = false

      // 检查是否为隐藏文件
      if (entry.startsWith('.')) {
        isHidden = true
      }

      try {
        const itemStats = await fs.stat(fullPath)

        // 检查文件/目录访问权限
        let readable = true
        let writable = true
        try {
          await fs.access(fullPath, fs.constants.R_OK)
        } catch {
          readable = false
        }
        try {
          await fs.access(fullPath, fs.constants.W_OK)
        } catch {
          writable = false
        }

        // 使用辅助函数将系统路径转换为 Unix 风格的路径
        const unixPath = convertSystemPathToUnix(fullPath)

        const item = {
          name: entry,
          path: unixPath,
          type: itemStats.isDirectory() ? 'directory' : 'file',
          size: itemStats.size,
          modified: itemStats.mtime.toISOString(),
          isHidden,
          permissions: {
            readable,
            writable,
            executable: itemStats.isDirectory() || (process.platform !== 'win32' && (itemStats.mode & parseInt('111', 8)) !== 0)
          },
          owner: 'unknown', // 需要额外获取
          group: 'unknown'
        }

        items.push(item)

      } catch (error) {
        logger.warn('http', `无法访问文件 ${fullPath}:`, error)
      }
    }

    // 排序：目录在前，然后按名称排序
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    res.json({
      success: true,
      message: '获取目录内容成功',
      data: {
        path: req.query.path || '/', // 返回原始请求的路径
        items
      }
    })

  } catch (error) {
    logger.warn('http', 'Directory access error:', error)

    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        message: '目录不存在',
      })
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      res.status(403).json({
        success: false,
        message: '没有权限访问该目录',
      })
    } else {
      res.status(500).json({
        success: false,
        message: '获取目录内容失败',
      })
    }
  }
}))

/**
 * 获取文件内容
 */
router.get('/content', asyncHandler(async (req, res) => {
  const { path: filePath, encoding = 'utf8' } = req.query

  // 验证路径参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确'
    })
  }

  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    }

    // 检查文件访问权限
    try {
      await fs.access(filePath, fs.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限读取该文件',
      })
    }

    // 检查文件大小，避免读取过大的文件
    if (stats.size > 10 * 1024 * 1024) { // 10MB
      return res.status(400).json({
        success: false,
        message: '文件过大，无法在线预览',
      })
    }

    const content = await fs.readFile(filePath, encoding)

    res.json({
      success: true,
      message: '获取文件内容成功',
      data: {
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        encoding
      }
    })

  } catch (error) {
    logger.error('http', 'File content access error:', error)

    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        message: '文件不存在',
      })
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      res.status(403).json({
        success: false,
        message: '没有权限访问该文件',
      })
    } else if (error.code === 'EISDIR') {
      res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    } else {
      res.status(500).json({
        success: false,
        message: '读取文件失败',
      })
    }
  }
}))

/**
 * 保存文件内容
 */
router.put('/content', asyncHandler(async (req, res) => {
  let { path: filePath, content = '', create = false, encoding = 'utf8'
  } = req.body

  // 验证输入参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath, create)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  try {
    // 检查父目录是否存在
    const parentDir = filePath.replace(/[^\/\\]*$/, '') // 去掉文件名部分，保留父目录
    try {
      const parentStats = await fs.stat(parentDir)
      if (!parentStats.isDirectory()) {
        return res.status(400).json({
          success: false,
          message: '父路径不是目录',
        })
      }
    } catch (parentError) {
      if (parentError.code === 'ENOENT') {
        return res.status(400).json({
          success: false,
          message: '父目录不存在',
        })
      }
    }

    // 如果文件已存在，检查是否为目录
    if (fsSync.existsSync(filePath) && fsSync.statSync(filePath).isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '已存在同名目录，无法保存文件',
      })
    }

    // 写入文件
    fsSync.writeFileSync(filePath, content, encoding)

    // 获取写入后的文件信息
    const stats = await fs.stat(filePath)

    res.json({
      success: true,
      message: '文件保存成功',
      data: {
        path: filePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        encoding
      }
    })

  } catch (error) {
    logger.error('http', 'File save error:', error)

    if (error.code === 'ENOENT') {
      res.status(400).json({
        success: false,
        message: '父目录不存在',
      })
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      res.status(403).json({
        success: false,
        message: '没有权限写入该文件',
      })
    } else if (error.code === 'EISDIR') {
      res.status(400).json({
        success: false,
        message: '指定路径是目录，无法写入文件',
      })
    } else {
      res.status(500).json({
        success: false,
        message: '保存文件失败: ' + error.message,
      })
    }
  }
}))

/**
 * 创建目录
 */
router.post('/directory', asyncHandler(async (req, res) => {
  const { path: parentPath, name } = req.body

  // 验证输入参数
  if (!parentPath || !name) {
    return res.status(400).json({
      success: false,
      message: '请提供父目录路径和目录名称'
    })
  }

  // 验证文件名
  if (!validateFileName(name)) {
    return res.status(400).json({
      success: false,
      message: '文件夹名称包含非法字符',
    })
  }

  // 转换路径为系统路径
  const systemParentPath = convertUnixPathToSystem(parentPath)
  const fullPath = path.join(systemParentPath, name)

  try {
    // 先检查目录是否已存在
    if (fsSync.existsSync(fullPath)) {
      const stats = fsSync.statSync(fullPath)
      if (stats.isDirectory()) {
        return res.status(409).json({
          success: false,
          message: '目录已存在',
        })
      } else {
        return res.status(409).json({
          success: false,
          message: '同名文件已存在',
        })
      }
    }

    // 创建目录（不使用 recursive，以便准确捕获错误）
    fsSync.mkdirSync(fullPath)

    res.status(201).json({
      success: true,
      message: '目录创建成功',
      data: {
        path: convertSystemPathToUnix(fullPath), // 返回 Unix 风格路径
        name
      }
    })

  } catch (error) {
    logger.error('创建目录失败:', error)
    if (error.code === 'EEXIST') {
      res.status(409).json({
        success: false,
        message: '目录已存在',
      })
    } else if (error.code === 'ENOENT') {
      res.status(400).json({
        success: false,
        message: '父目录不存在',
      })
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      res.status(403).json({
        success: false,
        message: '没有权限创建目录',
      })
    } else {
      res.status(500).json({
        success: false,
        message: '创建目录失败: ' + error.message,
      })
    }
  }
}))

/**
 * 删除文件或目录
 */
router.delete('/items', asyncHandler(async (req, res) => {
  const { paths } = req.body

  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供要删除的路径列表',
    })
  }

  const results = []

  for (const itemPath of paths) {
    try {
      const stats = await fs.stat(itemPath)

      if (stats.isDirectory()) {
        await fs.rmdir(itemPath, { recursive: true })
      } else {
        await fs.unlink(itemPath)
      }

      results.push({
        path: itemPath,
        success: true
      })

    } catch (error) {
      results.push({
        path: itemPath,
        success: false,
        error: error.message
      })
    }
  }

  res.json({
    success: true,
    message: '删除操作完成',
    data: results
  })
}))

/**
 * 文件上传
 */
router.post('/upload', (req, res, next) => {
  // 创建自定义的上传处理器，可以处理单个文件错误
  const uploadHandler = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        // 从query参数获取上传路径
        const uploadPath = req.query.path || '/tmp'
        const systemUploadPath = convertUnixPathToSystem(uploadPath)

        // 确保目标目录存在
        try {
          fsSync.mkdirSync(systemUploadPath, { recursive: true })
        } catch (error) {
          logger.error('http', '创建上传目录失败:', error)
          return cb(error)
        }

        cb(null, systemUploadPath)
      },
      filename: (req, file, cb) => {
        // 处理中文文件名编码问题
        let filename = file.originalname
        try {
          // 尝试修复编码问题
          filename = Buffer.from(file.originalname, 'latin1').toString('utf8')
        } catch (error) {
          // 如果转换失败，使用原始文件名
          logger.warn('http', '文件名编码转换失败，使用原始文件名:', file.originalname)
          filename = file.originalname
        }

        // 检查是否需要覆盖文件
        const overwrite = req.query.overwrite === 'true'
        const uploadPath = req.query.path || '/tmp'
        const targetPath = path.join(uploadPath, filename)
        const systemTargetPath = convertUnixPathToSystem(targetPath)

        if (!overwrite && fsSync.existsSync(systemTargetPath)) {
          // 记录失败的文件，但不阻止其他文件上传
          req.failedFiles = req.failedFiles || []
          req.failedFiles.push({
            filename: filename,
            error: `文件 "${filename}" 已存在，不允许覆盖`,
          })
          // 使用一个临时文件名，稍后会删除
          filename = `__SKIP__${Date.now()}_${filename}`
        }

        cb(null, filename)
      }
    })
  }).array('files')

  uploadHandler(req, res, (err) => {
    if (err) {
      logger.error('http', 'Multer错误:', err)
      return res.status(500).json({
        success: false,
        message: '文件上传失败: ' + err.message,
      })
    }

    // 继续处理
    next()
  })
}, asyncHandler(async (req, res) => {
  const uploadPath = req.query.path || '/tmp'
  const overwriteQuery = req.query.overwrite === 'true'
  const overwriteBody = req.body.overwrite === 'true' || req.body.overwrite === true
  const shouldOverwrite = overwriteQuery || overwriteBody
  const files = req.files || []
  const failedFiles = req.failedFiles || []

  logger.info('http', '开始处理文件上传:', {
    uploadPath,
    shouldOverwrite,
    fileCount: files.length,
    failedCount: failedFiles.length,
    files: files.map(f => ({
      name: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
      path: f.path,
      filename: f.filename
    })),
    failedFiles
  })

  const results = []
  const uploadedFiles = []
  const allFailedFiles = [...failedFiles]

  // 处理成功上传的文件
  for (const file of files) {
    // 跳过标记为失败的文件
    if (file.filename.startsWith('__SKIP__')) {
      // 删除临时文件
      try {
        if (fsSync.existsSync(file.path)) {
          fsSync.unlinkSync(file.path)
        }
      } catch (error) {
        logger.warn('删除临时文件失败:', error.message)
      }
      continue
    }

    logger.info('http', '处理文件:', {
      原始文件名: file.originalname,
      保存路径: file.path,
      文件名: file.filename,
      文件大小: file.size,
      MIME类型: file.mimetype
    })

    try {
      // 验证文件是否成功保存
      const stats = await fs.stat(file.path)

      // 转换路径为Unix风格
      const unixPath = convertSystemPathToUnix(file.path)

      const uploadedFile = {
        name: file.filename,
        path: unixPath,
        size: stats.size,
        mimeType: file.mimetype
      }

      uploadedFiles.push(uploadedFile)
      results.push({
        filename: file.filename,
        path: unixPath,
        size: stats.size,
        success: true
      })

      // 控制台输出成功信息
      logger.info(`✅ 文件上传成功: ${file.originalname} (${stats.size} bytes)`);
    } catch (error) {
      // 记录错误信息
      logger.error('file-error', '文件处理失败', {
        文件名: file.originalname,
        错误信息: error.message,
        错误堆栈: error.stack
      })
      allFailedFiles.push({
        filename: file.originalname,
        error: error.message,
      })

      // 尝试删除失败的文件
      try {
        if (file.path && fsSync.existsSync(file.path)) {
          fsSync.unlinkSync(file.path)
        }
      } catch (unlinkError) {
        logger.warn('http', '删除失败文件失败:', unlinkError.message)
      }
    }
  }

  // 为失败的文件添加结果记录
  for (const failed of allFailedFiles) {
    results.push({
      filename: failed.filename,
      success: false,
      error: failed.error,
    })
  }

  const successCount = uploadedFiles.length
  const failureCount = allFailedFiles.length
  const totalCount = successCount + failureCount

  // 检查是否没有文件被处理
  if (totalCount === 0) {
    return res.status(400).json({
      success: false,
      message: '没有上传文件',
    })
  }

  const response = {
    success: true,
    message: `文件上传完成: ${successCount}/${totalCount} 成功${failureCount > 0 ? `, ${failureCount} 个文件失败` : ''}`,
    data: {
      uploadedFiles,
      failed: allFailedFiles,
      summary: {
        total: totalCount,
        success: successCount,
        failed: failureCount
      },
      results
    }
  }

  // 记录最终上传结果
  logger.info('file-upload-summary', '文件上传结果汇总', {
    总文件数: totalCount,
    成功: successCount,
    失败: failureCount,
    完成时间: new Date().toLocaleString(),
    成功文件列表: uploadedFiles.map(f => ({ name: f.name, size: f.size })),
    失败文件列表: allFailedFiles.map(f => ({ filename: f.filename, error: f.error }))
  })

  if (successCount > 0) {
    logger.info('file-upload-success', '成功上传的文件', {
      count: successCount,
      files: uploadedFiles.map((file, index) => `${index + 1}. ${file.name} - ${file.size} bytes`)
    })
  }

  if (failureCount > 0) {
    logger.warn('file-upload-failed', '失败的文件', {
      count: failureCount,
      files: allFailedFiles.map((file, index) => `${index + 1}. ${file.filename} - ${file.error}`)
    })
  }

  logger.info('file-summary', '文件上传结果汇总', {
    总数: totalCount,
    成功: successCount,
    失败: failureCount,
    成功文件: uploadedFiles.map(f => f.name),
    失败文件: allFailedFiles.map(f => ({ name: f.filename, error: f.error }))
  })
  logger.info('上传结果:', response)
  res.json(response)
}))

/**
 * 文件下载
 */
router.get('/download', asyncHandler(async (req, res) => {
  const { path: filePath } = req.query

  logger.log('下载请求路径:', filePath)
  logger.log('路径验证结果:', validateFilePath(filePath))

  if (!validateFilePath(filePath)) {
    logger.log('路径验证失败:', filePath)
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  try {
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '不能直接下载目录',
      })
    }

    const filename = path.basename(filePath)
    const mimeType = mime.lookup(filePath) || 'application/octet-stream'

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', stats.size)

    const fileStream = fsSync.createReadStream(filePath)
    fileStream.pipe(res)

  } catch (error) {
    logger.error('下载文件时出错:', error)
    res.status(404).json({
      success: false,
      message: '文件不存在或无法访问',
    })
  }
}))

/**
 * 清除上传进度
 */
router.delete('/upload-progress/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: '请提供会话ID',
    })
  }

  uploadProgress.delete(sessionId)

  res.json({
    success: true,
    message: '上传进度已清除',
  })
}))

/**
 * 批量下载文件（压缩为zip）
 */
router.post('/batch-download', asyncHandler(async (req, res) => {
  const { paths, fileName } = req.body

  logger.log('批量下载请求:', { paths, fileName })

  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供要下载的文件路径列表',
    })
  }

  // 验证所有路径
  for (const filePath of paths) {
    if (!validateFilePath(filePath)) {
      logger.log('路径验证失败:', filePath)
      return res.status(400).json({
        success: false,
        message: `文件路径格式不正确: ${filePath}`,
      })
    }
  }

  try {
    const zipFileName = fileName || `download_${Date.now()}.zip`
    logger.log('开始创建压缩包:', zipFileName)

    // 设置响应头
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`)

    // 创建zip压缩流
    const archive = archiver('zip', {
      zlib: { level: 9 } // 压缩级别
    })

    // 监听压缩流错误
    archive.on('error', (err) => {
      logger.error('压缩文件时出错:', err)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '压缩文件时出错',
        })
      }
    })

    // 监听压缩完成事件
    archive.on('end', () => {
      logger.log('压缩完成，总大小:', archive.pointer() + ' bytes')
    })

    // 将压缩流管道到响应
    archive.pipe(res)

    // 添加文件和文件夹到压缩包
    for (const filePath of paths) {
      try {
        logger.log('处理路径:', filePath)
        const stats = await fs.stat(filePath)
        const fileName = path.basename(filePath)

        if (stats.isDirectory()) {
          // 添加整个目录
          logger.log('添加目录:', fileName)
          archive.directory(filePath, fileName)
        } else if (stats.isFile()) {
          // 添加单个文件
          logger.log('添加文件:', fileName)
          archive.file(filePath, { name: fileName })
        }
      } catch (error) {
        logger.warn(`跳过无法访问的文件: ${filePath}`, error)
      }
    }

    // 完成压缩
    logger.log('开始finalize压缩包')
    await archive.finalize()
    logger.log('压缩包finalize完成')

  } catch (error) {
    logger.error('批量下载失败:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '批量下载失败',
      })
    }
  }
}))

/**
 * 获取文件行数信息
 */
router.get('/lines-info', asyncHandler(async (req, res) => {
  const { path: filePath } = req.query

  // 验证路径参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    }

    // 检查文件访问权限
    try {
      await fs.access(filePath, fsSync.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限读取该文件',
      })
    }

    // 构建行偏移量映射
    const offsets = await buildLineOffsets(filePath)
    const totalLines = offsets.length
    const fileSize = stats.size

    // 记录审计日志
    logAuditEvent(req.user?.id || 'system', 'file_lines_info', {
      path: filePath,
      totalLines,
      fileSize
    })

    res.json({
      success: true,
      data: {
        totalLines,
        fileSize,
        path: filePath,
        cacheCreated: true
      }
    })

  } catch (error) {
    console.error('获取文件行信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件行信息失败',
      error: error.message
    })
  }
}))

/**
 * 流式读取文件内容
 */
router.get('/stream', asyncHandler(async (req, res) => {
  const { path: filePath, offset = 0, length = 8192, encoding = 'utf8' } = req.query

  // 验证路径参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  const offsetNum = parseInt(offset, 10)
  const lengthNum = parseInt(length, 10)

  if (isNaN(offsetNum) || offsetNum < 0) {
    return res.status(400).json({
      success: false,
      message: '偏移量参数无效',
    })
  }

  if (isNaN(lengthNum) || lengthNum <= 0 || lengthNum > 1024 * 1024) { // 最大1MB
    return res.status(400).json({
      success: false,
      message: '长度参数无效（最大1MB）',
    })
  }

  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    }

    // 检查文件访问权限
    try {
      await fs.access(filePath, fsSync.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限读取该文件',
      })
    }

    const fileSize = stats.size
    const actualOffset = Math.min(offsetNum, fileSize)
    const actualLength = Math.min(lengthNum, fileSize - actualOffset)
    const eof = actualOffset + actualLength >= fileSize

    // 如果已经到文件末尾
    if (actualOffset >= fileSize) {
      return res.json({
        success: true,
        data: {
          content: '',
          offset: actualOffset,
          length: 0,
          totalSize: fileSize,
          eof: true,
          encoding
        }
      })
    }

    // 读取指定范围的文件内容
    const fileHandle = await fs.open(filePath, 'r')
    const buffer = Buffer.alloc(actualLength)
    const { bytesRead } = await fileHandle.read(buffer, 0, actualLength, actualOffset)
    await fileHandle.close()

    const content = buffer.toString(encoding, 0, bytesRead)

    // 预处理内容：按行分割并计算行数
    const lines = content.split('\n')

    // 如果不是从文件开头读取，第一行可能是不完整的
    let processedLines = lines
    if (actualOffset > 0 && lines.length > 0) {
      // 移除第一行不完整的内容
      processedLines = lines.slice(1)
    }

    // 过滤掉空行并处理行数据
    const validLines = processedLines
      .map((line, index) => ({
        content: line.trim(),
        lineNumber: actualOffset > 0 ? null : index + 1, // 如果不是从头开始，行号由前端计算
        type: detectLogLevel(line.trim())
      }))
      .filter(line => line.content)

    // 记录审计日志
    logAuditEvent(req.user?.id || 'system', 'file_stream_read', {
      path: filePath,
      offset: actualOffset,
      length: bytesRead,
      linesCount: validLines.length
    })

    res.json({
      success: true,
      data: {
        content,
        lines: validLines, // 新增：预处理的行数据
        linesCount: validLines.length, // 新增：行数
        offset: actualOffset,
        length: bytesRead,
        totalSize: fileSize,
        eof,
        encoding
      }
    })

  } catch (error) {
    console.error('流式读取文件失败:', error)
    res.status(500).json({
      success: false,
      message: '流式读取文件失败',
      error: error.message
    })
  }
}))

/**
 * 获取文件基本信息
 */
router.get('/info', asyncHandler(async (req, res) => {
  const { path: filePath } = req.query

  // 验证路径参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    }

    // 检查文件访问权限
    try {
      await fs.access(filePath, fsSync.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限读取该文件',
      })
    }

    const fileName = path.basename(filePath)
    const mimeType = mime.lookup(fileName) || 'application/octet-stream'

    res.json({
      success: true,
      data: {
        name: fileName,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        mimeType,
        encoding: 'utf8'
      }
    })

  } catch (error) {
    console.error('获取文件信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件信息失败',
      error: error.message
    })
  }
}))

// 文件行偏移量缓存（内存存储，5分钟后自动清理）
const lineOffsetCache = new Map()
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5分钟
const CACHE_ACCESS_TIMEOUT = 5 * 60 * 1000 // 5分钟

/**
 * 清理过期的行偏移量缓存
 */
const cleanupLineOffsetCache = () => {
  const now = Date.now()
  for (const [key, value] of lineOffsetCache.entries()) {
    if (now - value.lastAccess > CACHE_ACCESS_TIMEOUT) {
      lineOffsetCache.delete(key)
      console.log(`清理过期的行偏移量缓存: ${key}`)
    }
  }
}

// 定期清理缓存
setInterval(cleanupLineOffsetCache, CACHE_CLEANUP_INTERVAL)

/**
 * 构建文件行偏移量映射
 * @param {string} filePath 文件路径
 * @returns {Promise<Array>} 行偏移量数组
 */
const buildLineOffsets = async (filePath) => {
  const cacheKey = filePath
  const now = Date.now()
  
  // 检查缓存
  if (lineOffsetCache.has(cacheKey)) {
    const cached = lineOffsetCache.get(cacheKey)
    cached.lastAccess = now
    return cached.offsets
  }

  const stats = await fs.stat(filePath)
  const fileSize = stats.size
  const fileHandle = await fs.open(filePath, 'r')
  
  const offsets = [0] // 第一行从位置0开始
  const bufferSize = 64 * 1024 // 64KB buffer
  let position = 0
  let incompleteChar = Buffer.alloc(0) // 用于处理跨buffer的UTF-8字符
  
  try {
    while (position < fileSize) {
      const remainingBytes = fileSize - position
      const bytesToRead = Math.min(bufferSize, remainingBytes)
      
      const buffer = Buffer.alloc(bytesToRead)
      const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, position)
      
      if (bytesRead === 0) break
      
      // 合并上次未完成的字符和当前读取的内容
      const fullBuffer = Buffer.concat([incompleteChar, buffer.slice(0, bytesRead)])
      
      // 使用安全的UTF-8边界检测
      const validEnd = findSafeUtf8Boundary(fullBuffer)
      const content = fullBuffer.toString('utf8', 0, validEnd)
      
      // 保存未完成的字符到下一次处理
      incompleteChar = fullBuffer.slice(validEnd)
      
      // 查找换行符位置
      const contentBuffer = fullBuffer.slice(0, validEnd)
      for (let i = 0; i < validEnd; i++) {
        if (contentBuffer[i] === 0x0A) { // '\n' 的ASCII值
          const absolutePosition = position + i + 1
          if (absolutePosition < fileSize) {
            offsets.push(absolutePosition)
          }
        }
      }
      
      position += validEnd - incompleteChar.length
    }
    
    // 处理最后可能剩余的不完整字符
    if (incompleteChar.length > 0) {
      try {
        const remainingContent = incompleteChar.toString('utf8')
        for (let i = 0; i < remainingContent.length; i++) {
          if (remainingContent[i] === '\n') {
            const absolutePosition = position + i + 1
            if (absolutePosition <= fileSize) {
              offsets.push(absolutePosition)
            }
          }
        }
      } catch (e) {
        console.warn('处理文件末尾UTF-8字符时出现问题:', e.message)
      }
    }
  } finally {
    await fileHandle.close()
  }
  
  // 缓存结果
  lineOffsetCache.set(cacheKey, {
    offsets,
    totalLines: offsets.length,
    fileSize,
    lastAccess: now,
    createdAt: now
  })
  
  console.log(`构建行偏移量映射完成: ${filePath}, 总行数: ${offsets.length}`)
  return offsets
}

/**
 * 检测UTF-8字符边界，确保不在多字节字符中间截断
 * @param {Buffer} buffer 缓冲区
 * @param {number} maxLength 最大长度
 * @returns {number} 安全的截断位置
 */
const findSafeUtf8Boundary = (buffer, maxLength = buffer.length) => {
  let safeEnd = Math.min(maxLength, buffer.length)
  
  // 从后往前检查，确保不在UTF-8字符中间截断
  for (let i = safeEnd - 1; i >= Math.max(0, safeEnd - 4); i--) {
    const byte = buffer[i]
    
    // 检查是否是UTF-8字符的开始字节
    if ((byte & 0x80) === 0) {
      // ASCII字符 (0xxxxxxx)
      return i + 1
    } else if ((byte & 0xE0) === 0xC0) {
      // 2字节UTF-8字符的开始 (110xxxxx)
      return safeEnd >= i + 2 ? safeEnd : i
    } else if ((byte & 0xF0) === 0xE0) {
      // 3字节UTF-8字符的开始 (1110xxxx)
      return safeEnd >= i + 3 ? safeEnd : i
    } else if ((byte & 0xF8) === 0xF0) {
      // 4字节UTF-8字符的开始 (11110xxx)
      return safeEnd >= i + 4 ? safeEnd : i
    }
  }
  
  return safeEnd
}

/**
 * 获取文件行信息并构建偏移量映射
 */
router.get('/lines-info', asyncHandler(async (req, res) => {
  const { path: filePath } = req.query

  // 验证路径参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    }

    // 检查文件访问权限
    try {
      await fs.access(filePath, fsSync.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限读取该文件',
      })
    }

    // 构建行偏移量映射
    const offsets = await buildLineOffsets(filePath)
    const totalLines = offsets.length
    const fileSize = stats.size

    // 记录审计日志
    logAuditEvent(req.user?.id || 'system', 'file_lines_info', {
      path: filePath,
      totalLines,
      fileSize
    })

    res.json({
      success: true,
      data: {
        totalLines,
        fileSize,
        path: filePath,
        cacheCreated: true
      }
    })

  } catch (error) {
    console.error('获取文件行信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件行信息失败',
      error: error.message
    })
  }
}))

/**
 * 按行获取文件内容
 */
router.get('/lines', asyncHandler(async (req, res) => {
  const { path: filePath, startLine, lineCount, encoding = 'utf8' } = req.query

  // 验证路径参数
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: '请提供文件路径参数',
    })
  }

  if (!validateFilePath(filePath)) {
    return res.status(400).json({
      success: false,
      message: '文件路径格式不正确',
    })
  }

  const startLineNum = parseInt(startLine, 10)
  const lineCountNum = parseInt(lineCount, 10)

  if (isNaN(startLineNum) || startLineNum < 1) {
    return res.status(400).json({
      success: false,
      message: '起始行号参数无效',
    })
  }

  if (isNaN(lineCountNum) || lineCountNum <= 0 || lineCountNum > 50) {
    return res.status(400).json({
      success: false,
      message: '行数参数无效（最大50行）',
    })
  }

  try {
    // 检查文件是否存在
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: '指定路径是目录，不是文件',
      })
    }

    // 检查文件访问权限
    try {
      await fs.access(filePath, fsSync.constants.R_OK)
    } catch (accessError) {
      return res.status(403).json({
        success: false,
        message: '没有权限读取该文件',
      })
    }

    // 获取或构建行偏移量映射
    const cacheKey = filePath
    let offsets
    
    if (lineOffsetCache.has(cacheKey)) {
      const cached = lineOffsetCache.get(cacheKey)
      cached.lastAccess = Date.now()
      offsets = cached.offsets
    } else {
      // 如果缓存不存在，重新构建
      offsets = await buildLineOffsets(filePath)
    }

    const totalLines = offsets.length
    const endLineNum = Math.min(startLineNum + lineCountNum - 1, totalLines)

    if (startLineNum > totalLines) {
      return res.json({
        success: true,
        data: {
          lines: [],
          startLine: startLineNum,
          actualLineCount: 0,
          totalLines,
          message: '起始行号超出文件总行数'
        }
      })
    }

    // 计算读取范围
    const startOffset = offsets[startLineNum - 1] // 数组索引从0开始，行号从1开始
    let endOffset
    
    if (endLineNum < totalLines) {
      endOffset = offsets[endLineNum] - 1 // 读取到下一行的前一个字节
    } else {
      endOffset = stats.size // 读取到文件末尾
    }

    const readLength = endOffset - startOffset

    // 读取指定范围的文件内容
    const fileHandle = await fs.open(filePath, 'r')
    
    // 为了避免UTF-8字符截断，我们读取稍微多一点的内容
    const extraBytes = 4 // UTF-8字符最多4字节
    const safeReadLength = Math.min(readLength + extraBytes, stats.size - startOffset)
    
    const buffer = Buffer.alloc(safeReadLength)
    const { bytesRead } = await fileHandle.read(buffer, 0, safeReadLength, startOffset)
    await fileHandle.close()

    // 安全地处理UTF-8解码
    let content = ''
    
    if (bytesRead > 0) {
      // 使用安全的UTF-8边界检测
      const safeEnd = findSafeUtf8Boundary(buffer, Math.min(readLength, bytesRead))
      content = buffer.toString(encoding, 0, safeEnd)
      
      // 如果仍然有问题，移除任何替换字符
      content = content.replace(/\uFFFD/g, '')
    }
    
    // 确保内容在正确的行边界处截断
    const lines = content.split('\n')
    
    // 如果读取了额外的内容，需要截断到正确的行数
    const actualLineCount = Math.min(lineCountNum, endLineNum - startLineNum + 1)
    const finalLines = lines.slice(0, actualLineCount)

    // 处理读取的行数据
    const processedLines = finalLines
      .slice(0, lineCountNum) // 确保不超过请求的行数
      .map((line, index) => ({
        lineNumber: startLineNum + index,
        content: line || '', // 确保content不为undefined，空行保持为空字符串
        type: detectLogLevel(line || '')
      }))
      .filter((line, index) => {
        // 保留所有行，包括空行，但排除最后可能的不完整行
        if (index >= actualLineCount) return false
        return true
      })

    // 记录审计日志
    logAuditEvent(req.user?.id || 'system', 'file_lines_read', {
      path: filePath,
      startLine: startLineNum,
      lineCount: processedLines.length,
      requestedLineCount: lineCountNum
    })

    res.json({
      success: true,
      data: {
        lines: processedLines,
        startLine: startLineNum,
        actualLineCount: processedLines.length,
        requestedLineCount: lineCountNum,
        totalLines,
        hasMore: endLineNum < totalLines
      }
    })

  } catch (error) {
    console.error('按行读取文件失败:', error)
    res.status(500).json({
      success: false,
      message: '按行读取文件失败',
      error: error.message
    })
  }
}))

export default router;
