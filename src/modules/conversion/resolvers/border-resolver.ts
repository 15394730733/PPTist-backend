/**
 * 边框解析器
 * 参考 pptxtojson 的 border.js 实现
 */

import type { XmlObject, ParsingContext } from '../context/parsing-context.js'
import { resolveSolidFill, getTextByPathList } from './color-resolver.js'

/**
 * 边框样式
 */
export interface BorderStyle {
  color: string
  width: number      // 宽度（像素）
  type: 'solid' | 'dashed' | 'dotted' | 'none'
  strokeDasharray?: string  // SVG 虚线样式
}

/**
 * EMU 转像素
 */
function emuToPixels(emu: number): number {
  return emu / 12700
}

/**
 * 解析边框样式
 */
export function resolveBorder(
  lnNode: XmlObject | undefined,
  context: ParsingContext
): BorderStyle | null {
  if (!lnNode) return null

  const attrs = lnNode['attrs'] || {}

  // 宽度
  const widthEmu = parseInt(attrs['w'] || '0', 10)
  const width = emuToPixels(widthEmu)

  // 如果宽度为 0，返回 null
  if (width === 0) return null

  // 解析颜色
  let color = '#000000'
  const solidFill = lnNode['a:solidFill']
  if (solidFill) {
    color = resolveSolidFill(solidFill, context) || '#000000'
  }

  // 解析边框类型
  let type: 'solid' | 'dashed' | 'dotted' | 'none' = 'solid'
  let strokeDasharray: string | undefined

  const prstDash = lnNode['a:prstDash']
  if (prstDash) {
    const dashVal = getTextByPathList(prstDash, ['attrs', 'val']) as string
    switch (dashVal) {
      case 'dash':
        type = 'dashed'
        strokeDasharray = '10,5'
        break
      case 'dashDot':
        type = 'dashed'
        strokeDasharray = '10,5,2,5'
        break
      case 'dashDotDot':
        type = 'dashed'
        strokeDasharray = '10,5,2,5,2,5'
        break
      case 'dot':
        type = 'dotted'
        strokeDasharray = '2,5'
        break
      case 'lgDash':
        type = 'dashed'
        strokeDasharray = '15,5'
        break
      case 'lgDashDot':
        type = 'dashed'
        strokeDasharray = '15,5,2,5'
        break
      case 'lgDashDotDot':
        type = 'dashed'
        strokeDasharray = '15,5,2,5,2,5'
        break
      case 'sysDash':
        type = 'dashed'
        strokeDasharray = '5,3'
        break
      case 'sysDashDot':
        type = 'dashed'
        strokeDasharray = '5,3,1,3'
        break
      case 'sysDashDotDot':
        type = 'dashed'
        strokeDasharray = '5,3,1,3,1,3'
        break
      case 'sysDot':
        type = 'dotted'
        strokeDasharray = '1,3'
        break
      case 'solid':
      default:
        type = 'solid'
        break
    }
  }

  // 检查自定义虚线
  const custDash = lnNode['a:custDash']
  if (custDash) {
    type = 'dashed'
    const ds = custDash['a:ds'] || []
    const dsArray = Array.isArray(ds) ? ds : [ds]
    const dashParts: string[] = []

    for (const d of dsArray) {
      const dVal = parseInt(getTextByPathList(d, ['attrs', 'd']) as string || '0', 10) / 1000
      const spVal = parseInt(getTextByPathList(d, ['attrs', 'sp']) as string || '0', 10) / 1000
      dashParts.push(`${dVal * width},${spVal * width}`)
    }

    if (dashParts.length > 0) {
      strokeDasharray = dashParts.join(',')
    }
  }

  return {
    color,
    width,
    type,
    strokeDasharray,
  }
}

/**
 * 从形状属性解析边框
 */
export function resolveBorderFromSpPr(
  spPr: XmlObject | undefined,
  context: ParsingContext
): BorderStyle | null {
  if (!spPr) return null

  const ln = spPr['a:ln']
  if (!ln) {
    // 尝试从样式引用获取
    const lnRef = spPr['a:lnRef']
    if (lnRef) {
      return resolveBorderFromLnRef(lnRef, context)
    }
    return null
  }

  return resolveBorder(ln, context)
}

/**
 * 从样式引用解析边框
 */
export function resolveBorderFromLnRef(
  lnRef: XmlObject | undefined,
  context: ParsingContext
): BorderStyle | null {
  if (!lnRef) return null

  // 从 lnRef 获取颜色
  const color = resolveSolidFill(lnRef, context) || '#000000'

  // 获取索引
  const idx = parseInt(getTextByPathList(lnRef, ['attrs', 'idx']) as string || '0', 10)

  // 根据索引确定宽度
  // Office 线条样式索引：0 = 无，1 = 极细，2 = 细，3 = 中等，4 = 宽
  const widthMap: Record<number, number> = {
    0: 0,
    1: 0.5,
    2: 1,
    3: 2,
    4: 3,
  }

  const width = widthMap[idx] || 1

  if (width === 0) return null

  return {
    color,
    width,
    type: 'solid',
  }
}

/**
 * 将边框转换为 CSS 样式
 */
export function borderToCss(border: BorderStyle | null): string {
  if (!border || border.type === 'none') return 'none'

  const { color, width, type } = border
  return `${width}px ${type} ${color}`
}

/**
 * 将边框转换为 SVG 属性
 */
export function borderToSvgAttr(border: BorderStyle | null): {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  strokeDashoffset?: number
} {
  if (!border || border.type === 'none') {
    return {}
  }

  const result: {
    stroke?: string
    strokeWidth?: number
    strokeDasharray?: string
  } = {
    stroke: border.color,
    strokeWidth: border.width,
  }

  if (border.strokeDasharray) {
    result.strokeDasharray = border.strokeDasharray
  }

  return result
}

/**
 * 解析形状的完整边框（包括样式引用）
 */
export function resolveShapeBorder(
  node: XmlObject,
  context: ParsingContext
): BorderStyle | null {
  const spPr = node['p:spPr']

  // 首先尝试直接边框
  let border = resolveBorderFromSpPr(spPr, context)

  // 如果没有直接边框，尝试样式引用
  if (!border) {
    const style = node['p:style']
    if (style) {
      const lnRef = style['a:lnRef']
      if (lnRef) {
        border = resolveBorderFromLnRef(lnRef, context)
      }
    }
  }

  return border
}
