<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Refresh, Delete, Search, Loading, Bottom, Clock, CopyDocument, Check } from '@element-plus/icons-vue'
import FileSelector from '@/components/file-manager/FileSelector.vue'
import { getFileLinesInfo, getFileLines } from '@/api/logs'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import { useLogHistory } from '@/composables/useLogHistory'
import type { FileItem } from '@/types/file'

interface LogLine {
  content: string
  type: 'info' | 'warn' | 'error' | 'debug' | 'default'
  isPlaceholder?: boolean // 标记是否为占位符
}

interface LogItem {
  id: number
  data: LogLine
}

// 响应式数据
const showFileSelector = ref(false)
const showHistoryDialog = ref(false)
const showLogDetailDialog = ref(false)
const selectedLogDetail = ref<LogLine | null>(null)
const loading = ref(false)
const refreshing = ref(false)
const currentFile = ref<FileItem | null>(null)
const logLines = ref<LogLine[]>([])
const searchKeyword = ref('')
const selectedLineIndex = ref(-1)
const loadedRanges = ref<{ start: number, end: number }[]>([]) // 记录已加载的行范围
const virtualScrollInitialized = ref(false) // 虚拟滚动是否已初始化完成
const scrollingToBottom = ref(false) // 是否正在执行滚动到底部操作

// 历史日志功能
const logHistory = useLogHistory()

// 虚拟滚动相关
const logContainer = ref<HTMLElement>()
const containerHeight = ref(720)
const itemHeight = 30 // 固定行高度，单行显示

// 将日志行转换为虚拟滚动项目
const virtualScrollItems = computed<LogItem[]>(() => {
  // 如果有搜索关键词，只返回匹配的项目
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    const items: LogItem[] = []

    for (let i = 0; i < logLines.value.length; i++) {
      const line = logLines.value[i]
      if (line && !line.isPlaceholder && line.content.toLowerCase().includes(keyword)) {
        items.push({
          id: i,
          data: line
        })
      }
    }

    return items
  }

  // 返回已加载的日志行
  return logLines.value.map((line, index) => ({
    id: index,
    data: line || { content: '正在加载...', type: 'default' as const, isPlaceholder: true }
  })).filter((item, index) => index < totalLines.value)
})

// 虚拟滚动实例
let virtualScroll = useVirtualScroll(virtualScrollItems, {
  itemHeight,
  containerHeight: containerHeight.value,
  buffer: 5,
  overscan: 3
})

// 重新初始化虚拟滚动（当容器高度变化时）
const reinitVirtualScroll = () => {
  // 保存当前滚动位置
  const currentScrollTop = virtualScroll?.scrollTop?.value || 0

  virtualScroll = useVirtualScroll(virtualScrollItems, {
    itemHeight,
    containerHeight: containerHeight.value,
    buffer: 5,
    overscan: 3
  })

  // 恢复滚动位置
  if (currentScrollTop > 0) {
    // 等待下一帧再恢复滚动位置
    nextTick(() => {
      const scrollContainer = logContainer.value?.querySelector('.virtual-scroll-container') as HTMLElement
      if (scrollContainer) {
        scrollContainer.scrollTop = currentScrollTop
        // 触发滚动事件来更新虚拟滚动状态
        const scrollEvent = new Event('scroll')
        scrollContainer.dispatchEvent(scrollEvent)
      }
    })
  }
}

// 流式加载相关
const fileSize = ref(0)
const totalLines = ref(0) // 文件总行数
const loadedLines = ref(0)


// 滚动到底部按钮的禁用状态
const scrollToBottomDisabled = computed(() => {
  return !virtualScrollInitialized.value || loading.value || !currentFile.value || scrollingToBottom.value
})

