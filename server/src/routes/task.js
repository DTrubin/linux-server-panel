import express from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import cron from 'node-cron'
import { logAuditEvent } from '../middleware/auditLogger.js'
import { clear } from 'console'

const router = express.Router()

// 简单的logger实现
const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args)
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args)
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args)
  }
}

// 数据文件路径
const TASKS_FILE = join(process.cwd(), 'data', 'tasks.json')
const EXECUTIONS_FILE = join(process.cwd(), 'data', 'task_executions.json')

// 内存中的定时任务管理器
const scheduledTasks = new Map()

// 读取任务数据 - 添加更好的错误处理
const readTasks = async () => {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8')
    const tasks = JSON.parse(data)

    // 验证数据格式
    if (!Array.isArray(tasks)) {
      logger.warn('任务数据格式不正确，重置为空数组')
      return []
    }

    return tasks
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回空数组
      logger.info('任务文件不存在，创建新文件')
      const emptyTasks = []
      await writeTasks(emptyTasks)
      return emptyTasks
    } else if (error instanceof SyntaxError) {
      // JSON格式错误
      logger.error('任务文件JSON格式错误，备份损坏文件并重置', error)

      try {
        // 备份损坏的文件
        const backupFile = `${TASKS_FILE}.backup.${Date.now()}`
        await fs.copyFile(TASKS_FILE, backupFile)
        logger.info(`已备份损坏的任务文件到: ${backupFile}`)

        // 重置为空数组
        const emptyTasks = []
        await writeTasks(emptyTasks)
        return emptyTasks
      } catch (backupError) {
        logger.error('备份损坏文件失败', backupError)
        throw error
      }
    } else {
      logger.error('读取任务文件失败', error)
      throw error
    }
  }
}

// 写入任务数据 - 添加原子性操作和错误处理
const writeTasks = async (tasks) => {
  const tempFile = TASKS_FILE + '.tmp'

  try {
    // 验证数据格式
    if (!Array.isArray(tasks)) {
      throw new Error('任务数据必须是数组格式')
    }

    // 先写入临时文件
    const jsonData = JSON.stringify(tasks, null, 2)
    await fs.writeFile(tempFile, jsonData)

    // 验证写入的JSON是否有效
    await fs.readFile(tempFile, 'utf8').then(data => JSON.parse(data))

    // 原子性替换原文件
    await fs.rename(tempFile, TASKS_FILE)
  } catch (error) {
    // 清理临时文件
    try {
      await fs.unlink(tempFile)
    } catch (unlinkError) {
      // 忽略删除临时文件的错误
    }

    logger.error('写入任务数据失败', error)
    throw new Error(`写入任务数据失败: ${error.message}`)
  }
}

