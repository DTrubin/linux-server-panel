<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useSystemResourceStore } from '@/store/modules/systemResource'
import { ChartManager, createChartId } from '@/utils/chartManager'
import { type ECOption } from '@/utils/echarts'

const systemResourceStore = useSystemResourceStore()
const chartContainer = ref<HTMLElement | null>(null)
const chartId = createChartId('disk-chart')
let updateTimer: number | null = null
let isDestroyed = ref(false)

function initDiskChart() {
  if (isDestroyed.value || !chartContainer.value) return

  try {
    // 使用图表管理器创建图表
    const chart = ChartManager.createChart(chartId, chartContainer.value)
    const option: ECOption = {
      title: { text: '磁盘使用率', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        name: '磁盘',
        type: 'line',
        smooth: true,
        data: [],
        lineStyle: { color: '#E6A23C' },
        areaStyle: { color: 'rgba(230, 162, 60, 0.1)' }
      }],
      grid: { left: 50, right: 30, top: 50, bottom: 30 }
    }
    chart.setOption(option)
  } catch (error) {
    console.error('初始化磁盘图表失败:', error)
    ElMessage.error('初始化磁盘图表失败，请稍后重试。')
  }
}

function updateDiskChart() {
  if (isDestroyed.value) return

  try {
    const chart = ChartManager.getChart(chartId)
    if (!chart) return

    const diskHistory = systemResourceStore.getDiskHistory
    if (!diskHistory || diskHistory.length === 0) return

    const times = diskHistory.map((item: any) => item?.time || '')
    const values = diskHistory.map((item: any) => typeof item?.value === 'number' ? item.value : 0)

    chart.setOption({
      xAxis: { data: times },
      series: [{
        name: '磁盘',
        type: 'line',
        smooth: true,
        data: values,
        lineStyle: { color: '#E6A23C' },
        areaStyle: { color: 'rgba(230, 162, 60, 0.1)' }
      }]
    })
  } catch (error) {
    console.error('更新磁盘图表失败:', error)
    ElMessage.error('更新磁盘图表失败，请稍后重试。')
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
        initDiskChart()
        updateDiskChart()
      }
    }, 100)
  })

  // 监听窗口大小变化
  window.addEventListener('resize', resizeHandler)

  // 定时更新图表
  updateTimer = window.setInterval(() => {
    if (!isDestroyed.value) {
      updateDiskChart()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  cleanupChart()
})

onUnmounted(() => {
  cleanupChart()
})
</script>

<template>
  <div class="disk-chart-container">
    <div ref="chartContainer" class="chart"></div>
  </div>
</template>

<style lang="scss" scoped>
.disk-chart-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;

  .chart {
    width: 100%;
    height: 100%;
    min-height: 360px;
  }
}
</style>
