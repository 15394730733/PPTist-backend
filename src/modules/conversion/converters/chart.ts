import { registerConverter } from './index.js'
import type { PPTXChartElement, PPTXElement } from '../types/pptx.js'
import type { PPTChartElement, ChartType, ChartData } from '../types/pptist.js'
import type { ConversionContext } from '../../../types/index.js'
import { v4 as uuidv4 } from 'uuid'
import { createEmuConverters } from '../utils/geometry.js'

/**
 * Map PPTX chart type to PPTist chart type
 */
function mapChartType(pptxType: string): ChartType {
  const typeMap: Record<string, ChartType> = {
    bar: 'bar',
    column: 'column',
    line: 'line',
    pie: 'pie',
    doughnut: 'ring',
    area: 'area',
    scatter: 'scatter',
    radar: 'radar',
  }
  return typeMap[pptxType] || 'column'
}

/**
 * Default chart colors
 */
const DEFAULT_CHART_COLORS = [
  '#4472C4',
  '#ED7D31',
  '#A5A5A5',
  '#FFC000',
  '#5B9BD5',
  '#70AD47',
]

/**
 * Detect if element is a chart element
 */
function isChartElement(element: PPTXElement): element is PPTXChartElement {
  return element.type === 'chart'
}

/**
 * Convert PPTX chart element to PPTist chart element
 * Supports real chart data extraction from the _chartData property
 */
function convertChart(element: PPTXChartElement, context: ConversionContext): PPTChartElement {
  const { transform, chartType } = element
  const { toPixelX, toPixelY } = createEmuConverters(context.slideSize)

  // Check if we have real chart data from the parser
  const chartElement = element as PPTXChartElement & {
    _chartData?: {
      labels: string[]
      legends: string[]
      series: number[][]
      colors?: string[]
    }
  }

  let chartData: ChartData

  if (chartElement._chartData && chartElement._chartData.labels.length > 0) {
    // Use real chart data
    chartData = {
      labels: chartElement._chartData.labels,
      legends: chartElement._chartData.legends,
      series: chartElement._chartData.series,
    }
  } else {
    // Fallback to placeholder data
    chartData = {
      labels: ['Category 1', 'Category 2', 'Category 3'],
      legends: ['Series 1'],
      series: [[10, 20, 30]],
    }
  }

  // Use extracted colors or default
  const themeColors = chartElement._chartData?.colors?.length
    ? chartElement._chartData.colors
    : DEFAULT_CHART_COLORS

  const pptistChart: PPTChartElement = {
    id: uuidv4(),
    type: 'chart',
    left: toPixelX(transform.x),
    top: toPixelY(transform.y),
    width: toPixelX(transform.width),
    height: toPixelY(transform.height),
    rotate: transform.rotation || 0,
    chartType: mapChartType(chartType),
    data: chartData,
    themeColors,
    fill: '#FFFFFF',
    outline: { style: 'solid', width: 0, color: 'transparent' },
  }

  return pptistChart
}

/**
 * Register chart converter
 */
export function registerChartConverter(): void {
  registerConverter(
    (element, context) => convertChart(element as PPTXChartElement, context),
    isChartElement,
    5
  )
}

export default { registerChartConverter, convertChart, isChartElement }