// 读取执行历史数据
const readExecutions = async () => {
  try {
    const data = await fs.readFile(EXECUTIONS_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

// 写入执行历史数据
const writeExecutions = async (executions) => {
  await fs.writeFile(EXECUTIONS_FILE, JSON.stringify(executions, null, 2))
}

// 执行任务
const executeTaskById = async (taskId, triggeredBy = 'manual') => {
  const tasks = await readTasks()
  const task = tasks.find(t => t.id === taskId)

  if (!task) {
    throw new Error('任务不存在')
  }

  if (!task.enabled) {
    throw new Error('任务已禁用')
  }

  const executionId = uuidv4()
  const startTime = new Date().toISOString()

  // 创建执行记录
  const execution = {
    id: executionId,
    taskId,
    status: 'running',
    startTime,
    triggeredBy
  }

  // 更新任务状态
  task.status = 'running'
  await writeTasks(tasks)

  // 保存执行记录
  const executions = await readExecutions()
  executions.push(execution)
  await writeExecutions(executions)

  logger.info(`开始执行任务: ${task.name} (${taskId})`)

  // 执行命令
  return new Promise((resolve) => {
    const options = {
      cwd: task.workingDirectory || process.cwd(),
      env: { ...process.env, ...task.environment },
      shell: true
    }

    const child = spawn(task.command, task.arguments || [], options)

    let output = ''
    let error = ''

    child.stdout?.on('data', (data) => {
      output += data.toString()
    })

    child.stderr?.on('data', (data) => {
      error += data.toString()
    })

    child.on('close', async (code) => {
      const endTime = new Date().toISOString()
      const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000)

      // 更新执行记录
      const updatedExecutions = await readExecutions()
      const executionIndex = updatedExecutions.findIndex(e => e.id === executionId)

      if (executionIndex !== -1) {
        updatedExecutions[executionIndex] = {
          ...updatedExecutions[executionIndex],
          status: code === 0 ? 'completed' : 'failed',
          endTime,
          duration,
          exitCode: code,
          output: output.trim(),
          error: error.trim()
        }
        await writeExecutions(updatedExecutions)
      }

      // 更新任务状态
      const updatedTasks = await readTasks()
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId)
      if (taskIndex !== -1) {
        updatedTasks[taskIndex].status = code === 0 ? 'completed' : 'failed'
        await writeTasks(updatedTasks)
      }

      logger.info(`任务执行完成: ${task.name}, 退出码: ${code}, 耗时: ${duration}s`)

      resolve({
        executionId,
        exitCode: code,
        output,
        error,
        duration
      })
    })

    child.on('error', async (err) => {
      logger.error(`任务执行出错: ${task.name}`, err)

      // 更新执行记录
      const updatedExecutions = await readExecutions()
      const executionIndex = updatedExecutions.findIndex(e => e.id === executionId)

      if (executionIndex !== -1) {
        updatedExecutions[executionIndex] = {
          ...updatedExecutions[executionIndex],
          status: 'failed',
          endTime: new Date().toISOString(),
          error: err.message
        }
        await writeExecutions(updatedExecutions)
      }

      // 更新任务状态
      const updatedTasks = await readTasks()
      const taskIndex = updatedTasks.findIndex(t => t.id === taskId)
      if (taskIndex !== -1) {
        updatedTasks[taskIndex].status = 'failed'
        await writeTasks(updatedTasks)
      }

      resolve({
        executionId,
        exitCode: -1,
        error: err.message
      })
    })
  })
}

// 设置定时任务
const scheduleTask = (task, schedule) => {
  logger.info(`开始设置任务 ${task.name} 的定时任务，类型: ${schedule.triggerType}`)

  if (!task.enabled) {
    return false
  }

  if (schedule.triggerType === 'cron' && schedule.cronExpression) {
    try {
      logger.info(`创建Cron任务: ${task.name}, 表达式: ${schedule.cronExpression}`)

      // 验证Cron表达式格式
      if (!cron.validate(schedule.cronExpression)) {
        throw new Error(`无效的Cron表达式: ${schedule.cronExpression}`)
      }

      const cronTask = cron.schedule(schedule.cronExpression, () => {
        logger.info(`Cron任务触发: ${task.name}`)
        executeTaskById(task.id, 'cron').catch(err => {
          logger.error(`定时任务执行失败: ${task.name}`, err)
        })
      }, {
        scheduled: false
      })

      scheduledTasks.set(task.id, cronTask)
      cronTask.start()

      // 验证任务是否成功添加
      if (scheduledTasks.has(task.id)) {
        logger.info(`✅ 已设置Cron定时任务: ${task.name} (${schedule.cronExpression})`)
        return true
      } else {
        throw new Error('任务未能成功添加到调度管理器')
      }
    } catch (error) {
      logger.error(`❌ 设置Cron定时任务失败: ${task.name}`, error)
      // 清理可能的残留
      scheduledTasks.delete(task.id)
      return false
    }
  } else if (schedule.triggerType === 'interval' && schedule.interval) {
    try {
      logger.info(`创建间隔任务: ${task.name}, 间隔: ${schedule.interval}秒`)

      // 验证间隔时间
      if (schedule.interval <= 0) {
        throw new Error(`无效的间隔时间: ${schedule.interval}`)
      }

      const intervalTask = setInterval(() => {
        executeTaskById(task.id, 'interval').catch(err => {
          logger.error(`定时任务执行失败: ${task.name}`, err)
        })
      }, schedule.interval * 1000)

      scheduledTasks.set(task.id, intervalTask)

      // 验证任务是否成功添加
      if (scheduledTasks.has(task.id)) {
        logger.info(`✅ 已设置间隔定时任务: ${task.name} (${schedule.interval}秒)`)
        return true
      } else {
        throw new Error('任务未能成功添加到调度管理器')
      }
    } catch (error) {
      logger.error(`❌ 设置间隔定时任务失败: ${task.name}`, error)
      // 清理可能的残留
      if (scheduledTasks.has(task.id)) {
        const task = scheduledTasks.get(task.id)
        if (typeof task === 'number') {
          clearInterval(task)
        }
        scheduledTasks.delete(task.id)
      }
      return false
    }
  } else {
    logger.warn(`⚠️ 无效的调度配置: ${task.name}, 类型: ${schedule.triggerType}`)
    return false
  }
}

// 取消定时任务
const unscheduleTask = (taskId) => {
  const task = scheduledTasks.get(taskId)
  if (!task) {
    return
  }

  // 如果是Cron任务
  if (task.stop) {
    logger.info(`取消Cron任务: ${taskId}`)
    task.stop()
    return
  }

  scheduledTasks.delete(taskId)

  // 如果是间隔任务
  logger.info(`取消间隔任务: ${taskId}`)
  clearInterval(task)
}

// 验证定时任务一致性
const validateScheduledTasksConsistency = async () => {
  try {
    const tasks = await readTasks()
    const enabledScheduledTasks = tasks.filter(task =>
      task.enabled &&
      task.schedule &&
      task.schedule.triggerType !== 'manual'
    )

    logger.info(`🔍 开始验证定时任务一致性`)
    logger.info(`📋 应该有定时任务的任务数: ${enabledScheduledTasks.length}`)
    logger.info(`💾 实际内存中的定时任务数: ${scheduledTasks.size}`)

    // 检查应该有但没有的任务
    const missingTasks = []
    for (const task of enabledScheduledTasks) {
      if (!scheduledTasks.has(task.id)) {
        missingTasks.push(task)
      }
    }

    // 检查不应该有但存在的任务
    const extraTasks = []
    for (const [taskId] of scheduledTasks) {
      const task = tasks.find(t => t.id === taskId)
      if (!task || !task.enabled || !task.schedule || task.schedule.triggerType === 'manual') {
        extraTasks.push(taskId)
      }
    }

    if (missingTasks.length > 0) {
      logger.warn(`⚠️ 发现缺失的定时任务: ${missingTasks.map(t => `${t.name}(${t.id})`).join(', ')}`)
    }

    if (extraTasks.length > 0) {
      logger.warn(`⚠️ 发现多余的定时任务: ${extraTasks.join(', ')}`)
    }

    if (missingTasks.length === 0 && extraTasks.length === 0) {
      logger.info(`✅ 定时任务一致性验证通过`)
    }

    return {
      consistent: missingTasks.length === 0 && extraTasks.length === 0,
      missingTasks,
      extraTasks,
      expectedCount: enabledScheduledTasks.length,
      actualCount: scheduledTasks.size
    }
  } catch (error) {
    logger.error(`❌ 验证定时任务一致性失败`, error)
    return null
  }
}

// 获取任务列表
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      type,
      priority,
      keyword,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    let tasks = await readTasks()

    // 筛选
    if (status) {
      const statusList = Array.isArray(status) ? status : [status]
      tasks = tasks.filter(task => statusList.includes(task.status))
    }

    if (type) {
      const typeList = Array.isArray(type) ? type : [type]
      tasks = tasks.filter(task => typeList.includes(task.type))
    }

    if (priority) {
      const priorityList = Array.isArray(priority) ? priority : [priority]
      tasks = tasks.filter(task => priorityList.includes(task.priority))
    }

    if (keyword) {
      tasks = tasks.filter(task =>
        task.name.includes(keyword) ||
        (task.description && task.description.includes(keyword))
      )
    }

    // 排序
    tasks.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1
      } else {
        return aValue > bValue ? 1 : -1
      }
    })

    // 分页
    const total = tasks.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + parseInt(pageSize)
    const paginatedTasks = tasks.slice(startIndex, endIndex)

    res.json({
      success: true,
      message: '获取任务列表成功',
      data: {
        tasks: paginatedTasks,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    })
  } catch (error) {
    logger.error('获取任务列表失败', error)
    res.status(500).json({
      success: false,
      message: '获取任务列表失败'
    })
  }
})

