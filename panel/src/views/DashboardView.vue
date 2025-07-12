<script setup lang="ts" name="DashboardView">
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed } from 'vue'
import { ElCard, ElRow, ElCol, ElProgress, ElTag, ElButton, ElIcon, ElNotification } from 'element-plus'
import { Cpu, Memo, Coin, Connection, Refresh, Monitor } from '@element-plus/icons-vue'
import { useSystemResourceStore } from '@/store/modules/systemResource'
import { globalWebSocketManager } from '@/utils/globalWebSocketManager'
import CpuChart from '@/components/dashboard/CpuChart.vue'
import MemoryChart from '@/components/dashboard/MemoryChart.vue'
import NetworkChart from '@/components/dashboard/NetworkChart.vue'
import DiskChart from '@/components/dashboard/DiskChart.vue'

// 使用系统资源 store
const systemResourceStore = useSystemResourceStore()

// 当前选中的图表类型
const activeChart = ref<'cpu' | 'memory' | 'disk' | 'network'>('cpu')

// 连接状态计算属性
const connectionStatus = computed(() => systemResourceStore.connectionStatus)

// CPU 相关计算属性
const cpuUsage = computed(() => systemResourceStore.currentResource?.cpu.usage || 0)
const cpuProgressStatus = computed(() => {
  const usage = cpuUsage.value
  return usage > thresholds.cpu.critical ? 'exception' :
    usage > thresholds.cpu.warning ? 'warning' : 'success'
})

// 内存相关计算属性
const memoryUsage = computed(() => systemResourceStore.currentResource?.memory.usage || 0)
const memoryProgressStatus = computed(() => {
  const usage = memoryUsage.value
  return usage > thresholds.memory.critical ? 'exception' :
    usage > thresholds.memory.warning ? 'warning' : 'success'
})

// 磁盘相关计算属性
const diskUsage = computed(() => systemResourceStore.currentResource?.disk.usage || 0)
const diskProgressStatus = computed(() => {
  const usage = diskUsage.value
  return usage > thresholds.disk.critical ? 'exception' :
    usage > thresholds.disk.warning ? 'warning' : 'success'
})

// 网络相关计算属性
const networkRxSpeed = computed(() => systemResourceStore.getRxSpeed)
const networkTxSpeed = computed(() => systemResourceStore.getTxSpeed)

// 刷新数据
function refreshData() {
  if (systemResourceStore.isConnected) {
    // WebSocket 连接正常时，数据会自动更新
    ElNotification({
      title: '数据刷新',
      message: '数据正在实时更新中',
      type: 'info',
      duration: 2000
    })
  } else {
    // 重新连接 WebSocket
    systemResourceStore.disconnect()
    systemResourceStore.connect()
    ElNotification({
      title: '重新连接',
      message: '正在尝试重新建立连接',
      type: 'warning',
      duration: 2000
    })
  }
}

// 阈值定义
const thresholds = {
  cpu: { warning: 70, critical: 90 },
  memory: { warning: 80, critical: 95 },
  disk: { warning: 85, critical: 95 }
}

// 最后更新时间
const lastUpdateTime = computed(() => {
  if (!systemResourceStore.currentResource) return new Date()
  return new Date(systemResourceStore.currentResource.timestamp)
})

// 生命周期
onMounted(() => {
  // 确保全局管理器知道仪表盘需要系统资源数据
  globalWebSocketManager.requireSystemResource('Dashboard')

  // 强制刷新连接状态（确保连接建立）
  setTimeout(() => {
    globalWebSocketManager.forceRefreshConnection()
  }, 100)

  // 连接状态变化通知
  let lastConnected = systemResourceStore.isConnected
  const checkConnection = setInterval(() => {
    if (systemResourceStore.isConnected !== lastConnected) {
      if (systemResourceStore.isConnected) {
        ElNotification({
          title: '连接已建立',
          message: '实时监控连接已建立',
          type: 'success',
          duration: 2000
        })
      } else if (!systemResourceStore.isConnecting && globalWebSocketManager.isSystemResourceRequired()) {
        // 只有在需要连接时才显示断开警告
        ElNotification({
          title: '连接断开',
          message: '实时监控连接中断',
          type: 'warning',
          duration: 3000
        })
      }
      lastConnected = systemResourceStore.isConnected
    }
  }, 1000)

  // 清理定时器和取消资源需求
  onBeforeUnmount(() => {
    clearInterval(checkConnection)
    // 取消对系统资源数据的需求
    globalWebSocketManager.unrequireSystemResource('Dashboard')
  })

  onUnmounted(() => {
    // 确保资源完全清理
  })
})
</script>

