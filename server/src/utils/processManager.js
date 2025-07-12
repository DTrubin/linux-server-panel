/**
 * 进程管理工具
 * 用于优化Linux服务器上的进程管理，避免进程挂起问题
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 检查并清理僵尸进程
 */
export async function cleanupZombieProcesses() {
  if (process.platform === 'win32') {
    return; // Windows不需要处理僵尸进程
  }

  try {
    // 查找僵尸进程
    const { stdout } = await execAsync('ps aux | grep "[Zz]ombie\\|<defunct>" | grep -v grep');
    if (stdout.trim()) {
      logger.warn('发现僵尸进程:', stdout);
      
      // 尝试清理僵尸进程的父进程
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const ppid = parts[2]; // 父进程ID
        
        try {
          await execAsync(`kill -CHLD ${ppid}`);
        } catch (error) {
          // 忽略无法发送信号的错误
        }
      }
    }
  } catch (error) {
    // 没有僵尸进程或其他错误，都忽略
  }
}

/**
 * 优化进程设置
 */
export function optimizeProcessSettings() {
  if (process.platform === 'win32') {
    return;
  }

  // 设置进程不接收SIGPIPE信号
  process.on('SIGPIPE', () => {
    logger.debug('忽略SIGPIPE信号');
  });

  // 防止进程在后台运行时被挂起
  process.on('SIGTSTP', () => {
    logger.debug('忽略SIGTSTP信号，防止进程挂起');
  });

  // 处理SIGHUP信号（终端关闭）
  process.on('SIGHUP', () => {
    logger.info('收到SIGHUP信号，继续运行');
  });
}

/**
 * 定期清理任务
 */
export function startProcessMaintenance() {
  // 每5分钟清理一次僵尸进程
  setInterval(cleanupZombieProcesses, 5 * 60 * 1000);
  
  // 每小时强制垃圾回收
  setInterval(() => {
    if (global.gc) {
      global.gc();
      logger.debug('执行强制垃圾回收');
    }
  }, 60 * 60 * 1000);
}

/**
 * 安全退出进程
 */
export async function safeProcessExit(code = 0) {
  logger.info('正在安全退出进程...');
  
  try {
    // 清理僵尸进程
    await cleanupZombieProcesses();
    
    // 给日志系统时间写入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    process.exit(code);
  } catch (error) {
    logger.error('安全退出时出错:', error);
    process.exit(1);
  }
}