// 获取任务详情
router.get('/detail', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      })
    }

    const tasks = await readTasks()
    const task = tasks.find(t => t.id === id)

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    res.json({
      success: true,
      message: '获取任务详情成功',
      data: task
    })
  } catch (error) {
    logger.error('获取任务详情失败', error)
    res.status(500).json({
      success: false,
      message: '获取任务详情失败'
    })
  }
})

// 创建任务
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      command,
      arguments: args,
      workingDirectory,
      environment,
      priority = 'normal',
      enabled = true,
      schedule
    } = req.body

    if (!name || !command) {
      return res.status(400).json({
        success: false,
        message: '任务名称和命令不能为空',
        errors: {
          name: !name ? '任务名称不能为空' : undefined,
          command: !command ? '命令不能为空' : undefined
        }
      })
    }

    // 验证任务类型
    const validTypes = ['shell', 'backup', 'maintenance', 'custom']
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `无效的任务类型: ${type}`,
        validTypes
      })
    }

    // 验证优先级
    const validPriorities = ['low', 'normal', 'high', 'urgent']
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `无效的优先级: ${priority}`,
        validPriorities
      })
    }

    // 验证调度设置
    if (schedule) {
      if (schedule.triggerType === 'cron' && !schedule.cronExpression) {
        return res.status(400).json({
          success: false,
          message: 'Cron触发类型必须提供cron表达式'
        })
      }
      if (schedule.triggerType === 'interval' && (!schedule.interval || schedule.interval < 1)) {
        return res.status(400).json({
          success: false,
          message: '间隔触发类型的间隔时间不能少于1秒'
        })
      }
    }

    const taskId = uuidv4()
    const now = new Date().toISOString()

    const task = {
      id: taskId,
      name,
      description,
      type,
      command,
      arguments: args,
      workingDirectory,
      environment,
      status: 'pending',
      priority,
      createdAt: now,
      createdBy: req.user?.username || 'system',
      enabled,
      schedule: schedule || { triggerType: 'manual' }
    }

    const tasks = await readTasks()
    tasks.push(task)
    await writeTasks(tasks)

    // 设置定时任务
    if (schedule && schedule.triggerType !== 'manual') {
      scheduleTask(task, schedule)
    }

    // 记录审计日志
    await logAuditEvent(
      req.user?.id || 'system',
      'CREATE_TASK',
      'task_management',
      {
        taskId: taskId,
        taskName: name,
        taskType: type,
        command: command,
        scheduleType: schedule?.triggerType || 'manual',
        enabled: enabled
      },
      'info',
      req
    );

    logger.info(`创建任务成功: ${name}`)
    res.status(201).json({
      success: true,
      message: '创建任务成功',
      data: task
    })
  } catch (error) {
    logger.error('创建任务失败', error)

    // 返回详细的错误信息
    let errorMessage = '创建任务失败'
    if (error.code === 'EACCES') {
      errorMessage = '没有权限访问任务文件'
    } else if (error.code === 'ENOSPC') {
      errorMessage = '磁盘空间不足'
    } else if (error.message) {
      errorMessage = `创建任务失败: ${error.message}`
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// 更新任务
router.put('/update', async (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      })
    }

    const tasks = await readTasks()
    const taskIndex = tasks.findIndex(t => t.id === id)

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    const existingTask = tasks[taskIndex]
    const updatedTask = {
      ...existingTask,
      ...req.body,
      id: existingTask.id,
      createdAt: existingTask.createdAt,
      updatedAt: new Date().toISOString(),
      // 如果没有提供schedule，保持原有的schedule
      schedule: req.body.schedule || existingTask.schedule || { triggerType: 'manual' }
    }

    tasks[taskIndex] = updatedTask
    await writeTasks(tasks)

    // 记录更新前的状态
    const oldScheduleType = existingTask.schedule?.triggerType || 'manual'
    const newScheduleType = updatedTask.schedule?.triggerType || 'manual'
    logger.info(`任务调度变更: ${existingTask.name} 从 ${oldScheduleType} 变更为 ${newScheduleType}`)


    // 删除之前的定时任务
    unscheduleTask(existingTask.id)

    // 创建新的定时任务 (跳过内部的unschedule调用，因为我们已经手动删除了)
    scheduleTask(updatedTask, updatedTask.schedule)

    // 记录审计日志
    await logAuditEvent(
      req.user?.id || 'system',
      'UPDATE_TASK',
      'task_management',
      {
        taskId: existingTask.id,
        taskName: updatedTask.name,
        oldSchedule: existingTask.schedule,
        newSchedule: updatedTask.schedule,
        enabled: updatedTask.enabled
      },
      'info',
      req
    );

    logger.info(`更新任务成功: ${updatedTask.name}`)
    res.json({
      success: true,
      message: '更新任务成功',
      data: updatedTask
    })
  } catch (error) {
    logger.error('更新任务失败', error)
    res.status(500).json({
      success: false,
      message: '更新任务失败'
    })
  }
})

