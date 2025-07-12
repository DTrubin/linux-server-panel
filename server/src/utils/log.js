import log4js from 'log4js'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
* 设置日志样式
*/
export default function setLog() {
  let file = path.join(__dirname, '../../logs')
  if (!fs.existsSync(file)) {
    fs.mkdirSync(file, { recursive: true })
  }
  log4js.configure({
    appenders: {
      console: {
        type: 'console',
        layout: {
          type: 'pattern',
          pattern: '%[[LPanel][%d{hh:mm:ss.SSS}][%4.4p]%] %m'
        }
      },
      // webSocket 日志
      webSocket: {
        type: 'file', // 可以是console,dateFile,file,Logstash等
        filename: path.join(file, 'webSocket'), // 将会按照filename和pattern拼接文件名
        pattern: 'yyyy-MM-dd.log',
        numBackups: 15,
        alwaysIncludePattern: true,
        layout: {
          type: 'pattern',
          pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
        }
      },
      // command日志
      command: {
        type: 'dateFile', // 可以是console,dateFile,file,Logstash等
        filename: path.join(file, 'command'), // 将会按照filename和pattern拼接文件名
        pattern: 'yyyy-MM-dd.log',
        numBackups: 15,
        alwaysIncludePattern: true,
        layout: {
          type: 'pattern',
          pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
        }
      },
      error: {
        type: 'file',
        filename: path.join(file, 'error.log'),
        alwaysIncludePattern: true,
        layout: {
          type: 'pattern',
          pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
        }
      }
    },
    categories: {
      default: { appenders: ['console'], level: 'debug' },
      webSocket: { appenders: ['webSocket'], level: 'debug' },
      command: { appenders: ['console', 'command'], level: 'info' },
      error: { appenders: ['console', 'command', 'error'], level: 'error' },
    }
  })

  const webSocketLogger = log4js.getLogger('webSocket')
  const commandLogger = log4js.getLogger('command')
  const errorLogger = log4js.getLogger('error')

  /* eslint-disable no-useless-call */
  /** 全局变量 logger */
  global.logger = {
    trace() {
      commandLogger.trace.call(commandLogger, ...arguments)
    },
    debug() {
      commandLogger.debug.call(commandLogger, ...arguments)
    },
    info() {
      commandLogger.info.call(commandLogger, ...arguments)
    },
    log() {
      commandLogger.info.call(commandLogger, ...arguments)
    },
    warn() {
      commandLogger.warn.call(commandLogger, ...arguments)
    },
    error() {
      errorLogger.error.call(errorLogger, ...arguments)
    },
    fatal() {
      errorLogger.fatal.call(errorLogger, ...arguments)
    },
    mark() {
      commandLogger.mark.call(commandLogger, ...arguments)
    },
    // 兼容性方法
    flushAll() {
      return new Promise((resolve) => {
        log4js.shutdown(() => {
          resolve()
        })
      })
    }
  }

  global.wsLogger = {
    trace() {
      webSocketLogger.trace.call(webSocketLogger, ...arguments)
    },
    debug() {
      webSocketLogger.debug.call(webSocketLogger, ...arguments)
    },
    info() {
      webSocketLogger.info.call(webSocketLogger, ...arguments)
    },
    log() {
      webSocketLogger.info.call(webSocketLogger, ...arguments)
    },
    warn() {
      webSocketLogger.warn.call(webSocketLogger, ...arguments)
    },
    error() {
      errorLogger.error.call(errorLogger, ...arguments)
    },
    fatal() {
      errorLogger.fatal.call(errorLogger, ...arguments)
    },
    mark() {
      webSocketLogger.mark.call(webSocketLogger, ...arguments)
    },
    // 兼容性方法
    flushAll() {
      return new Promise((resolve) => {
        log4js.shutdown(() => {
          resolve()
        })
      })
    }
  }

  logColor()
}

function logColor() {
  logger.chalk = chalk
  logger.red = chalk.red
  logger.green = chalk.green
  logger.yellow = chalk.yellow
  logger.blue = chalk.blue
  logger.magenta = chalk.magenta
  logger.cyan = chalk.cyan

  wsLogger.chalk = chalk
  wsLogger.red = chalk.red
  wsLogger.green = chalk.green
  wsLogger.yellow = chalk.yellow
  wsLogger.blue = chalk.blue
  wsLogger.magenta = chalk.magenta
  wsLogger.cyan = chalk.cyan
}
