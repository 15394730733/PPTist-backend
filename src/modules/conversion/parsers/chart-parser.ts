/**
 * 图表解析器
 * 参考 pptxtojson 的 chart.js 实现
 * 支持 14 种图表类型的数据提取
 */

import type { XmlObject, ParsingContext } from '../context/parsing-context.js'
import { getTextByPathList } from '../resolvers/color-resolver.js'
import type { PPTXElement, PPTXTransform } from '../types/pptx.js'

/**
 * 图表类型
 */
export type ChartType =
  | 'barChart'
  | 'bar3DChart'
  | 'lineChart'
  | 'line3DChart'
  | 'pieChart'
  | 'pie3DChart'
  | 'doughnutChart'
  | 'areaChart'
  | 'area3DChart'
  | 'scatterChart'
  | 'radarChart'
  | 'bubbleChart'
  | 'stockChart'
  | 'surfaceChart'
  | 'surface3DChart'

/**
 * 图表数据系列
 */
export interface ChartSeries {
  key: string | number          // 系列名称
  values: Array<{ x: string | number; y: number }>  // 数据点
  xlabels?: Record<string, string>  // X 轴标签
}

/**
 * 图表数据
 */
export interface ChartData {
  chartType: ChartType
  labels: string[]              // X 轴标签
  legends: string[]             // 图例名称
  series: number[][]            // 系列数据
  colors?: string[]             // 颜色
  marker?: boolean              // 是否显示标记点
  barDir?: 'bar' | 'col'        // 柱状图方向
  holeSize?: number             // 环形图孔径
  grouping?: string             // 分组方式
  style?: string                // 样式
}

/**
 * 遍历元素
 */
function eachElement<T>(
  node: XmlObject | XmlObject[] | undefined,
  callback: (node: XmlObject, index: number) => T
): T[] {
  if (!node) return []
  const array = Array.isArray(node) ? node : [node]
  return array.map((n, i) => callback(n, i))
}

/**
 * 提取图表颜色
 */
function extractChartColors(
  serNode: XmlObject | XmlObject[],
  context: ParsingContext
): string[] {
  const serArray = Array.isArray(serNode) ? serNode : [serNode]
  const colors: string[] = []

  for (const node of serArray) {
    let schemeClr = getTextByPathList(node, ['c:spPr', 'a:solidFill', 'a:schemeClr']) as XmlObject | undefined
    if (!schemeClr) {
      schemeClr = getTextByPathList(node, ['c:spPr', 'a:ln', 'a:solidFill', 'a:schemeClr']) as XmlObject | undefined
    }
    if (!schemeClr) {
      schemeClr = getTextByPathList(node, ['c:marker', 'c:spPr', 'a:ln', 'a:solidFill', 'a:schemeClr']) as XmlObject | undefined
    }

    let color = ''

    if (schemeClr) {
      const clrVal = getTextByPathList(schemeClr, ['attrs', 'val']) as string
      if (clrVal && context.themeContent) {
        color = getTextByPathList(
          context.themeContent,
          ['a:theme', 'a:themeElements', 'a:clrScheme', `a:${clrVal}`, 'a:srgbClr', 'attrs', 'val']
        ) as string || ''

        // 应用 tint
        const tintStr = getTextByPathList(schemeClr, ['a:tint', 'attrs', 'val']) as string
        if (tintStr) {
          const tint = parseInt(tintStr, 10) / 100000
          if (!isNaN(tint) && color) {
            // 简化的 tint 应用
            const colorValue = parseInt(color, 16)
            const r = Math.round(((colorValue >> 16) & 0xFF) * tint + (255 * (1 - tint)))
            const g = Math.round(((colorValue >> 8) & 0xFF) * tint + (255 * (1 - tint)))
            const b = Math.round((colorValue & 0xFF) * tint + (255 * (1 - tint)))
            color = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
          }
        }
      }
    }

    if (!color) {
      color = getTextByPathList(node, ['c:spPr', 'a:solidFill', 'a:srgbClr', 'attrs', 'val']) as string || ''
    }

    if (color) {
      colors.push(color.startsWith('#') ? color : '#' + color)
    }
  }

  return colors
}

/**
 * 提取图表数据
 */
