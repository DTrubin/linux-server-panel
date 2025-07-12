// 使用按需导入的ECharts
import { init, type EChartsType } from '@/utils/echarts'

/**
 * 图表管理器，用于统一管理 ECharts 实例的创建和销毁
 */
export class ChartManager {
  private static charts = new Map<string, EChartsType>()

  /**
   * 创建或获取图表实例
   * @param chartId 图表唯一标识
   * @param container 图表容器元素
   * @returns ECharts 实例
   */
  static createChart(chartId: string, container: HTMLElement): EChartsType {
    // 如果已存在同 ID 的图表，先销毁
    this.destroyChart(chartId)

    // 创建新图表
    const chart = init(container)
    this.charts.set(chartId, chart)

    return chart
  }

  /**
   * 获取图表实例
   * @param chartId 图表唯一标识
   * @returns ECharts 实例或 undefined
   */
  static getChart(chartId: string): EChartsType | undefined {
    return this.charts.get(chartId)
  }

  /**
   * 销毁指定图表
   * @param chartId 图表唯一标识
   */
  static destroyChart(chartId: string): void {
    const chart = this.charts.get(chartId)
    if (chart) {
      try {
        chart.dispose()
      } catch (error) {
        console.error(`销毁图表 ${chartId} 失败:`, error)
      }
      this.charts.delete(chartId)
    }
  }

  /**
   * 销毁所有图表
   */
  static destroyAllCharts(): void {
    this.charts.forEach((chart, chartId) => {
      try {
        chart.dispose()
      } catch (error) {
        console.error(`销毁图表 ${chartId} 失败:`, error)
      }
    })
    this.charts.clear()
  }

  /**
   * 调整指定图表大小
   * @param chartId 图表唯一标识
   */
  static resizeChart(chartId: string): void {
    const chart = this.charts.get(chartId)
    if (chart) {
      try {
        chart.resize()
      } catch (error) {
        console.error(`调整图表 ${chartId} 大小失败:`, error)
      }
    }
  }

  /**
   * 调整所有图表大小
   */
  static resizeAllCharts(): void {
    this.charts.forEach((chart, chartId) => {
      try {
        chart.resize()
      } catch (error) {
        console.error(`调整图表 ${chartId} 大小失败:`, error)
      }
    })
  }

  /**
   * 获取当前活跃的图表数量
   * @returns 图表数量
   */
  static getChartCount(): number {
    return this.charts.size
  }

  /**
   * 检查图表是否存在
   * @param chartId 图表唯一标识
   * @returns 是否存在
   */
  static hasChart(chartId: string): boolean {
    return this.charts.has(chartId)
  }
}

/**
 * 创建唯一的图表 ID
 * @param prefix 前缀
 * @returns 唯一 ID
 */
export function createChartId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
