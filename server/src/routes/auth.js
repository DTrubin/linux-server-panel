import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// logger现在是全局变量，无需导入
import { userDAO, auditLogDAO } from '../database/dao.js';
import { logAuditEvent } from '../middleware/auditLogger.js';
import ImageProcessor from '../utils/imageProcessor.js';
import e from 'cors';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 配置头像上传的 multer
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/avatars/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 直接使用用户名作为文件名
    const filename = `${req.user.username}.webp`;
    cb(null, filename);
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'));
    }
  }
});

// 登录路由
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      logger.warn('auth', '登录失败: 缺少用户名或密码', { username });
      return res.status(400).json({
        success: false,
        error: '用户名或密码缺失',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // 查找用户
    const user = await userDAO.findOne({ username });
    if (!user) {
      logger.warn('auth', '登录失败: 用户不存在', { username });

      // 记录登录失败的审计日志
      await logAuditEvent(
        'anonymous',
        'USER_LOGIN_FAILED',
        'auth',
        {
          username: username,
          reason: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString()
        },
        'warning',
        req
      );

      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('auth', '登录失败: 密码错误', { username });
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        permissions: user.permissions || []
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('用户登录成功', { username, userId: user.id });

    // 记录审计日志
    await logAuditEvent(
      user.id,
      'USER_LOGIN_SUCCESS',
      'auth',
      {
        username: user.username,
        loginTime: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        rememberMe: req.body.rememberMe || false
      },
      'info',
      req
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        accessToken: token,
        expiresIn: 24 * 60 * 60, // 24小时
        rememberMe: req.body.rememberMe ? true : false, // 是否记住登录状态
        user: {
          id: user.id,
          username: user.username,
          email: user.email || null,
          phone: user.phone || null,
        }
      }
    });
  } catch (error) {
    logger.error('auth', '登录处理错误', error);

    res.status(500).json({
      success: false,
      message: '登录服务异常',
    });
  }
});

// 登出路由
router.post('/logout', async (req, res) => {
  const userId = req.user?.id;
  const username = req.user?.username;

  logger.info('用户登出', { userId, username });

  // 记录登出审计日志
  if (userId) {
    await logAuditEvent(
      userId,
      'USER_LOGOUT',
      'auth',
      {
        username: username,
        logoutTime: new Date().toISOString()
      },
      'info',
      req
    );
  }

  res.json({
    success: true,
    message: '登出成功'
  });
});

// 刷新Token路由
router.post('/refresh', async (req, res) => {
  try {
    // 从请求体或Authorization头获取当前token
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];

    if (!currentToken) {
      return res.status(401).json({
        success: false,
        error: '刷新令牌缺失',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // 验证当前token（即使过期也要能解析用户信息）
    let decoded;
    try {
      decoded = jwt.verify(currentToken, JWT_SECRET);
    } catch (error) {
      // 如果token过期，尝试解析但忽略过期错误
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(currentToken);
      } else {
        return res.status(401).json({
          success: false,
          message: '刷新令牌无效',
        });
      }
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: '刷新令牌格式错误',
        code: 'MALFORMED_REFRESH_TOKEN'
      });
    }

    // 验证用户是否仍然存在且有效
    const user = await userDAO.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    // 生成新的访问令牌
    const newToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        permissions: user.permissions || []
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('Token刷新成功', {
      userId: user.id,
      username: user.username
    });

    res.json({
      success: true,
      message: 'Token刷新成功',
      data: {
        accessToken: newToken,
        expiresIn: 24 * 60 * 60, // 24小时
        user: {
          id: user.id,
          username: user.username,
          email: user.email || null,
          phone: user.phone || null,
        }
      }
    });
  } catch (error) {
    logger.error('auth', 'Token刷新错误', error);

    res.status(500).json({
      success: false,
      message: 'Token刷新失败',
    });
  }
});

// 获取当前用户信息
router.get('/userinfo', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const user = await userDAO.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email || '',
      phone: user.phone || '',
      nickname: user.nickname || user.username,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || new Date().toISOString(),
      status: user.status || 'active'
    };

    logger.info('返回用户信息', {
      userId: user.id,
      username: user.username
    });

    res.json({
      success: true,
      message: '获取用户信息成功',
      data: userData
    });
  } catch (error) {
    logger.error('auth', '获取用户信息错误', error);

    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
});

