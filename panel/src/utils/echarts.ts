/**
 * ECharts 按需导入工具
 * 只导入实际使用的图表组件，大幅减少打包体积
 */
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent
} from 'echarts/components'
import type {
  ComposeOption,
  LineSeriesOption,
  BarSeriesOption,
  PieSeriesOption,
  GaugeSeriesOption
} from 'echarts/types/dist/shared'

// 创建合成的图表配置类型
export type ECOption = ComposeOption<
  LineSeriesOption | BarSeriesOption | PieSeriesOption | GaugeSeriesOption
>

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  DataZoomComponent
])

// 导出仅包含必要组件的 echarts 对象
export { graphic, init, color, time, number, format } from 'echarts/core'
export type { ECharts, EChartsType } from 'echarts/core'