function extractChartData(serNode: XmlObject | XmlObject[] | undefined): ChartSeries[] {
  if (!serNode) return []

  const serArray = Array.isArray(serNode) ? serNode : [serNode]
  const dataMat: ChartSeries[] = []

  // 散点图特殊处理
  if (serArray[0]?.['c:xVal']) {
    const series: ChartSeries = {
      key: 'scatter',
      values: [],
      xlabels: {},
    }

    // X 值
    eachElement(serArray[0]['c:xVal']?.['c:numRef']?.['c:numCache']?.['c:pt'], (pt) => {
      const idx = parseInt(pt['attrs']?.['idx'] || '0', 10)
      const val = parseFloat(pt['c:v'] || '0')
      series.xlabels![idx] = String(val)
      return ''
    })

    // Y 值
    eachElement(serArray[0]['c:yVal']?.['c:numRef']?.['c:numCache']?.['c:pt'], (pt) => {
      const idx = pt['attrs']?.['idx'] || '0'
      const val = parseFloat(pt['c:v'] || '0')
      series.values.push({ x: idx, y: val })
      return ''
    })

    dataMat.push(series)
    return dataMat
  }

  // 普通图表数据
  for (let i = 0; i < serArray.length; i++) {
    const innerNode = serArray[i]

    // 系列名称
    const colNameValue = getTextByPathList(innerNode, ['c:tx', 'c:strRef', 'c:strCache', 'c:pt', 'c:v'])
    let colName: string | number = typeof colNameValue === 'string' ? colNameValue : i
    if (!colName || colName === i) {
      const txV = getTextByPathList(innerNode, ['c:tx', 'c:v'])
      colName = typeof txV === 'string' ? txV : i
    }

    const series: ChartSeries = {
      key: colName,
      values: [],
      xlabels: {},
    }

    // X 轴标签（分类）
    const catStrRef = getTextByPathList(innerNode, ['c:cat', 'c:strRef', 'c:strCache', 'c:pt'])
    if (catStrRef && typeof catStrRef === 'object') {
      eachElement(catStrRef as XmlObject, (pt) => {
        const idx = pt['attrs']?.['idx']
        const val = pt['c:v']
        if (idx !== undefined && val !== undefined) {
          series.xlabels![idx] = String(val)
        }
        return ''
      })
    }

    // X 轴标签（数值）
    if (Object.keys(series.xlabels || {}).length === 0) {
      const catNumRef = getTextByPathList(innerNode, ['c:cat', 'c:numRef', 'c:numCache', 'c:pt'])
      if (catNumRef && typeof catNumRef === 'object') {
        eachElement(catNumRef as XmlObject, (pt) => {
          const idx = pt['attrs']?.['idx']
          const val = pt['c:v']
          if (idx !== undefined && val !== undefined) {
            series.xlabels![idx] = String(val)
          }
          return ''
        })
      }
    }

    // Y 轴数据
    const valNumCache = getTextByPathList(innerNode, ['c:val', 'c:numRef', 'c:numCache', 'c:pt'])
    if (valNumCache && typeof valNumCache === 'object') {
      eachElement(valNumCache as XmlObject, (pt) => {
        const idx = pt['attrs']?.['idx'] || '0'
        const val = parseFloat(pt['c:v'] || '0')
        series.values.push({ x: idx, y: val })
        return ''
      })
    }

    dataMat.push(series)
  }

  return dataMat
}

/**
 * 获取图表信息
 */
