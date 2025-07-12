<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useSystemResourceStore } from '@/store/modules/systemResource'
import { ChartManager, createChartId } from '@/utils/chartManager'
import { type ECOption } from '@/utils/echarts'

const systemResourceStore = useSystemResourceStore()
const chartContainer = ref<HTMLElement | null>(null)
const chartId = createChartId('memory-chart')
let updateTimer: number | null = null
let isDestroyed = ref(false)

function initMemoryChart() {
  if (isDestroyed.value || !chartContainer.value) return

  try {
    // 使用图表管理器创建图表
    const chart = ChartManager.createChart(chartId, chartContainer.value)
    const option: ECOption = {
      title: { text: '内存使用率', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        name: '内存',
        type: 'line',
        smooth: true,
        data: [],
        lineStyle: { color: '#67C23A' },
        areaStyle: { color: 'rgba(103, 194, 58, 0.1)' }
      }],
      grid: { left: 50, right: 30, top: 50, bottom: 30 }
    }
    chart.setOption(option)
  } catch (error) {
    console.error('初始化内存图表失败:', error)
    ElMessage.error('初始化内存图表失败，请稍后重试。')
  }
}

function updateMemoryChart() {
  if (isDestroyed.value) return

  try {
    const chart = ChartManager.getChart(chartId)
    if (!chart) return

    const memoryHistory = systemResourceStore.getMemoryHistory
    if (!memoryHistory || memoryHistory.length === 0) return

    const times = memoryHistory.map(item => item?.time || '')
    const values = memoryHistory.map(item => typeof item?.value === 'number' ? item.value : 0)

    chart.setOption({
      xAxis: { data: times },
      series: [{
        name: '内存',
        type: 'line',
        smooth: true,
        data: values,
        lineStyle: { color: '#67C23A' },
        areaStyle: { color: 'rgba(103, 194, 58, 0.1)' }
      }]
    })
  } catch (error) {
    console.error('更新内存图表失败:', error)
    ElMessage.error('更新内存图表失败，请稍后重试。')
  }
}

function resizeHandler() {
  if (isDestroyed.value) return
  ChartManager.resizeChart(chartId)
}

function cleanupChart() {
  isDestroyed.value = true

  // 清理定时器
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }

  // 移除事件监听器
  window.removeEventListener('resize', resizeHandler)

  // 使用图表管理器销毁图表
  ChartManager.destroyChart(chartId)
}

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      if (!isDestroyed.value) {
        initMemoryChart()
        updateMemoryChart()
      }
    }, 100)
  })

  // 每1500ms更新一次图表
  updateTimer = setInterval(() => {
    if (!isDestroyed.value) {
      updateMemoryChart()
    }
  }, 1500)

  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  cleanupChart()
})

onUnmounted(() => {
  cleanupChart()
})
</script>

<template>
  <el-card class="chart-card" shadow="hover">
    <div ref="chartContainer" class="chart-container"></div>
  </el-card>
</template>

<style scoped>
.chart-container {
  height: 300px;
  width: 100%;
}
</style>
