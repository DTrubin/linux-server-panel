import { spawn } from 'child_process';
import url from 'url';

// 存储活跃的终端会话
const terminalSessions = new Map()

/**
 * 清理进程的辅助函数
 */
function cleanupProcess(childProcess, sessionId) {
  if (!childProcess || childProcess.killed) {
    return
  }

  try {
    // 根据平台使用不同的终止策略
    if (process.platform === 'win32') {
      // Windows平台
      childProcess.kill('SIGTERM')
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGKILL')
        }
      }, 3000)
    } else {
      // Linux/Unix平台
      // 如果进程是分离的，需要杀死整个进程组
      if (childProcess.pid) {
        try {
          // 尝试优雅关闭整个进程组
          process.kill(-childProcess.pid, 'SIGTERM')
          setTimeout(() => {
            try {
              process.kill(-childProcess.pid, 'SIGKILL')
            } catch (killError) {
              // 忽略已经不存在的进程
            }
          }, 3000)
        } catch (error) {
          // 如果进程组不存在，直接杀死进程
          childProcess.kill('SIGTERM')
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL')
            }
          }, 3000)
        }
      }
    }
  } catch (error) {
    wsLogger.error('清理终端进程时出错', { sessionId, error: error.message })
  }
}

/**
 * 处理终端WebSocket连接
 */