// 删除任务
router.delete('/remove', async (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      })
    }

    const taskId = id
    logger.info(`开始删除任务: ${taskId}`)

    const tasks = await readTasks()
    const taskIndex = tasks.findIndex(t => t.id === taskId)

    if (taskIndex === -1) {
      logger.warn(`尝试删除不存在的任务: ${taskId}`)
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    const task = tasks[taskIndex]
    logger.info(`找到要删除的任务: ${task.name} (${task.id})`)

    // 检查任务是否正在运行
    if (task.status === 'running') {
      logger.warn(`尝试删除正在运行的任务: ${task.name}`)
      return res.status(400).json({
        success: false,
        message: '无法删除正在运行的任务'
      })
    }

    // 取消定时任务
    try {
      unscheduleTask(task.id)
      logger.info(`已取消任务的定时调度: ${task.name}`)
    } catch (unscheduleError) {
      logger.warn(`取消定时任务失败，但继续删除: ${unscheduleError.message}`)
    }

    // 删除任务
    const originalLength = tasks.length
    tasks.splice(taskIndex, 1)

    // 验证删除操作
    if (tasks.length !== originalLength - 1) {
      throw new Error('删除操作验证失败')
    }

    await writeTasks(tasks)

    logger.info(`成功删除任务: ${task.name}, 剩余任务数: ${tasks.length}`)

    res.json({
      success: true,
      message: '任务删除成功',
      data: {
        deletedTaskId: taskId,
        deletedTaskName: task.name,
        remainingTasksCount: tasks.length
      }
    })
  } catch (error) {
    logger.error('删除任务失败', error)
    res.status(500).json({
      success: false,
      message: `删除任务失败: ${error.message}`
    })
  }
})