function getChartInfo(
  plotArea: XmlObject,
  context: ParsingContext
): ChartData | null {
  if (!plotArea) return null

  let chartData: ChartData | null = null

  for (const key in plotArea) {
    switch (key) {
      case 'c:lineChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'lineChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          marker: !!plotArea[key]['c:marker'],
          grouping: getTextByPathList(plotArea[key], ['c:grouping', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:line3DChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'line3DChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          grouping: getTextByPathList(plotArea[key], ['c:grouping', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:barChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'barChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          barDir: getTextByPathList(plotArea[key], ['c:barDir', 'attrs', 'val']) as 'bar' | 'col',
          grouping: getTextByPathList(plotArea[key], ['c:grouping', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:bar3DChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'bar3DChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          barDir: getTextByPathList(plotArea[key], ['c:barDir', 'attrs', 'val']) as 'bar' | 'col',
          grouping: getTextByPathList(plotArea[key], ['c:grouping', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:pieChart': {
        const colors = extractChartColors(plotArea[key]['c:ser']['c:dPt'] || plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'pieChart',
          labels: [],
          legends: [],
          series: [],
          colors,
        }
        break
      }

      case 'c:pie3DChart': {
        const colors = extractChartColors(plotArea[key]['c:ser']['c:dPt'] || plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'pie3DChart',
          labels: [],
          legends: [],
          series: [],
          colors,
        }
        break
      }

      case 'c:doughnutChart': {
        const colors = extractChartColors(plotArea[key]['c:ser']['c:dPt'] || plotArea[key]['c:ser'], context)
        const holeSizeStr = getTextByPathList(plotArea[key], ['c:holeSize', 'attrs', 'val']) as string
        chartData = {
          chartType: 'doughnutChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          holeSize: holeSizeStr ? parseInt(holeSizeStr, 10) : undefined,
        }
        break
      }

      case 'c:areaChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'areaChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          grouping: getTextByPathList(plotArea[key], ['c:grouping', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:area3DChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'area3DChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          grouping: getTextByPathList(plotArea[key], ['c:grouping', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:scatterChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'scatterChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          style: getTextByPathList(plotArea[key], ['c:scatterStyle', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:bubbleChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'bubbleChart',
          labels: [],
          legends: [],
          series: [],
          colors,
        }
        break
      }

      case 'c:radarChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'radarChart',
          labels: [],
          legends: [],
          series: [],
          colors,
          style: getTextByPathList(plotArea[key], ['c:radarStyle', 'attrs', 'val']) as string,
        }
        break
      }

      case 'c:surfaceChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'surfaceChart',
          labels: [],
          legends: [],
          series: [],
          colors,
        }
        break
      }

      case 'c:surface3DChart': {
        const colors = extractChartColors(plotArea[key]['c:ser'], context)
        chartData = {
          chartType: 'surface3DChart',
          labels: [],
          legends: [],
          series: [],
          colors,
        }
        break
      }

      case 'c:stockChart': {
        chartData = {
          chartType: 'stockChart',
          labels: [],
          legends: [],
          series: [],
          colors: [],
        }
        break
      }
    }

    // 如果找到图表类型，处理数据
    if (chartData) {
      const seriesData = extractChartData(plotArea[key]['c:ser'])

      // 提取标签和图例
      if (seriesData.length > 0) {
        // 从第一个系列获取 X 轴标签
        chartData.labels = Object.values(seriesData[0].xlabels || {})

        // 提取图例和系列数据
        chartData.legends = seriesData.map(s => String(s.key))
        chartData.series = seriesData.map(s => s.values.map(v => v.y))
      }

      break
    }
  }

  return chartData
}

/**
 * 解析图表元素
 * @param _graphicFrame 图形框架节点（未使用）
 * @param rId 关系 ID
 * @param transform 变换信息
 * @param context 解析上下文
 */
export async function parseChart(
  _graphicFrame: XmlObject,
  rId: string,
  transform: PPTXTransform,
  context: ParsingContext
): Promise<PPTXElement | null> {
  if (!rId) return null

  // 从资源映射获取图表文件路径
  let chartPath = context.slideResObj[rId]?.target
  if (!chartPath) chartPath = context.layoutResObj[rId]?.target
  if (!chartPath) chartPath = context.masterResObj[rId]?.target

  if (!chartPath) {
    // 返回默认图表
    return {
      type: 'chart',
      id: `chart-${context.slideIndex}-${Date.now()}`,
      transform,
      chartType: 'column',
      rId,
    }
  }

  try {
    // 读取图表 XML
    const chartXml = await context.zip.file(chartPath)?.async('string')
    if (!chartXml) {
      return {
        type: 'chart',
        id: `chart-${context.slideIndex}-${Date.now()}`,
        transform,
        chartType: 'column',
        rId,
      }
    }

    // 解析 XML
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
    })

    const chartContent = parser.parse(chartXml) as XmlObject
    const plotArea = getTextByPathList(chartContent, ['c:chartSpace', 'c:chart', 'c:plotArea']) as XmlObject

    if (!plotArea) {
      return {
        type: 'chart',
        id: `chart-${context.slideIndex}-${Date.now()}`,
        transform,
        chartType: 'column',
        rId,
      }
    }

    // 获取图表信息
    const chartInfo = getChartInfo(plotArea, context)

    if (!chartInfo) {
      return {
        type: 'chart',
        id: `chart-${context.slideIndex}-${Date.now()}`,
        transform,
        chartType: 'column',
        rId,
      }
    }

    // 映射图表类型到 PPTX 格式
    const chartTypeMap: Record<ChartType, string> = {
      barChart: 'bar',
      bar3DChart: 'bar',
      lineChart: 'line',
      line3DChart: 'line',
      pieChart: 'pie',
      pie3DChart: 'pie',
      doughnutChart: 'pie',
      areaChart: 'area',
      area3DChart: 'area',
      scatterChart: 'scatter',
      radarChart: 'radar',
      bubbleChart: 'scatter',
      stockChart: 'line',
      surfaceChart: 'area',
      surface3DChart: 'area',
    }

    // 存储 图表数据为 JSON 字符串在扩展属性中
    return {
      type: 'chart',
      id: `chart-${context.slideIndex}-${Date.now()}`,
      transform,
      chartType: (chartTypeMap[chartInfo.chartType] || 'column') as 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter' | 'radar',
      rId,
      // 扩展属性存储完整图表数据
      ...(chartInfo.labels.length > 0 && {
        _chartData: {
          labels: chartInfo.labels,
          legends: chartInfo.legends,
          series: chartInfo.series,
          colors: chartInfo.colors,
        },
      }),
    } as PPTXElement
  } catch (error) {
    console.error('Error parsing chart:', error)
    return {
      type: 'chart',
      id: `chart-${context.slideIndex}-${Date.now()}`,
      transform,
      chartType: 'column',
      rId,
    }
  }
}

/**
 * 将图表类型映射到 PPTist 格式
 */
export function mapChartTypeToPPTist(chartType: ChartType): string {
  const typeMap: Record<ChartType, string> = {
    barChart: 'bar',
    bar3DChart: 'bar',
    lineChart: 'line',
    line3DChart: 'line',
    pieChart: 'pie',
    pie3DChart: 'pie',
    doughnutChart: 'ring',
    areaChart: 'area',
    area3DChart: 'area',
    scatterChart: 'scatter',
    radarChart: 'radar',
    bubbleChart: 'scatter',
    stockChart: 'line',
    surfaceChart: 'area',
    surface3DChart: 'area',
  }
  return typeMap[chartType] || 'column'
}