function handleTerminalConnection(ws, req, parsedUrl) {
  const serverId = parsedUrl.pathname.split('/')[2] || 'current'
  const sessionId = `${serverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  wsLogger.info(`创建终端会话: ${sessionId}`)

  try {
    // 根据平台选择shell和参数
    let shell, shellArgs
    if (process.platform === 'win32') {
      shell = 'powershell.exe'
      shellArgs = [
        '-NoLogo',
        '-NoExit'
      ]
    } else {
      shell = 'bash'
      shellArgs = [
        '--login', 
        '-i',
        '-c',
        'exec bash --login -i'  // 使用exec避免子shell问题
      ]
    }

    // 创建子进程
    const processEnv = { ...process.env }
    if (process.platform === 'win32') {
      // 设置Windows控制台编码
      processEnv.PYTHONIOENCODING = 'utf-8'
      processEnv.CHCP = '65001'  // UTF-8代码页
      processEnv.LC_ALL = 'zh_CN.UTF-8'
      processEnv.LANG = 'zh_CN.UTF-8'
    } else {
      // Linux环境设置
      processEnv.TERM = 'xterm-256color'
      processEnv.SHELL = '/bin/bash'
      processEnv.LC_ALL = 'en_US.UTF-8'
      processEnv.LANG = 'en_US.UTF-8'
    }

    // 确定初始工作目录
    const initialCwd = process.env.HOME || process.env.USERPROFILE || process.cwd()

    const childProcess = spawn(shell, shellArgs, {
      cwd: initialCwd,
      env: processEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', // Linux上分离进程组
      shell: false  // 直接执行，不通过shell
    })

    // 存储会话
    terminalSessions.set(sessionId, {
      process: childProcess,
      ws: ws,
      serverId: serverId,
      createdAt: new Date(),
      currentDirectory: initialCwd
    })

    // 获取终端目录
    const currentDir = initialCwd

    const connectMessage = {
      type: 'terminal_connected',
      data: `终端已连接到 ${serverId}\r\n当前目录: ${currentDir}\r\n`,
      sessionId: sessionId,
      currentDirectory: currentDir
    }
    ws.send(JSON.stringify(connectMessage))
    wsLogger.info(`发送终端连接消息`, { sessionId, messageType: 'terminal_connected', dataSize: JSON.stringify(connectMessage).length })

    // 处理进程输出
    childProcess.stdout.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        const message = {
          type: 'terminal_data',
          data: data.toString()
        }
        ws.send(JSON.stringify(message))
        wsLogger.debug(`发送终端输出数据`, { sessionId, dataSize: data.length, messageType: 'terminal_data' })
      }
    })

    // 处理进程错误输出
    childProcess.stderr.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        const message = {
          type: 'terminal_data',
          data: data.toString()
        }
        ws.send(JSON.stringify(message))
        wsLogger.debug(`发送终端错误输出`, { sessionId, dataSize: data.length, messageType: 'terminal_data' })
      }
    })

    // 处理进程退出
    childProcess.on('exit', (exitCode, signal) => {
      wsLogger.info(`终端会话退出`, { sessionId, exitCode, signal })
      terminalSessions.delete(sessionId)
      if (ws.readyState === ws.OPEN) {
        const exitMessage = {
          type: 'terminal_exit',
          data: `\r\nTerminal exited with code: ${exitCode}\r\n`,
          exitCode: exitCode
        }
        ws.send(JSON.stringify(exitMessage))
        wsLogger.info(`发送终端退出消息`, { sessionId, exitCode, messageType: 'terminal_exit' })
        // 不要立即关闭WebSocket，让客户端决定
      }
    })

    // 处理进程错误
    childProcess.on('error', (error) => {
      wsLogger.error(`终端进程错误`, { sessionId, error: error.message })
      terminalSessions.delete(sessionId)
      if (ws.readyState === ws.OPEN) {
        const errorMessage = {
          type: 'terminal_error',
          data: `Terminal error: ${error.message}\r\n`
        }
        ws.send(JSON.stringify(errorMessage))
        wsLogger.error(`发送终端错误消息`, { sessionId, error: error.message, messageType: 'terminal_error' })
      }
    })

    // 防止进程变成僵尸进程
    if (process.platform !== 'win32') {
      childProcess.unref()
    }

    // 处理WebSocket消息
    ws.on('message', (data) => {
      try {
        let input = data.toString()
        wsLogger.debug(`接收WebSocket消息`, { sessionId, dataSize: input.length, messageType: 'raw_input' })

        // 尝试解析JSON格式的消息
        try {
          const message = JSON.parse(input)
          wsLogger.debug(`解析WebSocket消息`, { sessionId, messageType: message.type })

          switch (message.type) {
            case 'terminal_input':
              if (message.data && childProcess.stdin.writable) {
                childProcess.stdin.write(message.data)
                wsLogger.debug(`写入终端输入`, { sessionId, dataSize: message.data.length })
              }
              break
            case 'terminal_resize':
              wsLogger.debug('终端窗口大小调整请求被忽略 (child_process 不支持)', {
                sessionId,
                cols: message.cols,
                rows: message.rows
              })
              break
            case 'ping':
              const pongMessage = {
                type: 'pong',
                timestamp: new Date().toISOString()
              }
              ws.send(JSON.stringify(pongMessage))
              wsLogger.debug(`发送心跳响应`, { sessionId, messageType: 'pong' })
              break
            default:
              // 未知消息类型，作为原始输入处理
              wsLogger.debug(`未知消息类型，作为原始输入处理`, { sessionId, messageType: message.type })
              if (childProcess.stdin.writable) {
                childProcess.stdin.write(input)
              }
          }
        } catch (parseError) {
          // JSON解析失败，直接作为终端输入处理
          wsLogger.debug(`JSON解析失败，作为原始输入处理`, { sessionId, error: parseError.message })
          if (childProcess.stdin.writable) {
            childProcess.stdin.write(input)
          }
        }

      } catch (error) {
        wsLogger.error('处理终端WebSocket消息错误', { sessionId, error: error.message })
      }
    })

    // 连接关闭处理
    ws.on('close', (code, reason) => {
      wsLogger.info(`终端WebSocket连接已关闭`, { sessionId, code, reason })
      if (terminalSessions.has(sessionId)) {
        const session = terminalSessions.get(sessionId)
        cleanupProcess(session.process, sessionId)
        terminalSessions.delete(sessionId)
      }
    })

    // 错误处理
    ws.on('error', (error) => {
      wsLogger.error(`终端WebSocket错误`, { sessionId, error: error.message })
      if (terminalSessions.has(sessionId)) {
        const session = terminalSessions.get(sessionId)
        cleanupProcess(session.process, sessionId)
        terminalSessions.delete(sessionId)
      }
    })

  } catch (error) {
    wsLogger.error('创建终端会话失败', { sessionId, error: error.message })
    const errorMessage = {
      type: 'terminal_error',
      data: `Failed to create terminal: ${error.message}\r\n`
    }
    ws.send(JSON.stringify(errorMessage))
    wsLogger.error(`发送终端创建失败消息`, { sessionId, error: error.message, messageType: 'terminal_error' })
    ws.close(1011, 'Terminal creation failed')
  }
}

/**
 * 初始化WebSocket处理器
 */
function initWebSocketHandlers(wss) {
  // 只设置一次connection事件监听器
  wss.removeAllListeners('connection'); // 移除之前的监听器，防止重复绑定

  wss.on('connection', (ws, req) => {
    const parsedUrl = url.parse(req.url, true)
    const pathname = parsedUrl.pathname
    const clientIP = req.socket.remoteAddress

    wsLogger.info('新的WebSocket连接已建立', { pathname, clientIP })
    logger.info('新的WebSocket连接已建立', { pathname, clientIP })

    // 判断连接类型
    if (pathname.startsWith('/terminal/')) {
      wsLogger.info(`终端WebSocket连接 - IP: ${clientIP}`)
      handleTerminalConnection(ws, req, parsedUrl)
    } else if (pathname.startsWith('/monitor/')) {
      wsLogger.info(`监控WebSocket连接 - IP: ${clientIP}`)
      // 导入并处理监控连接
      import('./monitor.js').then(({ handleMonitorConnection }) => {
        handleMonitorConnection(ws, req, parsedUrl)
      }).catch(error => {
        wsLogger.error('导入监控处理器失败:', error)
        ws.close(1000, 'Server error')
      })
    } else if (pathname.startsWith('/file-watch')) {
      wsLogger.info(`文件监听WebSocket连接 - IP: ${clientIP}`)
      // 导入并处理文件监听连接
      import('./fileWatcher.js').then(({ default: fileWatcher }) => {
        fileWatcher.handleConnection(ws, req)
      }).catch(error => {
        wsLogger.error('导入文件监听处理器失败:', error)
        ws.close(1000, 'Server error')
      })
    } else {
      wsLogger.warn(`未知的WebSocket路径: ${pathname}`)
      ws.close(1000, 'Unknown WebSocket path')
    }

    // 连接关闭处理
    ws.on('close', (code, reason) => {
      wsLogger.info(`WebSocket连接关闭 - 路径: ${pathname}, IP: ${clientIP}, 代码: ${code}`)
      logger.info(`WebSocket连接关闭 - 路径: ${pathname}, IP: ${clientIP}, 代码: ${code}`)
    })

    // 连接错误处理
    ws.on('error', (error) => {
      wsLogger.error(`WebSocket连接错误 - 路径: ${pathname}, IP: ${clientIP}, 错误: ${error.message}`)
      logger.error(`WebSocket连接错误 - 路径: ${pathname}, IP: ${clientIP}, 错误: ${error.message}`)
    })

    // 记录连接开始时间
    ws.connectTime = Date.now()
  })

  // 清理过期的终端会话
  setInterval(() => {
    const now = new Date()
    for (const [sessionId, session] of terminalSessions.entries()) {
      const age = now - session.createdAt
      // 清理超过 30 分钟的会话
      if (age > 30 * 60 * 1000) {
        wsLogger.info(`清理过期的终端会话`, { sessionId, age })
        cleanupProcess(session.process, sessionId)
        if (session.ws.readyState === session.ws.OPEN) {
          session.ws.close(1000, 'Session expired')
        }
        terminalSessions.delete(sessionId)
      }
    }
  }, 10 * 60 * 1000) // 每10分钟检查一次
}

/**
 * 获取活跃终端会话数量
 */
function getActiveSessionsCount() {
  return terminalSessions.size
}

/**
 * 获取终端会话信息
 */
function getSessionsInfo() {
  const sessions = []
  for (const [sessionId, session] of terminalSessions.entries()) {
    sessions.push({
      sessionId,
      serverId: session.serverId,
      createdAt: session.createdAt,
      connected: session.ws.readyState === session.ws.OPEN,
      processAlive: session.process && !session.process.killed
    })
  }
  return sessions
}

/**
 * 清理所有终端会话
 */
function cleanupAllSessions() {
  wsLogger.info(`正在清理所有终端会话，共 ${terminalSessions.size} 个会话`);

  const cleanup = [];

  for (const [sessionId, session] of terminalSessions.entries()) {
    cleanup.push(new Promise((resolve) => {
      try {
        // 关闭WebSocket连接
        if (session.ws.readyState === session.ws.OPEN) {
          session.ws.close(1000, 'Server shutting down');
        }

        // 清理进程
        if (session.process && !session.process.killed) {
          // 监听进程退出事件
          session.process.once('exit', resolve);
          
          // 使用新的清理函数
          cleanupProcess(session.process, sessionId);
          
          // 设置超时后强制resolve
          setTimeout(() => {
            resolve();
          }, 5000);
        } else {
          resolve();
        }
      } catch (error) {
        wsLogger.error('清理终端会话时出错', { sessionId, error: error.message });
        resolve();
      }
    }));
  }

  // 等待所有清理完成或超时
  Promise.race([
    Promise.all(cleanup),
    new Promise(resolve => setTimeout(resolve, 10000)) // 最多等待10秒
  ]).then(() => {
    terminalSessions.clear();
    wsLogger.info('所有终端会话已清理完成');
  });
}

export {
  initWebSocketHandlers,
  getActiveSessionsCount,
  getSessionsInfo,
  cleanupAllSessions
};