// 批量删除任务
router.delete('/batch', async (req, res) => {
  try {
    const { taskIds } = req.body

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的任务ID列表'
      })
    }

    logger.info(`开始批量删除任务: ${taskIds.join(', ')}`)

    const tasks = await readTasks()
    const results = {
      success: [],
      failed: [],
      notFound: [],
      running: []
    }

    // 查找要删除的任务
    const tasksToDelete = []
    for (const taskId of taskIds) {
      const taskIndex = tasks.findIndex(t => t.id === taskId)

      if (taskIndex === -1) {
        results.notFound.push(taskId)
        continue
      }

      const task = tasks[taskIndex]

      // 检查任务是否正在运行
      if (task.status === 'running') {
        results.running.push({
          id: taskId,
          name: task.name
        })
        continue
      }

      tasksToDelete.push({
        index: taskIndex,
        task: task
      })
    }

    // 按索引降序排序，确保删除时不影响其他元素的索引
    tasksToDelete.sort((a, b) => b.index - a.index)

    // 删除任务
    for (const { index, task } of tasksToDelete) {
      try {
        // 取消定时任务
        try {
          unscheduleTask(task.id)
          logger.info(`已取消任务的定时调度: ${task.name}`)
        } catch (unscheduleError) {
          logger.warn(`取消定时任务失败，但继续删除: ${unscheduleError.message}`)
        }

        // 从数组中删除任务
        tasks.splice(index, 1)

        results.success.push({
          id: task.id,
          name: task.name
        })

        logger.info(`成功删除任务: ${task.name} (${task.id})`)
      } catch (error) {
        logger.error(`删除任务失败: ${task.name}`, error)
        results.failed.push({
          id: task.id,
          name: task.name,
          error: error.message
        })
      }
    }

    // 如果有成功删除的任务，保存文件
    if (results.success.length > 0) {
      await writeTasks(tasks)
    }

    // 构建响应消息
    const messages = []
    if (results.success.length > 0) {
      messages.push(`成功删除 ${results.success.length} 个任务`)
    }
    if (results.failed.length > 0) {
      messages.push(`${results.failed.length} 个任务删除失败`)
    }
    if (results.notFound.length > 0) {
      messages.push(`${results.notFound.length} 个任务不存在`)
    }
    if (results.running.length > 0) {
      messages.push(`${results.running.length} 个任务正在运行，无法删除`)
    }

    const isSuccess = results.success.length > 0 && results.failed.length === 0
    const statusCode = isSuccess ? 200 : (results.success.length > 0 ? 207 : 400) // 207: Multi-Status

    logger.info(`批量删除任务完成: ${messages.join(', ')}, 剩余任务数: ${tasks.length}`)

    res.status(statusCode).json({
      success: isSuccess,
      message: messages.join(', '),
      data: {
        ...results,
        remainingTasksCount: tasks.length,
        totalRequested: taskIds.length,
        totalDeleted: results.success.length
      }
    })
  } catch (error) {
    logger.error('批量删除任务失败', error)
    res.status(500).json({
      success: false,
      message: `批量删除任务失败: ${error.message}`
    })
  }
})

