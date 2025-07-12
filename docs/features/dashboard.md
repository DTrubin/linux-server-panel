# 仪表盘功能

仪表盘是 Linux Server Panel 的核心监控界面，提供服务器实时状态的可视化展示和分析。

## 🎯 功能概述

仪表盘采用现代化的卡片式布局，集成了实时监控、历史数据分析和告警通知功能，让用户能够快速了解服务器的整体健康状况。

## 📊 核心功能

### 1. 实时监控卡片

#### CPU 监控
- **实时使用率**: 显示当前 CPU 使用百分比
- **核心数量**: 显示 CPU 核心和线程数
- **负载平均值**: 1分钟、5分钟、15分钟负载
- **频率信息**: 当前工作频率
- **状态指示**: 绿色(正常)、黄色(警告)、红色(危险)

```javascript
// CPU 数据格式
{
  "cpu": {
    "usage": 25.6,           // 使用率百分比
    "cores": 8,              // 核心数
    "threads": 16,           // 线程数
    "frequency": 2.4,        // 频率 GHz
    "model": "Intel i7-8700K",
    "loadAverage": [1.2, 1.5, 1.8]
  }
}
```

#### 内存监控
- **使用情况**: 已用/总计内存显示
- **使用率百分比**: 实时内存占用率
- **缓存和缓冲区**: 系统缓存使用情况
- **交换分区**: Swap 使用状态
- **可用内存**: 实际可用内存大小

#### 磁盘监控
- **空间使用**: 已用/总计磁盘空间
- **使用率**: 磁盘空间占用百分比
- **多分区支持**: 显示各个挂载点使用情况
- **I/O 统计**: 读写速度和IOPS
- **文件系统类型**: ext4、xfs、ntfs 等

#### 网络监控
- **实时流量**: 上传/下载速度显示
- **网络接口**: 多网卡支持
- **数据包统计**: 数据包收发数量
- **错误统计**: 网络错误和丢包率
- **连接状态**: 网络连接数统计

### 2. 交互式图表系统

#### 图表类型切换
用户可以在四种监控视图间切换：
- **CPU 图表**: CPU 使用率历史趋势
- **内存图表**: 内存使用历史趋势  
- **磁盘图表**: 磁盘 I/O 性能图表
- **网络图表**: 网络流量双向图表

#### 图表特性
- **实时更新**: 每秒更新数据点
- **历史数据**: 保存最近60个数据点
- **平滑动画**: 流畅的数据过渡效果
- **颜色编码**: 不同状态使用不同颜色
- **鼠标交互**: 悬停显示具体数值

```vue
<!-- 图表组件示例 -->
<template>
  <div class="chart-container">
    <el-tabs v-model="activeChart" @tab-change="handleTabChange">
      <el-tab-pane label="CPU" name="cpu">
        <CpuChart :data="systemResource.cpu" />
      </el-tab-pane>
      <el-tab-pane label="内存" name="memory">
        <MemoryChart :data="systemResource.memory" />
      </el-tab-pane>
      <!-- 其他图表... -->
    </el-tabs>
  </div>
</template>
```

### 3. 连接状态管理

#### 连接指示器
- **已连接**: 绿色圆点，显示"已连接"
- **连接中**: 黄色圆点，显示"连接中"
- **已断开**: 红色圆点，显示"连接断开"
- **错误状态**: 显示具体错误信息

#### 自动重连机制
- **断线检测**: 自动检测连接状态
- **重连策略**: 指数退避重连算法
- **用户通知**: 连接状态变化通知
- **手动刷新**: 用户可手动触发重连

### 4. 系统告警功能

#### 告警阈值
```javascript
const thresholds = {
  cpu: { warning: 70, critical: 85 },
  memory: { warning: 75, critical: 90 },
  disk: { warning: 80, critical: 95 }
}
```

#### 告警类型
- **资源告警**: CPU、内存、磁盘使用率过高
- **系统告警**: 负载过高、服务异常
- **网络告警**: 网络延迟、丢包严重
- **安全告警**: 异常登录、权限变更

#### 通知机制
- **弹窗通知**: 重要告警立即弹窗
- **状态栏提示**: 一般告警状态栏显示
- **邮件通知**: 可配置邮件告警
- **Webhook**: 支持第三方系统集成