// 组件挂载时初始化
onMounted(async () => {
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

// 日志文件过滤器
const logFileFilter = (file: FileItem): boolean => {
  if (file.type === 'directory') return true

  // 常见的日志文件扩展名
  const logExtensions = ['.log', '.txt', '.out', '.err']
  const hasLogExtension = logExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

  // 常见的日志文件名模式
  const logPatterns = [
    /\.log$/i,
    /\.log\.\d+$/i,
    /access/i,
    /error/i,
    /debug/i,
    /info/i,
    /warn/i,
    /app/i,
    /system/i,
    /kernel/i,
    /syslog/i,
    /messages/i
  ]

  const matchesPattern = logPatterns.some(pattern => pattern.test(file.name))

  return hasLogExtension || matchesPattern
}

// 打开文件选择器
const openFileSelector = () => {
  showFileSelector.value = true
}

// 处理文件选择
const handleFileSelected = async (file: FileItem) => {
  currentFile.value = file
  await loadLogFile()
}

// 加载日志文件
const loadLogFile = async () => {
  if (!currentFile.value || loading.value) return

  loading.value = false
  virtualScrollInitialized.value = false
  logLines.value = []
  loadedLines.value = 0
  totalLines.value = 0
  loadedRanges.value = []

  try {
    // 获取文件信息
    const linesInfo = await getFileLinesInfo(currentFile.value.path)
    totalLines.value = linesInfo.totalLines
    fileSize.value = linesInfo.fileSize

    // 初始化日志数组
    logLines.value = new Array(totalLines.value).fill(null)

    // 设置预加载队列
    setupLazyLoadQueue()

    // 标记初始化完成
    virtualScrollInitialized.value = true
    reinitVirtualScroll()
    await nextTick()

    // 添加到历史记录
    logHistory.addToHistory(currentFile.value)

    // 启动后台预加载
    processLazyLoadQueue()

  } catch (error) {
    console.error('加载日志文件失败:', error)
    ElMessage.error('加载日志文件失败')
  } finally {
    loading.value = false
  }
}

// 获取日志行的CSS类名
const getLineClass = (line: LogLine): string => {
  return `log-line-${line.type}`
}

// 刷新日志
const refreshLog = async () => {
  if (!currentFile.value || refreshing.value) return

  refreshing.value = true
  try {
    // 保存当前的滚动位置
    const scrollContainer = logContainer.value?.querySelector('.virtual-scroll-container') as HTMLElement
    const currentScrollTop = scrollContainer?.scrollTop || 0

    // 重新加载日志文件
    await loadLogFile()

    // 恢复滚动位置
    if (scrollContainer && currentScrollTop > 0) {
      await nextTick()
      scrollContainer.scrollTop = currentScrollTop
      const scrollEvent = new Event('scroll')
      scrollContainer.dispatchEvent(scrollEvent)
    }

    // 如果有待加载的内容，启动预加载
    if (totalLines.value > 100 && lazyLoadQueue.value.length > 0) {
      setTimeout(() => processLazyLoadQueue(), 1000)
    }

    ElMessage.success('日志已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

// 清空查看器
const clearViewer = () => {
  currentFile.value = null
  logLines.value = []
  searchKeyword.value = ''
  selectedLineIndex.value = -1
  totalLines.value = 0
  loadedRanges.value = []
  loadedLines.value = 0
  virtualScrollInitialized.value = false // 重置初始化状态
  scrollingToBottom.value = false // 重置滚动状态

  // 清空懒加载队列
  lazyLoadQueue.value = []
  isLazyLoading.value = false

  // 重置虚拟滚动状态
  if (logContainer.value) {
    const scrollContainer = logContainer.value.querySelector('.virtual-scroll-container')
    if (scrollContainer) {
      scrollContainer.scrollTop = 0
    }
  }

  // 清理所有定时器
  if ((window as any).preloadTimer) {
    clearTimeout((window as any).preloadTimer)
  }
  if ((window as any).smartPreloadTimer) {
    clearTimeout((window as any).smartPreloadTimer)
  }

  ElMessage.success('已清空日志查看器')
}

// 处理搜索
const handleSearch = () => {
  // 重置滚动位置
  if (logContainer.value) {
    const scrollContainer = logContainer.value.querySelector('.virtual-scroll-container')
    if (scrollContainer) {
      scrollContainer.scrollTop = 0
    }
  }
}

// 高亮搜索关键词
const highlightSearchTerm = (content: string): string => {
  if (!searchKeyword.value) return content

  const keyword = searchKeyword.value
  const regex = new RegExp(`(${keyword})`, 'gi')
  return content.replace(regex, '<mark>$1</mark>')
}

// 处理虚拟滚动
const handleScroll = (event: Event) => {
  virtualScroll.handleScroll(event)

  // 获取当前可视区域的行号范围
  const visibleItems = virtualScroll.visibleItems.value
  if (visibleItems.length > 0) {
    const viewportStartLine = visibleItems[0].id + 1 // 转换为1基索引
    const viewportEndLine = visibleItems[visibleItems.length - 1].id + 1

    // 基于当前可视区域和文件大小预加载周围内容
    if (totalLines.value > 50 && !loading.value) {
      // 检查是否有占位符内容在视口中
      const hasPlaceholdersInViewport = visibleItems.some(item =>
        item.data.isPlaceholder
      )

      // 防抖处理，避免频繁触发预加载
      clearTimeout((window as any).preloadTimer);
      (window as any).preloadTimer = setTimeout(() => {
        if (hasPlaceholdersInViewport) {
          // 视口中有占位符，立即加载
          preloadAroundViewport(viewportStartLine, viewportEndLine)
        } else {
          // 视口中没有占位符，延迟预加载周围内容
          setTimeout(() => {
            preloadAroundViewport(viewportStartLine, viewportEndLine)
          }, 500)
        }
      }, hasPlaceholdersInViewport ? 100 : 300) // 有占位符时更快响应
    }
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  if (!currentFile.value || totalLines.value === 0 || scrollingToBottom.value) return

  scrollingToBottom.value = true

  try {
    // 获取滚动容器元素
    const scrollContainer = logContainer.value?.querySelector('.virtual-scroll-container') as HTMLElement
    if (!scrollContainer) {
      console.error('找不到滚动容器')
      return
    }

    // 等待DOM更新完成
    await nextTick()

    // 计算最大滚动位置
    const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)

    console.log('滚动到底部:', {
      scrollHeight: scrollContainer.scrollHeight,
      clientHeight: scrollContainer.clientHeight,
      maxScrollTop: maxScrollTop,
      totalLines: totalLines.value
    })

    // 设置滚动位置
    scrollContainer.scrollTop = maxScrollTop

    // 更新虚拟滚动的内部状态
    virtualScroll.scrollToBottom(scrollContainer)

    // 触发滚动事件以更新虚拟滚动状态
    const scrollEvent = new Event('scroll')
    scrollContainer.dispatchEvent(scrollEvent)

  } catch (error) {
    console.error('滚动到底部失败:', error)
    ElMessage.error('滚动到底部失败')
  } finally {
    setTimeout(() => {
      scrollingToBottom.value = false
    }, 300)
  }
}

// 更新容器高度
const updateContainerHeight = () => {
  if (logContainer.value) {
    const rect = logContainer.value.getBoundingClientRect()
    containerHeight.value = window.innerHeight - rect.top - 100
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 加载进度计算
const loadingProgress = computed(() => {
  if (totalLines.value === 0) return 0
  return Math.round((loadedLines.value / totalLines.value) * 100)
})

// 加载状态描述
const loadingStatus = computed(() => {
  if (loading.value) return '正在加载日志文件...'
  if (isLazyLoading.value) return `后台预加载中 (剩余 ${lazyLoadQueue.value.length} 个任务)`
  if (virtualScrollInitialized.value) {
    if (loadingProgress.value >= 100) return '全部内容已加载'
    return `已就绪 (${loadingProgress.value}% 已加载)`
  }
  return '等待加载'
})

// 获取加载详细信息
const getLoadingTooltip = computed(() => {
  const ranges = loadedRanges.value
  if (ranges.length === 0) return '尚未加载任何内容'

  const rangeText = ranges.map(range =>
    `第${range.start + 1}-${range.end + 1}行`
  ).join(', ')

  return `已加载范围: ${rangeText}\n总计: ${loadedLines.value} 行\n待预加载: ${lazyLoadQueue.value.length} 个区块`
})

// 懒加载队列和状态管理
const lazyLoadQueue = ref<{ startLine: number, lineCount: number, priority: number }[]>([])
const isLazyLoading = ref(false)

// 添加到懒加载队列
const addToLazyLoadQueue = (startLine: number, lineCount: number, priority: number) => {
  // 检查是否已经在队列中或已加载
  const isAlreadyQueued = lazyLoadQueue.value.some(item =>
    item.startLine === startLine && item.lineCount === lineCount
  )

  const isAlreadyLoaded = loadedRanges.value.some(range => {
    const requestStart = startLine - 1
    const requestEnd = startLine + lineCount - 2
    return requestStart >= range.start && requestEnd <= range.end
  })

  if (!isAlreadyQueued && !isAlreadyLoaded) {
    lazyLoadQueue.value.push({ startLine, lineCount, priority })
    // 按优先级排序（数字越小优先级越高）
    lazyLoadQueue.value.sort((a, b) => a.priority - b.priority)
  }
}

// 处理懒加载队列
const processLazyLoadQueue = async () => {
  if (isLazyLoading.value || lazyLoadQueue.value.length === 0) return

  isLazyLoading.value = true
  const startTime = Date.now()
  const maxProcessingTime = 5000 // 最大处理时间5秒，避免长时间阻塞

  try {
    let processedCount = 0
    while (lazyLoadQueue.value.length > 0 && Date.now() - startTime < maxProcessingTime) {
      const item = lazyLoadQueue.value.shift()
      if (!item) break

      // 检查是否还需要加载（可能在等待期间已被其他操作加载）
      const isAlreadyLoaded = loadedRanges.value.some(range => {
        const requestStart = item.startLine - 1
        const requestEnd = item.startLine + item.lineCount - 2
        return requestStart >= range.start && requestEnd <= range.end
      })

      if (!isAlreadyLoaded) {
        await loadLinesRange(item.startLine, item.lineCount)
        processedCount++

        // 给UI响应时间，避免阻塞用户交互
        if (processedCount % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }
    }

    // 如果还有未处理的任务，延后继续处理
    if (lazyLoadQueue.value.length > 0) {
      setTimeout(() => processLazyLoadQueue(), 2000) // 2秒后继续处理
    }

  } catch (error) {
    console.error('处理懒加载队列失败:', error)
  } finally {
    isLazyLoading.value = false
  }
}

// 基于滚动位置的预加载
const preloadAroundViewport = async (viewportStartLine: number, viewportEndLine: number) => {
  if (!currentFile.value || loading.value || isLazyLoading.value) return

  // 根据文件大小调整预加载策略
  const PRELOAD_BUFFER = totalLines.value > 10000 ? 200 : 100 // 大文件使用更大的缓冲区
  const BATCH_SIZE = 50

  // 计算需要预加载的范围
  const preloadStart = Math.max(1, viewportStartLine - PRELOAD_BUFFER)
  const preloadEnd = Math.min(totalLines.value, viewportEndLine + PRELOAD_BUFFER)

  // 分批添加到懒加载队列
  for (let start = preloadStart; start <= preloadEnd; start += BATCH_SIZE) {
    const batchEnd = Math.min(start + BATCH_SIZE - 1, preloadEnd)
    const lineCount = batchEnd - start + 1

    // 检查这个范围是否已经加载
    const isAlreadyLoaded = loadedRanges.value.some(range => {
      const requestStart = start - 1
      const requestEnd = batchEnd - 1
      return requestStart >= range.start && requestEnd <= range.end
    })

    if (!isAlreadyLoaded) {
      // 根据距离当前视口的远近设置优先级
      const distanceFromViewport = Math.min(
        Math.abs(start - viewportStartLine),
        Math.abs(batchEnd - viewportEndLine)
      )

      // 距离视口越近优先级越高（数字越小）
      let priority = Math.floor(distanceFromViewport / 50) + 1

      // 对于可见范围内的内容，给予最高优先级
      if (start >= viewportStartLine && batchEnd <= viewportEndLine) {
        priority = 0
      }

      addToLazyLoadQueue(start, lineCount, priority)
    }
  }

  // 触发队列处理：避免频繁触发
  if (lazyLoadQueue.value.length > 0) {
    clearTimeout((window as any).smartPreloadTimer)
      ; (window as any).smartPreloadTimer = setTimeout(() => {
        processLazyLoadQueue()
      }, 200) // 延迟200ms避免频繁触发
  }
}

// 设置懒加载队列
const setupLazyLoadQueue = () => {
  // 清空现有队列
  lazyLoadQueue.value = [{ startLine: 1, lineCount: 50, priority: 1 }]
}

// 加载指定范围的行
const loadLinesRange = async (startLine: number, lineCount: number): Promise<void> => {
  if (!currentFile.value || loading.value) return

  // 检查是否已经加载过这个范围
  const isAlreadyLoaded = loadedRanges.value.some(range => {
    const requestStart = startLine - 1 // 转换为数组索引
    const requestEnd = startLine + lineCount - 2
    return requestStart >= range.start && requestEnd <= range.end
  })

  if (isAlreadyLoaded) {
    console.log(`行范围 ${startLine}-${startLine + lineCount - 1} 已加载，跳过`)
    return
  }

  // 确保不超过后端限制
  const maxLineCount = 50
  if (lineCount > maxLineCount) {
    console.log(`请求行数 ${lineCount} 超过限制，分批处理`)
    // 分批加载
    for (let offset = 0; offset < lineCount; offset += maxLineCount) {
      const batchStart = startLine + offset
      const batchCount = Math.min(maxLineCount, lineCount - offset)
      await loadLinesRange(batchStart, batchCount)
    }
    return
  }

  try {
    const response = await getFileLines(currentFile.value.path, {
      startLine,
      lineCount
    })

    // 将获取的行数据填入对应位置
    response.lines.forEach((lineData) => {
      const index = lineData.lineNumber - 1 // 转换为数组索引
      if (index >= 0 && index < totalLines.value) {
        logLines.value[index] = {
          content: lineData.content || '',
          type: lineData.type as LogLine['type'],
          isPlaceholder: false
        }
      }
    })

    // 更新已加载范围
    const endLine = startLine + response.actualLineCount - 1
    const newRange = {
      start: startLine - 1, // 转换为数组索引
      end: endLine - 1
    }

    // 检查是否与现有范围重叠，如果是则合并
    let merged = false
    for (let i = 0; i < loadedRanges.value.length; i++) {
      const existingRange = loadedRanges.value[i]
      if (newRange.start <= existingRange.end + 1 && newRange.end >= existingRange.start - 1) {
        // 范围重叠或相邻，合并
        loadedRanges.value[i] = {
          start: Math.min(existingRange.start, newRange.start),
          end: Math.max(existingRange.end, newRange.end)
        }
        merged = true
        break
      }
    }

    if (!merged) {
      loadedRanges.value.push(newRange)
    }

    // 排序并合并重叠的范围
    loadedRanges.value.sort((a, b) => a.start - b.start)
    const mergedRanges: { start: number, end: number }[] = []
    for (const range of loadedRanges.value) {
      if (mergedRanges.length === 0 || mergedRanges[mergedRanges.length - 1].end < range.start - 1) {
        mergedRanges.push(range)
      } else {
        mergedRanges[mergedRanges.length - 1].end = Math.max(mergedRanges[mergedRanges.length - 1].end, range.end)
      }
    }
    loadedRanges.value = mergedRanges

    // 更新已加载行数统计
    loadedLines.value = loadedRanges.value.reduce((total, range) =>
      total + (range.end - range.start + 1), 0
    )
  } catch (error) {
    console.error('加载日志行失败:', error)
    ElMessage.error(`加载第 ${startLine}-${startLine + lineCount - 1} 行失败`)
  }
}

// 选择历史日志项
const selectHistoryItem = async (item: any) => {
  const fileItem: FileItem = {
    name: item.name,
    path: item.path,
    type: 'file',
    size: item.size || 0,
    modified: new Date(item.lastOpened).toISOString(),
    permissions: '-rw-r--r--' // 默认权限
  }

  showHistoryDialog.value = false
  currentFile.value = fileItem
  await loadLogFile()
}

// 从历史记录中移除项目
const removeHistoryItem = (path: string) => {
  logHistory.removeFromHistory(path)
  ElMessage.success('已从历史记录中移除')
}

// 清空所有历史记录
const clearAllHistory = () => {
  logHistory.clearHistory()
  ElMessage.success('已清空所有历史记录')
}

// 显示日志详情弹窗
const showLogDetail = (logLine: LogLine) => {
  selectedLogDetail.value = logLine
  showLogDetailDialog.value = true
}

// 获取日志类型对应的标签类型
const getLogTypeTagType = (type: string): string => {
  switch (type) {
    case 'error':
      return 'danger'
    case 'warn':
      return 'warning'
    case 'info':
      return 'primary'
    case 'debug':
      return 'info'
    default:
      return ''
  }
}

// 复制日志内容到剪贴板
const copyLogContent = async () => {
  if (!selectedLogDetail.value) return

  try {
    await navigator.clipboard.writeText(selectedLogDetail.value.content)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}
</script>

<template>
  <div class="log-viewer-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" @click="openFileSelector" :loading="loading">
          <el-icon>
            <Document />
          </el-icon>
          选择日志文件
        </el-button>

        <el-button @click="showHistoryDialog = true" :disabled="!logHistory.hasHistory.value">
          <el-icon>
            <Clock />
          </el-icon>
          历史日志
        </el-button>

        <!-- 当前文件信息 -->
        <div v-if="currentFile" class="current-file-info">
          <el-tag type="success" size="large">
            <el-icon style="margin-right: 4px;">
              <Document />
            </el-icon>
            {{ currentFile.name }}
          </el-tag>
          <span class="file-stats">
            {{ logHistory.formatFileSize(currentFile.size) }}
            | {{ totalLines }} 行
          </span>
        </div>

        <el-button v-if="currentFile" @click="refreshLog" :loading="refreshing">
          <el-icon>
            <Refresh />
          </el-icon>
          刷新
        </el-button>

        <el-button v-if="currentFile" @click="clearViewer">
          <el-icon>
            <Delete />
          </el-icon>
          清空
        </el-button>

        <el-button v-if="currentFile" @click="scrollToBottom" :disabled="scrollToBottomDisabled">
          <el-icon>
            <Bottom />
          </el-icon>
          滚动到底部
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-input v-model="searchKeyword" placeholder="搜索日志内容..." clearable style="width: 300px" @input="handleSearch">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 文件信息栏 -->
    <div v-if="currentFile" class="file-info">
      <el-tag type="info" size="small">
        {{ currentFile.name }}
      </el-tag>
      <span class="file-size">{{ formatFileSize(fileSize) }}</span>
      <el-tooltip :content="getLoadingTooltip" placement="bottom">
        <span class="progress-info">
          已加载: {{ loadedLines }} / {{ totalLines }} 行
          <span v-if="totalLines > 0" class="progress-percentage">
            ({{ loadingProgress }}%)
          </span>
        </span>
      </el-tooltip>

      <!-- 加载状态指示器 -->
      <span v-if="loading" class="loading-indicator status-loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        {{ loadingStatus }}
      </span>
      <span v-else-if="isLazyLoading" class="loading-indicator status-lazy-loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        {{ loadingStatus }}
      </span>
      <span v-else-if="virtualScrollInitialized" class="loading-indicator status-ready">
        <el-icon style="color: #67c23a;">
          <Check />
        </el-icon>
        {{ loadingStatus }}
      </span>
    </div>

    <!-- 虚拟滚动日志内容 -->
    <div class="log-content" ref="logContainer">
      <div v-if="currentFile" class="virtual-scroll-container" :style="virtualScroll.getContainerStyle()"
        @scroll="handleScroll">
        <!-- 虚拟滚动占位 -->
        <div :style="virtualScroll.getWrapperStyle()">
          <!-- 可视区域的日志行 -->
          <div class="visible-items" :style="virtualScroll.getContentStyle()">
            <div v-for="(item, index) in virtualScroll.visibleItems.value" :key="item.id" class="log-line"
              :class="[getLineClass(item.data), { 'placeholder': item.data.isPlaceholder }]"
              @click="!item.data.isPlaceholder && showLogDetail(item.data)">
              <span class="line-number">{{ item.id + 1 }}</span>
              <span class="line-content" v-if="!item.data.isPlaceholder" v-html="highlightSearchTerm(item.data.content)"
                :title="item.data.content"></span>
              <span class="line-content placeholder-content" v-else>
                <el-icon class="loading-icon">
                  <Loading />
                </el-icon>
                正在加载第 {{ item.id + 1 }} 行...
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-empty :description="loading ? '正在加载日志文件...' : '欢迎使用日志查看器'">
          <template #image>
            <el-icon v-if="loading" class="loading-icon" size="80">
              <Loading />
            </el-icon>
            <el-icon v-else size="80" color="var(--el-text-color-placeholder)">
              <Document />
            </el-icon>
          </template>

          <div v-if="!loading" class="empty-actions">
            <p class="empty-description">
              选择日志后查看。
            </p>

            <div class="action-buttons">
              <el-button type="primary" @click="openFileSelector" size="large">
                <el-icon>
                  <Document />
                </el-icon>
                选择日志文件
              </el-button>

              <el-button v-if="logHistory.hasHistory.value" @click="showHistoryDialog = true" size="large">
                <el-icon>
                  <Clock />
                </el-icon>
                查看历史记录
              </el-button>
            </div>
          </div>
        </el-empty>
      </div>
    </div>

    <!-- 文件选择器 -->
    <FileSelector v-model="showFileSelector" :file-filter="logFileFilter" @confirm="handleFileSelected" />

    <!-- 历史日志弹窗 -->
    <el-dialog v-model="showHistoryDialog" title="历史日志" width="600px" :close-on-click-modal="false">

      <div v-if="logHistory.hasHistory.value" class="history-list">
        <div v-for="item in logHistory.historyItems.value" :key="item.path" class="history-item"
          @click="selectHistoryItem(item)">

          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-details">
              <span class="item-path">{{ item.path }}</span>
              <span class="item-size">{{ logHistory.formatFileSize(item.size) }}</span>
              <span class="item-time">{{ logHistory.formatLastOpened(item.lastOpened) }}</span>
            </div>
          </div>

          <el-button type="danger" size="small" text @click.stop="removeHistoryItem(item.path)">
            <el-icon>
              <Delete />
            </el-icon>
          </el-button>
        </div>
      </div>

      <el-empty v-else description="暂无历史日志记录" />

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showHistoryDialog = false">取消</el-button>
          <el-button v-if="logHistory.hasHistory.value" type="danger" @click="clearAllHistory">
            清空历史
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 日志详情弹窗 -->
    <el-dialog v-model="showLogDetailDialog" title="日志详情" width="80%">

      <div v-if="selectedLogDetail" class="log-detail-content">
        <div class="detail-meta">
          <el-tag :type="getLogTypeTagType(selectedLogDetail.type)" size="small">
            {{ selectedLogDetail.type }}
          </el-tag>
          <span class="detail-length">长度: {{ selectedLogDetail.content.length }} 字符</span>
        </div>

        <div class="detail-text">
          {{ selectedLogDetail.content }}
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="copyLogContent" type="primary">
            <el-icon>
              <CopyDocument />
            </el-icon>
            复制内容
          </el-button>
          <el-button @click="showLogDetailDialog = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.log-viewer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.current-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;

  .file-stats {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.file-size {
  color: var(--el-text-color-secondary);
}

.progress-info {
  color: var(--el-color-primary);
}

.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.status-loading {
  color: var(--el-color-primary);
  background-color: rgba(64, 158, 255, 0.1);
}

.status-lazy-loading {
  color: var(--el-color-warning);
  background-color: rgba(230, 162, 60, 0.1);
}

.status-ready {
  color: var(--el-color-success);
  background-color: rgba(103, 194, 58, 0.1);
}

.progress-percentage {
  color: var(--el-color-primary);
  font-weight: 500;
}

.lazy-queue-info {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: 8px;
}

.log-content {
  flex: 1;
  overflow: hidden;
}

.virtual-scroll-container {
  width: 100%;
  overflow: auto;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 20px;
}

.visible-items {
  width: 100%;
}

.log-line {
  display: flex;
  min-height: 28px;
  padding: 4px 12px;
  cursor: pointer;
  border-left: 2px solid transparent;
  align-items: flex-start;
}

.log-line.selected {
  background-color: rgba(0, 122, 204, 0.2);
  border-left-color: #007acc;
}

.line-number {
  width: 60px;
  flex-shrink: 0;
  text-align: right;
  margin-right: 12px;
  color: #6a9955;
  user-select: none;
  padding-top: 2px;
  line-height: 20px;
}

.log-line.placeholder {
  opacity: 0.6;
  font-style: italic;
}

.log-line.placeholder:hover {
  cursor: default;
  background-color: transparent;
}

.placeholder-content {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-placeholder) !important;
  font-style: italic;
}

.loading-icon {
  font-size: 12px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.line-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
  min-height: 20px;
}

/* 不同日志级别的颜色 */
.log-line-error .line-content {
  color: #f44747;
}

.log-line-warn .line-content {
  color: #ff8c00;
}

.log-line-info .line-content {
  color: #4ec9b0;
}

.log-line-debug .line-content {
  color: #9cdcfe;
}

.log-line-default .line-content {
  color: #d4d4d4;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .loading-icon {
    animation: spin 1s linear infinite;
  }

  .empty-actions {
    text-align: center;

    .empty-description {
      font-size: 14px;
      color: var(--el-text-color-regular);
      line-height: 1.6;
      margin: 16px 0 24px 0;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* 搜索高亮 */
:deep(mark) {
  background-color: #ffd700;
  color: #000;
  padding: 0 2px;
  border-radius: 2px;
}

/* 滚动条样式 */
.virtual-scroll-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: #5a5a5a;
  border-radius: 6px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}

/* 历史日志弹窗样式 */
.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
}

.history-item:last-child {
  margin-bottom: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.item-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-size {
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.item-time {
  color: var(--el-color-primary);
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 日志详情弹窗样式 */
.log-detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color);
}

.detail-length {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-text {
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 50vh;
  overflow-y: auto;
}

.detail-text::-webkit-scrollbar {
  width: 8px;
}

.detail-text::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.detail-text::-webkit-scrollbar-thumb {
  background: #5a5a5a;
  border-radius: 4px;
}

.detail-text::-webkit-scrollbar-thumb:hover {
  background: #6a6a6a;
}
</style>