// 执行任务
router.post('/execute', async (req, res) => {
  try {
    const { id } = req.body
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      })
    }

    const tasks = await readTasks()
    const task = tasks.find(t => t.id === id)

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    const result = await executeTaskById(id, 'manual')

    // 记录审计日志
    await logAuditEvent(
      req.user?.id || 'system',
      'EXECUTE_TASK',
      'task_management',
      {
        taskId: id,
        taskName: task.name,
        executionId: result.executionId,
        triggerType: 'manual',
        success: result.exitCode === 0
      },
      result.exitCode === 0 ? 'info' : 'warning',
      req
    );

    res.json({
      success: true,
      message: '任务执行完成',
      data: {
        executionId: result.executionId,
        exitCode: result.exitCode
      }
    })
  } catch (error) {
    // 记录失败的审计日志
    await logAuditEvent(
      req.user?.id || 'system',
      'EXECUTE_TASK_FAILED',
      'task_management',
      {
        taskId: req.body.id,
        error: error.message
      },
      'error',
      req
    );

    logger.error('执行任务失败', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// 获取任务执行历史
router.get('/executions', async (req, res) => {
  try {
    const {
      id,
      page = 1,
      pageSize = 10,
      status
    } = req.query

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      })
    }

    let executions = await readExecutions()

    // 筛选指定任务的执行记录
    executions = executions.filter(exec => exec.taskId === id)

    // 筛选状态
    if (status) {
      const statusList = Array.isArray(status) ? status : [status]
      executions = executions.filter(exec => statusList.includes(exec.status))
    }

    // 按开始时间倒序排列
    executions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

    // 分页
    const total = executions.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + parseInt(pageSize)
    const paginatedExecutions = executions.slice(startIndex, endIndex)

    res.json({
      success: true,
      message: '获取执行历史成功',
      data: {
        executions: paginatedExecutions,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    })
  } catch (error) {
    logger.error('获取执行历史失败', error)
    res.status(500).json({
      success: false,
      message: '获取执行历史失败'
    })
  }
})

