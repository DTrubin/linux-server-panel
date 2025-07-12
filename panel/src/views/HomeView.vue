<script setup lang="ts" name="HomeView">
import { ref, onMounted, onUnmounted, computed, watch, markRaw } from 'vue'
import {
  Monitor,
  Cpu,
  Memo,
  Folder,
  Connection,
  Warning,
} from '@element-plus/icons-vue'
import { useSystemResourceStore } from '@/store/modules/systemResource'
import CpuChart from '@/components/dashboard/CpuChart.vue'
import MemoryChart from '@/components/dashboard/MemoryChart.vue'
import NetworkChart from '@/components/dashboard/NetworkChart.vue'

const systemResourceStore = useSystemResourceStore()

// 响应式数据
const systemInfo = computed(() => systemResourceStore.currentResource)

// 获取趋势
const getTrend = (usage: number) => {
  return usage > 80 ? 'up' : usage < 20 ? 'down' : 'stable'
}

// 获取网络使用情况
const getNetworkUsage = () => {
  return '↑' + systemResourceStore.getRxSpeed + ' ↓' + systemResourceStore.getTxSpeed
}

// 系统资源快速统计
const quickStats = computed(() => [
  {
    title: 'CPU 使用率',
    value: systemInfo.value.cpu.usage + '%',
    icon: markRaw(Cpu),
    color: '#409EFF',
    trend: getTrend(systemInfo.value.cpu.usage)
  },
  {
    title: '内存使用率',
    value: systemInfo.value.memory.usage + '%',
    icon: markRaw(Memo),
    color: '#67C23A',
    trend: getTrend(systemInfo.value.memory.usage)
  },
  {
    title: '磁盘使用率',
    value: systemInfo.value.disk.usage + '%',
    icon: markRaw(Folder),
    color: '#E6A23C',
    trend: getTrend(systemInfo.value.disk.usage)
  },
  {
    title: '网络连接',
    value: getNetworkUsage(),
    icon: markRaw(Connection),
    color: '#F56C6C',
    trend: 'stable'
  }
])

interface SystemAlert {
  type: 'warning' | 'info' | 'error'
  title: string
  message: string
  time: string
}

const systemAlerts = ref<SystemAlert[]>([])

// 计算属性
const uptimeFormatted = computed(() => {
  const uptime = (systemInfo?.value.uptime ?? 0)
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  return `${days}天 ${hours}小时 ${minutes}分钟`
})


// 检查系统状态
const generateSystemAlerts = (data: any) => {
  const alerts: SystemAlert[] = []
  const now = new Date()

  // 检查CPU使用率
  if (data.cpu.usage > 90) {
    alerts.push({
      type: 'warning',
      title: 'CPU使用率过高',
      message: `当前CPU使用率${data.cpu.usage.toFixed(1)}%，建议检查运行中的进程`,
      time: formatRelativeTime(now)
    })
  }

  // 检查内存使用率
  if (data.memory.usage > 85) {
    alerts.push({
      type: 'warning',
      title: '内存使用率过高',
      message: `当前内存使用率${data.memory.usage.toFixed(1)}%，建议释放内存`,
      time: formatRelativeTime(now)
    })
  }

  // 检查磁盘使用率
  if (data.disk.usage > 90) {
    alerts.push({
      type: 'error',
      title: '磁盘空间严重不足',
      message: `磁盘使用率${data.disk.usage.toFixed(1)}%，请立即清理磁盘空间`,
      time: formatRelativeTime(now)
    })
  } else if (data.disk.usage > 80) {
    alerts.push({
      type: 'warning',
      title: '磁盘空间不足',
      message: `磁盘使用率${data.disk.usage.toFixed(1)}%，建议清理不必要的文件`,
      time: formatRelativeTime(now)
    })
  }

  // 检查负载平均值
  if (data.cpu.loadAverage && data.cpu.loadAverage[0] > data.cpu.cores * 2) {
    alerts.push({
      type: 'warning',
      title: '系统负载过高',
      message: `1分钟负载平均值${data.cpu.loadAverage[0].toFixed(2)}，超过CPU核心数的2倍`,
      time: formatRelativeTime(now)
    })
  }

  // 如果没有警告，添加正常状态信息
  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      title: '系统运行正常',
      message: '所有系统资源使用率都在正常范围内',
      time: formatRelativeTime(now)
    })
  }

  systemAlerts.value = alerts
}

const formatRelativeTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`

  const days = Math.floor(hours / 24)
  return `${days}天前`
}

const getAlertIcon = (type: string) => {
  return type === 'warning' ? Warning : Monitor
}

onMounted(() => {
  systemResourceStore.connect() // 建立WebSocket连接
})

// 监听store中的数据变化，当WebSocket接收到新数据时自动更新页面
watch(
  () => systemResourceStore.currentResource,
  (newData) => {
    if (newData && newData.cpu) {
      generateSystemAlerts(newData)
    }
  },
  { deep: true }
)

onUnmounted(() => {
  // 断开WebSocket连接
  systemResourceStore.disconnect()
})
</script>

<template>
  <div class="home-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h1>系统概览</h1>
        <div class="header-meta">
          <p>{{ systemInfo.hostname }} - {{ systemInfo.os }}</p>
          <div class="connection-status">
            <el-tag :type="systemResourceStore.connectionStatus.type" size="small" effect="plain">
              <el-icon style="margin-right: 4px;">
                <Connection />
              </el-icon>
              {{ systemResourceStore.connectionStatus.text }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速统计卡片 -->
    <el-row :gutter="20" class="quick-stats">
      <el-col :xs="12" :sm="6" v-for="stat in quickStats" :title="stat.title" :key="stat.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :style="{ backgroundColor: stat.color }">
              <el-icon :size="24">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-title">{{ stat.title }}</div>
            </div>
            <div class="stat-trend" :class="`trend-${stat.trend}`">
              <el-icon>
                <Monitor />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧列 -->
      <el-col :xs="24" :lg="16">
        <!-- 性能监控图表 -->
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>性能监控</span>
              <el-tag type="success">实时</el-tag>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="8">
              <div class="chart-container">
                <CpuChart />
              </div>
            </el-col>
            <el-col :span="8">
              <div class="chart-container">
                <MemoryChart />
              </div>
            </el-col>
            <el-col :span="8">
              <div class="chart-container">
                <NetworkChart />
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 系统信息 -->
        <el-card shadow="never" class="system-info-card">
          <template #header>
            <div class="card-header">
              <el-icon>
                <Monitor />
              </el-icon>
              <span>系统信息</span>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="主机名">{{ systemInfo.hostname }}</el-descriptions-item>
            <el-descriptions-item label="操作系统">{{ systemInfo.os }}</el-descriptions-item>
            <el-descriptions-item label="内核版本">{{ systemInfo.kernel }}</el-descriptions-item>
            <el-descriptions-item label="运行时间">{{ uptimeFormatted }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 右侧列 -->
      <el-col :xs="24" :lg="8">
        <!-- 系统警告 -->
        <el-card shadow="never" class="alerts-card">
          <template #header>
            <div class="card-header">
              <el-icon>
                <Warning />
              </el-icon>
              <span>系统提醒</span>
            </div>
          </template>

          <div class="alerts-list">
            <div v-for="alert in systemAlerts" :key="alert.title" class="alert-item" :class="`alert-${alert.type}`">
              <div class="alert-icon">
                <el-icon>
                  <component :is="getAlertIcon(alert.type)" />
                </el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-title">{{ alert.title }}</div>
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-time">{{ alert.time }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.home-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-info {
      h1 {
        margin: 0 0 5px 0;
        color: var(--el-text-color-primary);
        font-size: 24px;
        font-weight: 600;
      }

      .header-meta {
        display: flex;
        align-items: center;
        gap: 15px;

        p {
          margin: 0;
          color: var(--el-text-color-secondary);
          font-size: 14px;
        }

        .connection-status {
          .el-tag {
            display: flex;
            align-items: center;
          }
        }
      }
    }
  }

  .quick-stats {
    margin-bottom: 20px;

    div[title='网络连接'] .stat-value {
      font-size: 0.5em !important;
    }

    .stat-card {
      border: none;
      border-radius: 12px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      .stat-content {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-info {
          flex: 1;
          margin-left: 12px;

          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--el-text-color-primary);
            line-height: 1;
          }

          .stat-title {
            font-size: 14px;
            color: var(--el-text-color-secondary);
            margin-top: 4px;
          }
        }

        .stat-trend {
          &.trend-up {
            color: #F56C6C;
          }

          &.trend-down {
            color: #67C23A;
          }

          &.trend-stable {
            color: var(--el-text-color-secondary);
          }
        }
      }
    }
  }

  .chart-card {
    margin-bottom: 20px;
    border-radius: 12px;
    border: none;

    .chart-container {
      height: 200px;
    }
  }

  .system-info-card {
    border-radius: 12px;
    border: none;
  }

  .services-card,
  .alerts-card,
  .quick-actions-card {
    margin-bottom: 20px;
    border-radius: 12px;
    border: none;

    .services-list {
      .service-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);

        &:last-child {
          border-bottom: none;
        }

        .service-info {
          .service-name {
            font-weight: 500;
            color: var(--el-text-color-primary);
          }

          .service-port {
            color: var(--el-text-color-secondary);
            font-size: 12px;
            margin-left: 5px;
          }
        }
      }
    }

    .alerts-list {
      .alert-item {
        display: flex;
        padding: 12px 0;
        border-bottom: 1px solid var(--el-border-color-lighter);

        &:last-child {
          border-bottom: none;
        }

        .alert-icon {
          margin-right: 12px;
          margin-top: 2px;
        }

        .alert-content {
          flex: 1;

          .alert-title {
            font-weight: 500;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
          }

          .alert-message {
            font-size: 14px;
            color: var(--el-text-color-regular);
            margin-bottom: 4px;
          }

          .alert-time {
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }
        }

        &.alert-warning {
          .alert-icon {
            color: #E6A23C;
          }
        }

        &.alert-info {
          .alert-icon {
            color: #409EFF;
          }
        }
      }
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;

      .action-btn {
        width: 100%;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .home-container {
    padding: 10px;

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    .quick-stats {
      .stat-card {
        margin-bottom: 10px;
      }
    }

    .chart-card {
      .chart-container {
        height: 150px;
      }
    }
  }
}
</style>
