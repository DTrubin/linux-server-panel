import { ref, computed, nextTick, readonly } from 'vue'
import type { Ref } from 'vue'

interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  buffer?: number
  overscan?: number
}

interface VirtualScrollItem {
  id: string | number
  data: any
}

export function useVirtualScroll<T extends VirtualScrollItem>(
  items: Ref<T[]>,
  options: VirtualScrollOptions
) {
  const scrollTop = ref(0)
  const isScrolling = ref(false)
  let scrollTimer: number | null = null

  const {
    itemHeight,
    containerHeight,
    buffer = 5,
    overscan = 3
  } = options

  // 计算可视区域的项目数量
  const visibleCount = computed(() => {
    return Math.ceil(containerHeight / itemHeight)
  })

  // 计算开始索引
  const startIndex = computed(() => {
    return Math.max(0, Math.floor(scrollTop.value / itemHeight) - buffer)
  })

  // 计算结束索引
  const endIndex = computed(() => {
    return Math.min(
      items.value.length - 1,
      startIndex.value + visibleCount.value + buffer + overscan
    )
  })

  // 计算可视区域的项目
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value + 1)
  })

  // 计算偏移量
  const offsetY = computed(() => {
    return startIndex.value * itemHeight
  })

  // 计算总高度
  const totalHeight = computed(() => {
    return items.value.length * itemHeight
  })

  // 处理滚动事件
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop

    // 设置滚动状态
    isScrolling.value = true
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
    scrollTimer = window.setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }

  // 滚动到指定索引
  const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const maxScrollTop = totalHeight.value - containerHeight
    let targetScrollTop: number

    switch (align) {
      case 'start':
        targetScrollTop = index * itemHeight
        break
      case 'center':
        targetScrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2
        break
      case 'end':
        targetScrollTop = index * itemHeight - containerHeight + itemHeight
        break
    }

    scrollTop.value = Math.max(0, Math.min(maxScrollTop, targetScrollTop))
  }

  // 滚动到底部
  const scrollToBottom = (containerElement?: HTMLElement) => {
    const maxScrollTop = Math.max(0, totalHeight.value - containerHeight)
    scrollTop.value = maxScrollTop

    // 如果提供了容器元素，也更新其滚动位置
    if (containerElement) {
      containerElement.scrollTop = maxScrollTop
    }
  }

  // 检查是否在底部
  const isAtBottom = computed(() => {
    const threshold = 10
    const maxScrollTop = totalHeight.value - containerHeight
    return scrollTop.value >= maxScrollTop - threshold
  })

  // 获取滚动容器的样式
  const getContainerStyle = () => ({
    height: `${containerHeight}px`,
    overflow: 'auto'
  })

  // 获取包装器的样式
  const getWrapperStyle = () => ({
    height: `${totalHeight.value}px`,
    position: 'relative' as const
  })

  // 获取内容区域的样式
  const getContentStyle = () => ({
    transform: `translateY(${offsetY.value}px)`,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0
  })

  return {
    // 状态
    scrollTop: readonly(scrollTop),
    isScrolling: readonly(isScrolling),
    isAtBottom,

    // 计算属性
    startIndex,
    endIndex,
    visibleItems,
    visibleCount,
    offsetY,
    totalHeight,

    // 方法
    handleScroll,
    scrollToIndex,
    scrollToBottom,

    // 样式
    getContainerStyle,
    getWrapperStyle,
    getContentStyle
  }
}

// 防抖函数
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: number | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      fn(...args)
    }, delay)
  }) as T
}

// 节流函数
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let lastCall = 0

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }) as T
}