// 更新用户信息
router.put('/userinfo', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
    }

    console.log('更新用户信息 - req.user:', req.user);
    console.log('更新用户信息 - req.body:', req.body);

    const { username, email, phone, nickname } = req.body;
    const userId = req.user.id;

    console.log('更新用户信息 - userId:', userId);

    // 验证数据
    if (username && (username.length < 3 || username.length > 20)) {
      return res.status(400).json({
        success: false,
        error: '用户名长度应在3-20个字符之间',
        code: 'INVALID_USERNAME'
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: '邮箱格式不正确',
        code: 'INVALID_EMAIL'
      });
    }

    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: '手机号格式不正确',
        code: 'INVALID_PHONE'
      });
    }

    // 检查用户名是否已存在（如果要修改用户名）
    if (username) {
      const existingUser = await userDAO.findOne({ username });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          error: '用户名已存在',
          code: 'USERNAME_EXISTS'
        });
      }
    }

    // 更新用户信息
    const updateData = {};
    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (nickname !== undefined) updateData.nickname = nickname;
    updateData.updatedAt = new Date().toISOString();

    logger.log('更新用户信息 - updateData:', updateData);

    const updatedUser = await userDAO.update(userId, updateData);

    logger.log('更新用户信息 - updatedUser:', updatedUser);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    logger.info('用户信息更新成功', { userId, updateData });

    res.json({
      success: true,
      message: '用户信息更新成功',
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        nickname: updatedUser.nickname || updatedUser.username,
        createdAt: updatedUser.createdAt || new Date().toISOString(),
        lastLoginAt: updatedUser.lastLoginAt || new Date().toISOString(),
        status: updatedUser.status || 'active'
      }
    });
  } catch (error) {
    logger.error('auth', '更新用户信息错误', error);

    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
    });
  }
});

// 修改密码
router.post('/change-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 验证数据
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6个字符'
      });
    }

    // 获取用户信息
    const user = await userDAO.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码不正确'
      });
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await userDAO.update(userId, {
      password: hashedNewPassword,
      updatedAt: new Date().toISOString()
    });

    logger.info('用户密码修改成功', { userId });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    logger.error('auth', '修改密码错误', error);

    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
});

// 上传头像
router.post('/upload-avatar', (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      logger.error('auth', 'Multer上传错误', {
        error: err.message,
        userId: req.user?.id
      });

      return res.status(400).json({
        success: false,
        message: err.message || '文件上传失败',
        code: 'UPLOAD_ERROR'
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件',
        code: 'NO_FILE_UPLOADED'
      });
    }

    const userId = req.user.id;
    const username = req.user.username;
    const finalAvatarPath = req.file.path; // 文件已经按照用户名保存在正确位置

    // 获取文件信息
    const stats = fs.statSync(finalAvatarPath);
    const fileSizeKB = Math.round(stats.size / 1024);

    logger.info('头像文件已上传成功', {
      userId,
      username,
      filePath: finalAvatarPath,
      fileSize: fileSizeKB
    });

    res.json({
      success: true,
      message: '头像上传成功',
      data: {
        fileSize: fileSizeKB,
        filename: `${username}.webp`,
        processedBy: 'frontend'
      }
    });

  } catch (error) {
    logger.error('auth', '上传头像错误', {
      error: error.message,
      userId: req.user?.id,
      username: req.user?.username
    });

    res.status(500).json({
      success: false,
      message: error.message || '上传头像失败',
      code: 'UPLOAD_PROCESS_ERROR'
    });
  }
});

