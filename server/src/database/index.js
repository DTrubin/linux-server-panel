import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保data目录存在
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// JSON文件路径
const dbFiles = {
  users: path.join(dataDir, 'users.json'),
  tasks: path.join(dataDir, 'tasks.json'),
  task_executions: path.join(dataDir, 'task_executions.json'),
  system_logs: path.join(dataDir, 'system_logs.json'),
  audit_logs: path.join(dataDir, 'audit_logs.json'),
  system_config: path.join(dataDir, 'system_config.json'),
  file_backups: path.join(dataDir, 'file_backups.json')
}

// 读取JSON文件
const readJsonFile = (filePath, defaultValue = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(data)
      // 确保返回的数据类型与默认值一致
      return parsed !== null && parsed !== undefined ? parsed : defaultValue
    }
    return defaultValue
  } catch (error) {
    logger?.error('database', `读取文件失败`, { filePath, error })
    return defaultValue // 返回默认值而不是空对象
  }
}

// 写入JSON文件
const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (error) {
    logger?.error('database', `写入文件失败`, { filePath, error: error.message })
    throw error
  }
}

// 数据库类
class JsonDatabase {
  constructor() {
    this.data = {}
    this.loadAllData()
  }

  // 加载所有数据
  loadAllData() {
    Object.keys(dbFiles).forEach(table => {
      this.data[table] = readJsonFile(dbFiles[table], [])
    })
  }

  // 保存特定表数据
  saveTable(table) {
    if (dbFiles[table]) {
      writeJsonFile(dbFiles[table], this.data[table])
    }
  }

  // 获取表数据
  getTable(table) {
    const tableData = this.data[table]
    // 确保返回的是数组
    if (Array.isArray(tableData)) {
      return tableData
    }
    // 如果不是数组，初始化为空数组并保存
    this.data[table] = []
    return this.data[table]
  }

  // 插入数据
  insert(table, record) {
    if (!this.data[table]) {
      this.data[table] = []
    }

    const newRecord = {
      id: uuidv4(),
      ...record,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    this.data[table].push(newRecord)
    this.saveTable(table)
    return newRecord
  }

  // 根据ID查找
  findById(table, id) {
    const records = this.getTable(table)
    return records.find(record => record.id === id)
  }

  // 根据条件查找一个
  findOne(table, condition) {
    const records = this.getTable(table)
    return records.find(record => {
      return Object.keys(condition).every(key => record[key] === condition[key])
    })
  }

  // 根据条件查找多个
  findMany(table, condition = {}) {
    const records = this.getTable(table)
    if (Object.keys(condition).length === 0) {
      return records
    }

    return records.filter(record => {
      return Object.keys(condition).every(key => record[key] === condition[key])
    })
  }

  // 更新数据
  update(table, id, updates) {
    const records = this.getTable(table)
    const index = records.findIndex(record => record.id === id)

    if (index === -1) {
      return null
    }

    this.data[table][index] = {
      ...records[index],
      ...updates,
      updated_at: new Date().toISOString()
    }

    this.saveTable(table)
    return this.data[table][index]
  }

  // 删除数据
  delete(table, id) {
    const records = this.getTable(table)
    const index = records.findIndex(record => record.id === id)

    if (index === -1) {
      return false
    }

    this.data[table].splice(index, 1)
    this.saveTable(table)
    return true
  }

  // 根据条件删除多个
  deleteMany(table, condition) {
    const records = this.getTable(table)
    const toDelete = records.filter(record => {
      return Object.keys(condition).every(key => record[key] === condition[key])
    })

    this.data[table] = records.filter(record => {
      return !Object.keys(condition).every(key => record[key] === condition[key])
    })

    this.saveTable(table)
    return toDelete.length
  }

  // 分页查询
  paginate(table, page = 1, pageSize = 10, condition = {}) {
    const allRecords = this.findMany(table, condition)
    const total = allRecords.length
    const totalPages = Math.ceil(total / pageSize)
    const offset = (page - 1) * pageSize
    const records = allRecords.slice(offset, offset + pageSize)

    return {
      records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    }
  }

  // 计数
  count(table, condition = {}) {
    return this.findMany(table, condition).length
  }
}

// 创建数据库实例
const db = new JsonDatabase()

// 初始化数据库
export const initDatabase = () => {
  try {
    logger.mark('database', '正在初始化JSON数据库...')

    // 确保所有表文件存在
    Object.keys(dbFiles).forEach(table => {
      if (!fs.existsSync(dbFiles[table])) {
        writeJsonFile(dbFiles[table], [])
      }
    })

    logger.mark('database', 'JSON数据库初始化完成')
  } catch (error) {
    logger.error('database', '初始化数据库失败:', error)
    throw error
  }
}

// 插入初始数据
export const insertInitialData = async () => {
  try {
    // 检查是否已有管理员用户
    const adminUser = db.findOne('users', { username: 'admin' })

    if (!adminUser) {
      logger.log('创建默认管理员用户 ' + 'admin:' + global.__config.adminDefaultPassword)
      const defaultPassword = global.__config.adminDefaultPassword // 可通过环境变量设置
      const hashedPassword = await bcrypt.hash(defaultPassword, 10)

      // 插入默认管理员用户
      db.insert('users', {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@localhost',
        phone: '',
        is_active: true
      })
    }

    // 插入默认系统配置
    const systemConfig = db.findOne('system_config', { key: 'general' })
    if (!systemConfig) {
      db.insert('system_config', {
        key: 'general',
        value: {
          siteName: 'Linux服务器管理面板',
          timezone: 'Asia/Shanghai',
          language: 'zh-CN',
          theme: 'light',
          autoRefresh: true,
          refreshInterval: 30,
          maxLogSize: 1000,
          sessionTimeout: 24,
          enableNotifications: true,
          maintenanceMode: false
        }
      })
    }

    logger.mark('初始数据插入完成')
  } catch (error) {
    logger.error('插入初始数据失败:', error)
    throw error
  }
}

// 导出函数
export default {
  db,
  initDatabase,
  insertInitialData,
  readJsonFile,
  writeJsonFile
};