<template>
  <div class="dashboard-container">
    <!-- 连接状态和刷新按钮 -->
    <div class="header-section">
      <div class="connection-status">
        <el-tag :type="connectionStatus.type" size="large">
          <el-icon>
            <Connection />
          </el-icon>
          {{ connectionStatus.text }}
        </el-tag>
        <span class="update-time">最后更新: {{ lastUpdateTime.toLocaleTimeString() }}</span>
      </div>
      <el-button type="primary" @click="refreshData" :disabled="!systemResourceStore.isConnected">
        <el-icon>
          <Refresh />
        </el-icon>
        刷新数据
      </el-button>
    </div>

    <!-- 系统状态概览 -->
    <el-row :gutter="24" class="stats-row">
      <!-- CPU 使用率 -->
      <el-col :lg="6" :md="12" :sm="24">
        <el-card class="stats-card cpu-card" shadow="hover" @click="activeChart = 'cpu'"
          :class="{ selected: activeChart === 'cpu' }">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon>
                <Cpu />
              </el-icon>
            </div>
            <div class="stats-info">
              <h3>CPU 使用率</h3>
              <div class="stats-value">{{ cpuUsage.toFixed(1) }}%</div>
              <el-progress :percentage="cpuUsage" :status="cpuProgressStatus" :show-text="false" />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 内存使用率 -->
      <el-col :lg="6" :md="12" :sm="24">
        <el-card class="stats-card memory-card" shadow="hover" @click="activeChart = 'memory'"
          :class="{ selected: activeChart === 'memory' }">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon>
                <Memo />
              </el-icon>
            </div>
            <div class="stats-info">
              <h3>内存使用率</h3>
              <div class="stats-value">{{ memoryUsage.toFixed(1) }}%</div>
              <el-progress :percentage="memoryUsage" :status="memoryProgressStatus" :show-text="false" />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 磁盘使用率 -->
      <el-col :lg="6" :md="12" :sm="24">
        <el-card class="stats-card disk-card" shadow="hover" @click="activeChart = 'disk'"
          :class="{ selected: activeChart === 'disk' }">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon>
                <Coin />
              </el-icon>
            </div>
            <div class="stats-info">
              <h3>磁盘使用率</h3>
              <div class="stats-value">{{ diskUsage.toFixed(1) }}%</div>
              <el-progress :percentage="diskUsage" :status="diskProgressStatus" :show-text="false" />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 网络状态 -->
      <el-col :lg="6" :md="12" :sm="24">
        <el-card class="stats-card network-card" shadow="hover" @click="activeChart = 'network'"
          :class="{ selected: activeChart === 'network' }">
          <div class="stats-content">
            <div class="stats-icon">
              <el-icon>
                <Monitor />
              </el-icon>
            </div>
            <div class="stats-info">
              <h3>网络状态</h3>
              <div class="stats-value">
                <div class="network-stat">↑ {{ networkRxSpeed }}</div>
                <div class="network-stat">↓ {{ networkTxSpeed }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时监控图表 -->
    <el-row :gutter="24" class="charts-row">
      <el-col v-if="activeChart === 'cpu'" :lg="24" :md="24" :sm="24">
        <CpuChart />
      </el-col>
      <el-col v-if="activeChart === 'memory'" :lg="24" :md="24" :sm="24">
        <MemoryChart />
      </el-col>
      <el-col v-if="activeChart === 'disk'" :lg="24" :md="24" :sm="24">
        <DiskChart />
      </el-col>
      <el-col v-if="activeChart === 'network'" :lg="24" :md="24" :sm="24">
        <NetworkChart />
      </el-col>
    </el-row>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

// 头部区域
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .connection-status {
    display: flex;
    align-items: center;
    gap: 16px;

    .update-time {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

// 统计卡片行
.stats-row {
  margin-bottom: 24px;

  .stats-card {
    transition: all 0.3s ease;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    &.selected {
      box-shadow: 0 0 0 2px var(--el-color-primary) !important;
      border-color: var(--el-color-primary) !important;
    }

    &.cpu-card {
      border-top: 4px solid var(--el-color-primary);
    }

    &.memory-card {
      border-top: 4px solid var(--el-color-success);
    }

    &.disk-card {
      border-top: 4px solid var(--el-color-warning);
    }

    &.network-card {
      border-top: 4px solid var(--el-color-info);
    }
  }

  .stats-content {
    display: flex;
    align-items: center;
    padding: 20px;

    .stats-icon {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin-right: 16px;

      .el-icon {
        font-size: 24px;
        color: white;
      }
    }

    .stats-info {
      flex: 1;

      h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: var(--el-text-color-regular);
        font-weight: 500;
      }

      .stats-value {
        font-size: 24px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 8px;
      }

      .network-stat {
        font-size: 12px;
        margin: 2px 0;
        color: var(--el-text-color-primary);
      }

      .status-tag {
        margin-bottom: 8px;
      }

      .alert-count {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }

  .cpu-card .stats-icon {
    background: var(--el-color-primary);
  }

  .memory-card .stats-icon {
    background: var(--el-color-success);
  }

  .disk-card .stats-icon {
    background: var(--el-color-warning);
  }

  .network-card .stats-icon {
    background: var(--el-color-info);
  }
}

// 图表行
.charts-row {
  margin-bottom: 24px;
}
</style>
