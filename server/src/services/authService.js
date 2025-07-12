// logger现在是全局变量，无需导入
import jwt from 'jsonwebtoken';
import UserDAO from '../daos/UserDAO';

// Auth 服务逻辑
// 登录
export const login = (credentials) => {
  const { username, password } = credentials;

  // 验证必填字段
  if (!username || !password) {
    logger.warn('登录失败: 缺少用户名或密码', { username });
    throw { status: 400, error: '用户名或密码缺失', code: 'MISSING_CREDENTIALS' };
  }

  // 模拟用户验证
  if (username === 'admin' && password === 'password123') {
    const token = generateAccessToken('admin-id');
    logger.info('用户登录成功', { username });
    return { success: true, token };
  } else {
    logger.warn('登录失败: 无效的用户名或密码', { username });
    throw { status: 401, error: '用户名或密码错误', code: 'INVALID_CREDENTIALS' };
  }
};

// 用户登出逻辑
export const logout = (userId) => {
  logger.info('用户登出成功', { userId });
  return { success: true };
};

// 获取用户信息逻辑
export const getUserInfo = (userId) => {
  // 模拟用户信息
  const mockUser = {
    id: userId,
    name: 'Mock User',
    email: 'mockuser@example.com'
  };

  logger.info('获取用户信息成功', { userId });
  return { success: true, user: mockUser };
};

// 刷新Token逻辑
export const refreshToken = (refreshToken) => {
  if (!refreshToken) {
    throw { status: 400, error: '刷新令牌缺失', code: 'MISSING_REFRESH_TOKEN' };
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(decoded.userId);
    return { success: true, token: newAccessToken };
  } catch (error) {
    throw { status: 401, error: '无效的刷新令牌', code: 'INVALID_REFRESH_TOKEN' };
  }
};

// 检查Token逻辑
export const checkToken = (token) => {
  if (!token) {
    return { success: false, message: 'Token缺失' };
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return { success: true };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { success: false, message: 'Token已过期' };
    }
    return { success: false, message: '无效的Token' };
  }
};

// 用户注册逻辑
export const register = (userData) => {
  const { username, password, confirmPassword, email } = userData;

  // 验证必填字段
  if (!username || !password || !confirmPassword || !email) {
    throw { status: 400, error: '必填字段缺失', code: 'MISSING_CREDENTIALS' };
  }

  // 验证密码匹配
  if (password !== confirmPassword) {
    throw { status: 400, error: '密码不匹配', code: 'PASSWORD_MISMATCH' };
  }

  // 验证用户名格式
  const usernameRegex = /^[a-zA-Z0-9_-]{3,32}$/;
  if (!usernameRegex.test(username)) {
    throw { status: 400, error: '用户名格式不正确', code: 'INVALID_USERNAME' };
  }

  // 模拟用户注册
  return { success: true, userId: 'new-mock-user-id' };
};

// 认证中间件逻辑
const authenticateToken = async (token) => {
  if (!token) {
    throw { status: 401, error: '访问令牌不存在', code: 'TOKEN_MISSING' };
  }

  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await UserDAO.findById(decoded.userId);

  if (!user) {
    throw { status: 401, error: '用户不存在', code: 'USER_NOT_FOUND' };
  }

  if (!user.is_active) {
    throw { status: 401, error: '用户已被禁用', code: 'USER_DISABLED' };
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email
  };
};

// 生成访问令牌
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// 生成刷新令牌
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// 验证刷新令牌
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