## 🔧 技术实现

### 前端架构

#### Vue 3 组合式 API
```typescript
// composables/useDashboard.ts
export function useDashboard() {
  const systemResourceStore = useSystemResourceStore()
  const activeChart = ref<'cpu' | 'memory' | 'disk' | 'network'>('cpu')
  
  const connectionStatus = computed(() => {
    if (systemResourceStore.isConnecting) {
      return { type: 'warning', text: '连接中...' }
    }
    if (systemResourceStore.isConnected) {
      return { type: 'success', text: '已连接' }
    }
    return { type: 'danger', text: '连接断开' }
  })
  
  return {
    activeChart,
    connectionStatus,
    systemResource: computed(() => systemResourceStore.currentResource)
  }
}
```

#### 状态管理
```typescript
// store/modules/systemResource.ts
export const useSystemResourceStore = defineStore('systemResource', {
  state: () => ({
    currentResource: null as SystemResource | null,
    isConnected: false,
    isConnecting: false,
    connectionError: null as string | null,
    lastUpdateTime: null as Date | null
  }),
  
  getters: {
    cpuUsage: (state) => state.currentResource?.cpu.usage || 0,
    memoryUsage: (state) => state.currentResource?.memory.usage || 0,
    diskUsage: (state) => state.currentResource?.disk.usage || 0
  },
  
  actions: {
    updateResource(resource: SystemResource) {
      this.currentResource = resource
      this.lastUpdateTime = new Date()
    }
  }
})
```

### WebSocket 实时连接

#### 连接管理器
```typescript
// utils/globalWebSocketManager.ts
class GlobalWebSocketManager {
  private wsConnections = new Map<string, WebSocket>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  
  requireSystemResource(requester: string) {
    this.systemResourceRequests.add(requester)
    if (this.systemResourceRequests.size === 1) {
      this.connectSystemResource()
    }
  }
  
  unrequireSystemResource(requester: string) {
    this.systemResourceRequests.delete(requester)
    if (this.systemResourceRequests.size === 0) {
      this.disconnectSystemResource()
    }
  }
  
  private connectSystemResource() {
    if (this.wsConnections.has('system_resource')) return
    
    const ws = new WebSocket(`${WS_BASE_URL}/monitor`)
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token: getToken() }))
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'system_monitor' }))
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'system_status') {
        this.handleSystemResourceUpdate(data.data)
      }
    }
    
    this.wsConnections.set('system_resource', ws)
  }
}
```

### 图表组件实现

#### ECharts 集成
```vue
<!-- components/dashboard/CpuChart.vue -->
<template>
  <div ref="chartRef" class="chart" />
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ChartManager } from '@/utils/chartManager'

interface Props {
  data: CpuData
}

const props = defineProps<Props>()
const chartRef = ref<HTMLElement>()

onMounted(() => {
  if (chartRef.value) {
    const chart = echarts.init(chartRef.value)
    ChartManager.registerChart('cpu-chart', chart)
    
    const option = {
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value', max: 100 },
      series: [{
        data: [],
        type: 'line',
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.6)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      }]
    }
    
    chart.setOption(option)
  }
})

watch(() => props.data, (newData) => {
  ChartManager.updateChart('cpu-chart', newData)
}, { deep: true })
</script>
```

#### 图表管理器
```typescript
// utils/chartManager.ts
export class ChartManager {
  private static charts = new Map<string, ECharts>()
  
  static registerChart(id: string, chart: ECharts) {
    this.charts.set(id, chart)
  }
  
  static updateChart(id: string, data: any) {
    const chart = this.charts.get(id)
    if (chart) {
      const option = this.generateOption(data)
      chart.setOption(option, false, true)
    }
  }
  
  static disposeAll() {
    this.charts.forEach(chart => chart.dispose())
    this.charts.clear()
  }
  
  private static generateOption(data: any) {
    // 根据数据生成图表配置
    return {
      series: [{
        data: data.history || []
      }]
    }
  }
}
```

## 📱 响应式设计

