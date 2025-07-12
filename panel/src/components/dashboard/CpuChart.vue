<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useSystemResourceStore } from '@/store/modules/systemResource'
import { ChartManager, createChartId } from '@/utils/chartManager'
import { type ECOption } from '@/utils/echarts'

const systemResourceStore = useSystemResourceStore()
const chartContainer = ref<HTMLElement | null>(null)
const chartId = createChartId('cpu-chart')
let updateTimer: number | null = null
let isDestroyed = ref(false)

// 初始化图表
function initCpuChart() {
  if (isDestroyed.value || !chartContainer.value) return
  try {
    // 使用图表管理器创建图表
    const chart = ChartManager.createChart(chartId, chartContainer.value)
    const option: ECOption = {
      title: { text: 'CPU 使用率', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        name: 'CPU',
        type: 'line',
        smooth: true,
        data: [],
        lineStyle: { color: '#409EFF' },
        areaStyle: { color: 'rgba(64, 158, 255, 0.1)' }
      }],
      grid: { left: 50, right: 30, top: 50, bottom: 30 }
    }
    chart.setOption(option)
  } catch (error) {
    console.error('初始化CPU图表失败:', error)
    ElMessage.error('初始化CPU图表失败，请稍后重试。')
  }
}

// 更新图表数据
function updateCpuChart() {
  if (isDestroyed.value) return

  try {
    const chart = ChartManager.getChart(chartId)
    if (!chart) return

    const cpuHistory = systemResourceStore.getCpuHistory
    if (!cpuHistory || cpuHistory.length === 0) return

    const times = cpuHistory.map(item => item?.time || '')
    const values = cpuHistory.map(item => typeof item?.value === 'number' ? item.value : 0)

    chart.setOption({
      xAxis: { data: times },
      series: [{
        name: 'CPU',
        type: 'line',
        smooth: true,
        data: values,
        lineStyle: { color: '#409EFF' },
        areaStyle: { color: 'rgba(64, 158, 255, 0.1)' }
      }]
    })
  } catch (error) {
    console.error('更新CPU图表失败:', error)
    ElMessage.error('更新CPU图表失败，请稍后重试。')
  }
}

// 处理窗口大小调整事件
function resizeHandler() {
  if (isDestroyed.value) return
  ChartManager.resizeChart(chartId)
}

// 清理图表和相关资源
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
        initCpuChart()
        updateCpuChart()
      }
    }, 100)
  })

  // 每1500ms更新一次图表
  updateTimer = setInterval(() => {
    if (!isDestroyed.value) {
      updateCpuChart()
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
