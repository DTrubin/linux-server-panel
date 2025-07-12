<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useSystemResourceStore } from '@/store/modules/systemResource'
import { ChartManager, createChartId } from '@/utils/chartManager'
import { type ECOption } from '@/utils/echarts'

const systemResourceStore = useSystemResourceStore()
const chartContainer = ref<HTMLElement | null>(null)
const chartId = createChartId('network-chart')
let updateTimer: number | null = null
let isDestroyed = ref(false)

function initNetworkChart() {
  if (isDestroyed.value || !chartContainer.value) return

  try {
    // 使用图表管理器创建图表
    const chart = ChartManager.createChart(chartId, chartContainer.value)
    const option: ECOption = {
      title: { text: '网络流量', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['接收', '发送'], bottom: 5 },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', axisLabel: { formatter: '{value} MB/s' } },
      series: [
        {
          name: '接收',
          type: 'line',
          smooth: true,
          data: [],
          lineStyle: { color: '#E6A23C' }
        },
        {
          name: '发送',
          type: 'line',
          smooth: true,
          data: [],
          lineStyle: { color: '#F56C6C' }
        }
      ],
      grid: { left: 50, right: 30, top: 50, bottom: 60 }
    }
    chart.setOption(option)
  } catch (error) {
    console.error('初始化网络图表失败:', error)
    ElMessage.error('初始化网络图表失败，请稍后重试。')
  }
}

function updateNetworkChart() {
  if (isDestroyed.value) return

  try {
    const chart = ChartManager.getChart(chartId)
    if (!chart) return

    const networkHistory = systemResourceStore.getNetworkHistory
    if (!networkHistory || !networkHistory.rx || networkHistory.rx.length === 0) return

    const times = networkHistory.rx.map(item => item?.time || '')
    const rxValues = networkHistory.rx.map(item => {
      const value = typeof item?.value === 'number' ? item.value : 0
      return (value / 1024 / 1024).toFixed(2)
    })
    const txValues = networkHistory.tx.map(item => {
      const value = typeof item?.value === 'number' ? item.value : 0
      return (value / 1024 / 1024).toFixed(2)
    })

    chart.setOption({
      xAxis: { data: times },
      series: [
        {
          name: '接收',
          type: 'line',
          smooth: true,
          data: rxValues,
          lineStyle: { color: '#E6A23C' }
        },
        {
          name: '发送',
          type: 'line',
          smooth: true,
          data: txValues,
          lineStyle: { color: '#F56C6C' }
        }
      ]
    })
  } catch (error) {
    console.error('更新网络图表失败:', error)
    ElMessage.error('更新网络图表失败，请稍后重试。')
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
        initNetworkChart()
        updateNetworkChart()
      }
    }, 100)
  })

  // 每1500ms更新一次图表
  updateTimer = setInterval(() => {
    if (!isDestroyed.value) {
      updateNetworkChart()
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