### 移动端适配
- **弹性布局**: CSS Grid 和 Flexbox
- **断点设计**: 针对不同屏幕尺寸优化
- **触摸友好**: 手势操作支持
- **压缩显示**: 小屏幕下简化显示

### 布局策略
```scss
.dashboard-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 10px;
  }
}

.monitor-card {
  min-height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 480px) {
    min-height: 150px;
  }
}
```

## ⚡ 性能优化

### 前端优化
1. **虚拟滚动**: 大数据量列表优化
2. **组件缓存**: keep-alive 缓存频繁切换组件
3. **防抖节流**: 频繁更新操作优化
4. **按需加载**: 图表库按需导入

### 数据优化
1. **增量更新**: 只更新变化的数据
2. **数据压缩**: WebSocket 数据压缩传输
3. **缓存策略**: 合理的数据缓存机制
4. **内存管理**: 及时清理过期数据

### 图表优化
```typescript
// 图表性能优化
const chartUpdateThrottle = throttle((data) => {
  chart.setOption({
    series: [{ data: data.slice(-60) }] // 只保留最近60个点
  }, false, true) // 不合并配置，静默更新
}, 100) // 100ms 节流
```

## 🔧 配置选项

### 监控配置
```javascript
// 仪表盘配置
const dashboardConfig = {
  // 更新间隔 (毫秒)
  updateInterval: 1000,
  
  // 历史数据点数量
  historyPoints: 60,
  
  // 告警阈值
  thresholds: {
    cpu: { warning: 70, critical: 85 },
    memory: { warning: 75, critical: 90 },
    disk: { warning: 80, critical: 95 }
  },
  
  // 图表配置
  charts: {
    smooth: true,
    showGrid: true,
    animation: true
  }
}
```

### 自定义主题
```scss
// 主题变量
:root {
  --dashboard-bg: #f5f7fa;
  --card-bg: #ffffff;
  --primary-color: #409eff;
  --success-color: #67c23a;
  --warning-color: #e6a23c;
  --danger-color: #f56c6c;
}

// 深色主题
[data-theme="dark"] {
  --dashboard-bg: #1a1a1a;
  --card-bg: #2d2d2d;
}
```

## 🐛 故障排除

### 常见问题

#### 1. 连接失败
```javascript
// 诊断连接问题
const diagnostics = {
  websocketSupport: 'WebSocket' in window,
  networkOnline: navigator.onLine,
  serverReachable: await testServerConnection(),
  authValid: await validateToken()
}
```

#### 2. 数据不更新
- 检查 WebSocket 连接状态
- 验证用户认证状态
- 确认服务器监控服务正常

#### 3. 图表显示异常
- 检查容器尺寸
- 验证数据格式
- 确认 ECharts 初始化

### 调试工具
```typescript
// 调试模式
if (process.env.NODE_ENV === 'development') {
  window.dashboardDebug = {
    getStore: () => useSystemResourceStore(),
    getCharts: () => ChartManager.getAllCharts(),
    getConnections: () => globalWebSocketManager.getStatus()
  }
}
```

## 📊 数据格式

### 系统资源数据结构
```typescript
interface SystemResource {
  timestamp: string
  cpu: {
    usage: number        // 使用率 0-100
    cores: number        // 核心数
    model: string        // CPU型号
    frequency: number    // 频率 GHz
    loadAverage: number[] // 负载平均值
  }
  memory: {
    total: number        // 总内存 bytes
    used: number         // 已用内存 bytes
    usage: number        // 使用率 0-100
    available: number    // 可用内存 bytes
    cached: number       // 缓存 bytes
    buffers: number      // 缓冲区 bytes
  }
  disk: {
    total: number        // 总容量 bytes
    used: number         // 已用容量 bytes
    usage: number        // 使用率 0-100
    free: number         // 可用容量 bytes
    filesystems: FileSystem[] // 文件系统列表
  }
  network: {
    interfaces: NetworkInterface[] // 网络接口
    totalIn: number      // 总入流量 bytes/s
    totalOut: number     // 总出流量 bytes/s
  }
}
```

---

仪表盘是系统的核心组件，通过实时监控和可视化展示，帮助用户快速了解服务器状态，及时发现和处理问题。
