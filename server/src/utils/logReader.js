/**
 * 高效日志读取工具
 * 提供流式读取、尾部读取等功能，支持超大日志文件处理
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

// 活跃的日志读取会话
const activeStreams = new Map();

/**
 * 日志会话清理器 - 自动关闭不活跃的会话
 */
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5分钟
setInterval(() => {
  const now = Date.now();
  for (const [streamId, stream] of activeStreams.entries()) {
    if (now - stream.lastAccessed > SESSION_TIMEOUT) {
      logger.log(`关闭不活跃的日志流会话: ${streamId}`);
      stream.close();
      activeStreams.delete(streamId);
    }
  }
}, 60000); // 每分钟检查一次

/**
 * 流式日志读取类
 */
class LogStreamReader {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.options = {
      bufferSize: 16384, // 16KB 缓冲区
      encoding: 'utf8',
      ...options
    };
    this.position = 0;
    this.streamId = uuidv4();
    this.lastAccessed = Date.now();
    this.fileSize = 0;
    this.isActive = true;
    this.initReader();
  }

  /**
   * 初始化读取器
   */
  async initReader() {
    try {
      const stats = await fs.promises.stat(this.filePath);
      this.fileSize = stats.size;

      // 如果是tail模式，从文件末尾开始读取
      if (this.options.tailMode) {
        this.position = Math.max(0, this.fileSize - this.options.bufferSize);
      }
    } catch (error) {
      logger.error('初始化日志读取器失败:', error);
      this.isActive = false;
    }
  }

  /**
   * 读取下一块日志
   * @param {number} chunkSize 要读取的块大小
   * @returns {Promise<{lines: string[], eof: boolean}>}
   */
  async readChunk(chunkSize = 5000) {
    if (!this.isActive) {
      return { lines: [], eof: true };
    }

    this.lastAccessed = Date.now();
    
    try {
      // 更新文件大小
      const stats = await fs.promises.stat(this.filePath);
      this.fileSize = stats.size;

      // 如果当前位置已经到达文件末尾
      if (this.position >= this.fileSize) {
        return { lines: [], eof: true };
      }

      // 读取文件
      const chunk = Buffer.alloc(Math.min(this.options.bufferSize, this.fileSize - this.position));
      const fd = await fs.promises.open(this.filePath, 'r');
      
      const { bytesRead } = await fd.read(chunk, 0, chunk.length, this.position);
      await fd.close();

      // 处理读取的数据
      const lines = chunk.toString(this.options.encoding, 0, bytesRead)
        .split('\n')
        .filter(line => line.trim()); // 去除空行

      // 更新位置
      this.position += bytesRead;

      // 应用过滤器
      let filteredLines = lines;
      
      // 应用级别过滤
      if (this.options.level) {
        filteredLines = filteredLines.filter(line => {
          try {
            const log = JSON.parse(line);
            return log.level === this.options.level;
          } catch (e) {
            return line.includes(`"level":"${this.options.level}"`) || 
                  line.includes(`"level": "${this.options.level}"`);
          }
        });
      }

      // 应用分类过滤
      if (this.options.category) {
        filteredLines = filteredLines.filter(line => {
          try {
            const log = JSON.parse(line);
            return log.category === this.options.category;
          } catch (e) {
            return line.includes(`"category":"${this.options.category}"`) || 
                  line.includes(`"category": "${this.options.category}"`);
          }
        });
      }

      // 应用搜索过滤
      if (this.options.search) {
        filteredLines = filteredLines.filter(line => {
          return line.toLowerCase().includes(this.options.search.toLowerCase());
        });
      }

      // 应用时间范围过滤
      if (this.options.startDate || this.options.endDate) {
        filteredLines = filteredLines.filter(line => {
          try {
            const log = JSON.parse(line);
            const timestamp = log.timestamp || log.created_at;
            if (!timestamp) return true;

            const logDate = new Date(timestamp);
            if (this.options.startDate && logDate < this.options.startDate) return false;
            if (this.options.endDate && logDate > this.options.endDate) return false;
            return true;
          } catch (e) {
            return true; // 无法解析则默认包含
          }
        });
      }

      // 确保返回的行数不超过请求的块大小
      if (filteredLines.length > chunkSize) {
        filteredLines = filteredLines.slice(0, chunkSize);
      }

      // 尝试将每行解析为JSON对象
      const parsedLines = filteredLines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          // 如果不是有效的JSON，返回原始行
          return { message: line, raw: true };
        }
      });

      return {
        lines: parsedLines,
        eof: this.position >= this.fileSize,
        position: this.position,
        fileSize: this.fileSize
      };
    } catch (error) {
      logger.error('读取日志块失败:', error);
      return { lines: [], eof: true, error: error.message };
    }
  }

  /**
   * 关闭读取器
   */
  close() {
    this.isActive = false;
  }
}

/**
 * 创建一个新的日志流读取会话
 * @param {string} logType 日志类型
 * @param {object} options 选项
 * @returns {string} 会话ID
 */
function createLogStream(logType, options = {}) {
  let filePath;
  
  // 确定日志文件路径
  switch (logType) {
    case 'system':
      filePath = path.join(process.cwd(), 'logs', 'error.log');
      break;
    case 'websocket':
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      filePath = path.join(process.cwd(), 'logs', `webSocket.${dateStr}.log`);
      break;
    case 'audit':
      filePath = path.join(process.cwd(), 'data', 'audit_logs.json');
      break;
    default:
      throw new Error(`未知的日志类型: ${logType}`);
  }

  // 创建并存储新的流会话
  const reader = new LogStreamReader(filePath, options);
  activeStreams.set(reader.streamId, reader);
  return reader.streamId;
}

/**
 * 读取日志流的下一块
 * @param {string} streamId 会话ID
 * @param {number} chunkSize 块大小
 * @returns {Promise<object>} 日志块数据
 */
async function readLogStream(streamId, chunkSize = 5000) {
  const reader = activeStreams.get(streamId);
  if (!reader) {
    throw new Error(`日志流会话不存在或已过期: ${streamId}`);
  }

  return await reader.readChunk(chunkSize);
}

/**
 * 关闭日志流会话
 * @param {string} streamId 会话ID
 */
function closeLogStream(streamId) {
  const reader = activeStreams.get(streamId);
  if (reader) {
    reader.close();
    activeStreams.delete(streamId);
    return true;
  }
  return false;
}

/**
 * 读取日志文件的最新部分
 * @param {string} logType 日志类型
 * @param {object} options 选项
 * @param {number} lines 要读取的行数
 * @returns {Promise<Array>} 日志行
 */
async function tailLogFile(logType, options = {}, lines = 100) {
  // 创建一个tailMode的会话
  const tailOptions = { ...options, tailMode: true };
  const streamId = createLogStream(logType, tailOptions);
  
  // 读取指定行数
  const result = await readLogStream(streamId, lines);
  
  // 关闭会话
  closeLogStream(streamId);
  
  return result;
}

export default {
  createLogStream,
  readLogStream,
  closeLogStream,
  tailLogFile
};