// 获取用户头像（Base64格式）
router.get('/avatar', async (req, res) => {
  try {
    // 如果没有指定用户名，使用当前登录用户
    let username = req.query.username;
    if (!username) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '用户未认证',
          code: 'NOT_AUTHENTICATED'
        });
      }
      username = req.user.username;
    }

    // 查找头像文件（优先查找 WebP 格式）
    const avatarDir = 'uploads/avatars/';
    let avatarFilePath = null;
    let mimeType = 'image/webp'; // 默认 MIME 类型

    // 首先查找 WebP 格式头像
    const webpAvatarPath = path.join(avatarDir, `${username}.webp`);
    if (fs.existsSync(webpAvatarPath)) {
      avatarFilePath = webpAvatarPath;
      mimeType = 'image/webp';
    } else {
      // 如果没有 WebP 版本，查找其他格式（兼容旧版本）
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      for (const ext of supportedExtensions) {
        const testPath = path.join(avatarDir, `${username}${ext}`);
        if (fs.existsSync(testPath)) {
          avatarFilePath = testPath;
          // 根据扩展名确定 MIME 类型
          switch (ext) {
            case '.jpg':
            case '.jpeg':
              mimeType = 'image/jpeg';
              break;
            case '.png':
              mimeType = 'image/png';
              break;
            case '.gif':
              mimeType = 'image/gif';
              break;
          }
          break;
        }
      }
    }

    let base64Image;
    if (avatarFilePath && fs.existsSync(avatarFilePath)) {
      // 读取用户头像文件
      const imageBuffer = fs.readFileSync(avatarFilePath);
      base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

      logger.info('获取用户头像成功', {
        username,
        filePath: avatarFilePath,
        size: imageBuffer.length
      });
    } else {
      // 如果没有头像文件，返回默认头像
      const defaultAvatarPath = path.join('uploads', 'default-avatar.png');
      if (fs.existsSync(defaultAvatarPath)) {
        const defaultBuffer = fs.readFileSync(defaultAvatarPath);
        base64Image = `data:image/png;base64,${defaultBuffer.toString('base64')}`;
      } else {
        // 如果连默认头像都没有，生成一个简单的 SVG 头像
        const svgAvatar = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="50" fill="#e0e0e0"/>
          <circle cx="50" cy="35" r="15" fill="#999"/>
          <circle cx="50" cy="75" r="25" fill="#999"/>
        </svg>`;
        const svgBuffer = Buffer.from(svgAvatar);
        base64Image = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
      }

      logger.info('返回默认头像', { username });
    }

    res.json({
      success: true,
      message: '获取头像成功',
      data: {
        avatar: base64Image,
        username: username
      }
    });
  } catch (error) {
    logger.error('auth', '获取头像错误', error);

    res.status(500).json({
      success: false,
      message: '获取头像失败',
    });
  }
});

// 获取用户头像缩略图（Base64格式）
router.get('/avatar/thumbnail', async (req, res) => {
  try {
    // 如果没有指定用户名，使用当前登录用户
    let username = req.query.username;
    if (!username) {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '用户未认证',
          code: 'NOT_AUTHENTICATED'
        });
      }
      username = req.user.username;
    }

    // 查找缩略图文件（WebP 格式）
    const avatarDir = 'uploads/avatars/';
    const thumbnailPath = path.join(avatarDir, `${username}_thumb.webp`);

    let base64Image;
    if (fs.existsSync(thumbnailPath)) {
      // 读取缩略图文件
      const imageBuffer = fs.readFileSync(thumbnailPath);
      base64Image = `data:image/webp;base64,${imageBuffer.toString('base64')}`;

      logger.info('获取用户头像缩略图成功', {
        username,
        filePath: thumbnailPath,
        size: imageBuffer.length
      });
    } else {
      // 如果没有缩略图，尝试查找旧格式的缩略图
      const oldThumbnailPath = path.join(avatarDir, `${username}_thumb.jpg`);
      if (fs.existsSync(oldThumbnailPath)) {
        const imageBuffer = fs.readFileSync(oldThumbnailPath);
        base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      } else {
        // 生成默认缩略图 SVG
        const defaultThumbnailSvg = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#e0e0e0"/>
          <circle cx="32" cy="22" r="10" fill="#999"/>
          <circle cx="32" cy="48" r="16" fill="#999"/>
        </svg>`;

        const svgBuffer = Buffer.from(defaultThumbnailSvg);
        base64Image = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
      }
    }

    res.json({
      success: true,
      data: {
        avatar: base64Image,
        username: username
      }
    });
  } catch (error) {
    logger.error('auth', '获取头像缩略图错误', error);

    res.status(500).json({
      success: false,
      message: '获取头像缩略图失败',
    });
  }
});

// 批量转换现有头像为 WebP 格式 (管理员功能)
router.post('/convert-avatars-to-webp', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // 这里可以添加管理员权限检查
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: '权限不足',
    //     code: 'INSUFFICIENT_PERMISSIONS'
    //   });
    // }

    logger.info('开始批量转换头像为 WebP 格式', {
      operatorId: req.user.id,
      operatorUsername: req.user.username
    });

    const results = await ImageProcessor.convertExistingAvatarsToWebP();

    logger.info('批量转换头像完成', {
      operatorId: req.user.id,
      operatorUsername: req.user.username,
      converted: results.converted,
      failed: results.failed,
      errors: results.errors
    });

    res.json({
      success: true,
      message: '头像格式转换完成',
      data: {
        converted: results.converted,
        failed: results.failed,
        errors: results.errors
      }
    });

  } catch (error) {
    logger.error('auth', '批量转换头像错误', {
      error: error.message,
      operatorId: req.user?.id,
      operatorUsername: req.user?.username
    });

    res.status(500).json({
      success: false,
      message: '批量转换头像失败',
      error: error.message
    });
  }
});

// 检查Token有效性
router.get('/check', (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      message: 'Token有效',
      data: {
        userId: req.user.id,
        username: req.user.username
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Token无效或已过期',
    });
  }
});

export default router;
