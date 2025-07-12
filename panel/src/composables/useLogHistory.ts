import { ref, computed } from 'vue'
import type { FileItem } from '@/types/file'

interface LogHistoryItem {
  path: string
  name: string
  size?: number
  lastOpened: number
  type: 'file'
}

const STORAGE_KEY = 'log-viewer-history'
const MAX_HISTORY_ITEMS = 20

export function useLogHistory() {
  const historyItems = ref<LogHistoryItem[]>([])

  // 从本地存储加载历史记录
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const items = JSON.parse(stored) as LogHistoryItem[]
        // 按最后打开时间倒序排列
        historyItems.value = items.sort((a, b) => b.lastOpened - a.lastOpened)
      }
    } catch (error) {
      console.error('加载历史日志记录失败:', error)
      historyItems.value = []
    }
  }

  // 保存历史记录到本地存储
  const saveHistory = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyItems.value))
    } catch (error) {
      console.error('保存历史日志记录失败:', error)
    }
  }

  // 添加日志文件到历史记录
  const addToHistory = (file: FileItem) => {
    const item: LogHistoryItem = {
      path: file.path,
      name: file.name,
      size: file.size,
      lastOpened: Date.now(),
      type: 'file'
    }

    // 移除已存在的相同路径的记录
    historyItems.value = historyItems.value.filter(h => h.path !== item.path)

    // 添加到开头
    historyItems.value.unshift(item)

    // 限制最大数量
    if (historyItems.value.length > MAX_HISTORY_ITEMS) {
      historyItems.value = historyItems.value.slice(0, MAX_HISTORY_ITEMS)
    }

    saveHistory()
  }

  // 从历史记录中移除项目
  const removeFromHistory = (path: string) => {
    historyItems.value = historyItems.value.filter(h => h.path !== path)
    saveHistory()
  }

  // 清空历史记录
  const clearHistory = () => {
    historyItems.value = []
    saveHistory()
  }

  // 格式化文件大小
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '未知大小'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化最后打开时间
  const formatLastOpened = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    return new Date(timestamp).toLocaleDateString()
  }

  // 计算属性
  const hasHistory = computed(() => historyItems.value.length > 0)

  // 初始化时加载历史记录
  loadHistory()

  return {
    historyItems,
    hasHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    formatFileSize,
    formatLastOpened
  }
}