// 获取所有任务执行历史
router.get('/executions/all', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      taskId,
      status,
      startTime,
      endTime
    } = req.query

    let executions = await readExecutions()

    // 筛选
    if (taskId) {
      executions = executions.filter(exec => exec.taskId === taskId)
    }

    if (status) {
      const statusList = Array.isArray(status) ? status : [status]
      executions = executions.filter(exec => statusList.includes(exec.status))
    }

    if (startTime) {
      executions = executions.filter(exec => exec.startTime >= startTime)
    }

    if (endTime) {
      executions = executions.filter(exec => exec.startTime <= endTime)
    }

    // 按开始时间倒序排列
    executions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

    // 分页
    const total = executions.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + parseInt(pageSize)
    const paginatedExecutions = executions.slice(startIndex, endIndex)

    res.json({
      success: true,
      message: '获取所有执行历史成功',
      data: {
        executions: paginatedExecutions,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    })
  } catch (error) {
    logger.error('获取执行历史失败', error)
    res.status(500).json({
      success: false,
      message: '获取执行历史失败'
    })
  }
})

// 获取任务统计信息
router.get('/statistics/overview', async (req, res) => {
  try {
    const tasks = await readTasks()
    const executions = await readExecutions()

    const statistics = {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      enabled: tasks.filter(t => t.enabled).length,
      disabled: tasks.filter(t => !t.enabled).length
    }

    res.json({
      success: true,
      message: '获取任务统计成功',
      data: statistics
    })
  } catch (error) {
    logger.error('获取任务统计失败', error)
    res.status(500).json({
      success: false,
      message: '获取任务统计失败'
    })
  }
})

// 启动时恢复定时任务
const restoreScheduledTasks = async () => {
  try {
    const tasks = await readTasks()
    let restoredCount = 0

    for (const task of tasks) {
      if (task.enabled && task.schedule && task.schedule.triggerType !== 'manual') {
        try {
          scheduleTask(task, task.schedule)
          restoredCount++
        } catch (error) {
          logger.error(`恢复任务 ${task.name} 的定时任务失败`, error)
        }
      }
    }

    logger.info(`定时任务恢复完成，共恢复 ${restoredCount} 个定时任务`)
  } catch (error) {
    logger.error('恢复定时任务失败', error)
  }
}

// 启动时恢复定时任务
restoreScheduledTasks()

// 启用/禁用任务
router.patch('/toggle', async (req, res) => {
  try {
    const { id, enabled } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '任务ID不能为空'
      })
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '启用状态必须是布尔值'
      })
    }

    const tasks = await readTasks()
    const taskIndex = tasks.findIndex(t => t.id === id)

    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }

    const task = tasks[taskIndex]
    const oldEnabled = task.enabled

    // 更新任务状态
    task.enabled = enabled
    task.updatedAt = new Date().toISOString()

    tasks[taskIndex] = task
    await writeTasks(tasks)

    // 根据新的enabled状态处理定时任务
    if (task.schedule && task.schedule.triggerType !== 'manual') {
      if (enabled && !oldEnabled) {
        // 从禁用变为启用：设置定时任务
        logger.info(`任务 ${task.name} 从禁用变为启用，设置定时任务`)
        scheduleTask(task, task.schedule, false) // 不跳过unschedule，确保清理
        logger.info(`任务 ${task.name} 已启用，重新设置定时任务`)
      } else if (!enabled && oldEnabled) {
        // 从启用变为禁用：取消定时任务
        logger.info(`任务 ${task.name} 从启用变为禁用，取消定时任务`)
        unscheduleTask(task.id)
        logger.info(`任务 ${task.name} 已禁用，取消定时任务`)
      }

      // 显示当前状态
      debugScheduledTasks()
    }

    // 记录审计日志
    await logAuditEvent(
      req.user?.id || 'system',
      enabled ? 'ENABLE_TASK' : 'DISABLE_TASK',
      'task_management',
      {
        taskId: id,
        taskName: task.name,
        previousState: oldEnabled,
        newState: enabled
      },
      'info',
      req
    );

    res.json({
      success: true,
      message: `任务${enabled ? '启用' : '禁用'}成功`,
      data: {
        id: task.id,
        name: task.name,
        enabled: task.enabled
      }
    })
  } catch (error) {
    logger.error('切换任务状态失败', error)
    res.status(500).json({
      success: false,
      message: '切换任务状态失败'
    })
  }
})

// 获取定时任务状态
router.get('/schedule/status', async (req, res) => {
  try {
    const tasks = await readTasks()
    const scheduleStatus = []

    for (const task of tasks) {
      if (task.schedule && task.schedule.triggerType !== 'manual') {
        const isRunning = scheduledTasks.has(task.id)
        scheduleStatus.push({
          taskId: task.id,
          taskName: task.name,
          triggerType: task.schedule.triggerType,
          cronExpression: task.schedule.cronExpression,
          interval: task.schedule.interval,
          enabled: task.enabled,
          isScheduled: isRunning
        })
      }
    }

    res.json({
      success: true,
      message: '获取定时任务状态成功',
      data: {
        totalScheduled: scheduledTasks.size,
        tasks: scheduleStatus
      }
    })
  } catch (error) {
    logger.error('获取定时任务状态失败', error)
    res.status(500).json({
      success: false,
      message: '获取定时任务状态失败'
    })
  }
})

// 清理所有定时任务（服务器关闭时使用）
const cleanupAllScheduledTasks = () => {
  logger.info(`开始清理所有定时任务，当前任务数: ${scheduledTasks.size}`)

  for (const [taskId, scheduledTask] of scheduledTasks) {
    try {
      if (typeof scheduledTask.destroy === 'function') {
        scheduledTask.destroy()
      } else if (typeof scheduledTask === 'number') {
        clearInterval(scheduledTask)
      }
      logger.info(`已清理定时任务: ${taskId}`)
    } catch (error) {
      logger.error(`清理定时任务失败: ${taskId}`, error)
    }
  }

  scheduledTasks.clear()
  logger.info('所有定时任务已清理完成')
}

// 监听进程退出事件，清理定时任务
process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在清理定时任务...')
  cleanupAllScheduledTasks()
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在清理定时任务...')
  cleanupAllScheduledTasks()
  process.exit(0)
})

// 强制重新加载所有定时任务
router.post('/schedule/reload', async (req, res) => {
  try {
    logger.info('开始强制重新加载所有定时任务')

    // 清理所有现有的定时任务
    cleanupAllScheduledTasks()

    // 重新加载任务
    const tasks = await readTasks()
    let reloadedCount = 0

    for (const task of tasks) {
      if (task.enabled && task.schedule && task.schedule.triggerType !== 'manual') {
        try {
          scheduleTask(task, task.schedule, true) // 跳过内部的unschedule
          reloadedCount++
          logger.info(`重新加载定时任务: ${task.name} (${task.schedule.triggerType})`)
        } catch (error) {
          logger.error(`重新加载任务 ${task.name} 的定时任务失败`, error)
        }
      }
    }

    logger.info(`定时任务重新加载完成，共重新加载 ${reloadedCount} 个定时任务`)
    debugScheduledTasks()

    res.json({
      success: true,
      message: '定时任务重新加载成功',
      data: {
        totalTasks: tasks.length,
        reloadedCount,
        currentScheduledCount: scheduledTasks.size
      }
    })
  } catch (error) {
    logger.error('重新加载定时任务失败', error)
    res.status(500).json({
      success: false,
      message: '重新加载定时任务失败'
    })
  }
})

// 验证定时任务一致性接口
router.get('/schedule/validate', async (req, res) => {
  try {
    const result = await validateScheduledTasksConsistency()

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '一致性验证失败'
      })
    }

    res.json({
      success: true,
      message: result.consistent ? '定时任务一致性验证通过' : '发现定时任务不一致',
      data: result
    })
  } catch (error) {
    logger.error('验证定时任务一致性失败', error)
    res.status(500).json({
      success: false,
      message: '验证定时任务一致性失败'
    })
  }
})

export default router
