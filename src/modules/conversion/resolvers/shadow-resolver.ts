/**
 * 阴影解析器
 * 参考 pptxtojson 的 shadow.js 实现
 */

import type { XmlObject, ParsingContext } from '../context/parsing-context.js'
import { resolveSolidFill, getTextByPathList } from './color-resolver.js'

/**
 * 阴影样式
 */
export interface ShadowStyle {
  type: 'outer' | 'inner'
  color: string
  blur: number       // 模糊半径（像素）
  offset: {
    x: number        // X 偏移（像素）
    y: number        // Y 偏移（像素）
  }
  angle?: number     // 角度（度）
  distance?: number  // 距离（像素）
  opacity?: number   // 透明度 (0-1)
}

/**
 * 角度转弧度
 */
function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * EMU 转像素
 */
function emuToPixels(emu: number): number {
  return emu / 12700
}

/**
 * 解析阴影效果
 */
export function resolveShadow(
  effectNode: XmlObject,
  context: ParsingContext
): ShadowStyle | null {
  if (!effectNode) return null

  const attrs = effectNode['attrs'] || {}

  // 解析颜色
  let color = '#000000'
  const srgbClr = effectNode['a:srgbClr']
  if (srgbClr) {
    color = getTextByPathList(srgbClr, ['attrs', 'val']) as string || '#000000'
    if (!color.startsWith('#')) color = '#' + color

    // Alpha
    const alpha = getTextByPathList(srgbClr, ['a:alpha', 'attrs', 'val']) as string
    if (alpha) {
      const alphaValue = parseInt(alpha, 10) / 100000
      color = applyAlphaToColor(color, alphaValue)
    }
  } else {
    const schemeClr = effectNode['a:schemeClr']
    if (schemeClr) {
      const solidFill = { 'a:schemeClr': schemeClr }
      color = resolveSolidFill(solidFill, context) || '#000000'
    }
  }

  // 模糊半径
  const blurRadEmu = parseInt(attrs['blurRad'] || '0', 10)
  const blur = emuToPixels(blurRadEmu)

  // 距离
  const distEmu = parseInt(attrs['dist'] || '0', 10)
  const distance = emuToPixels(distEmu)

  // 方向（角度）
  const dirDeg60000 = parseInt(attrs['dir'] || '0', 10)
  const angle = dirDeg60000 / 60000  // 转换为度

  // 计算偏移
  const radians = degreesToRadians(angle)
  const offsetX = Math.cos(radians) * distance
  const offsetY = Math.sin(radians) * distance

  // 判断类型
  const isInner = effectNode['a:innerShdw'] !== undefined
  const type: 'outer' | 'inner' = isInner ? 'inner' : 'outer'

  return {
    type,
    color,
    blur,
    offset: {
      x: offsetX,
      y: offsetY,
    },
    angle,
    distance,
  }
}

/**
 * 解析外部阴影
 */
export function resolveOuterShadow(
  outerShdwNode: XmlObject | undefined,
  context: ParsingContext
): ShadowStyle | null {
  if (!outerShdwNode) return null

  const shadow = resolveShadow(outerShdwNode, context)
  if (shadow) {
    shadow.type = 'outer'
  }
  return shadow
}

/**
 * 解析内部阴影
 */
export function resolveInnerShadow(
  innerShdwNode: XmlObject | undefined,
  context: ParsingContext
): ShadowStyle | null {
  if (!innerShdwNode) return null

  const shadow = resolveShadow(innerShdwNode, context)
  if (shadow) {
    shadow.type = 'inner'
  }
  return shadow
}

/**
 * 从效果列表解析阴影
 */
export function resolveShadowFromEffectLst(
  spPr: XmlObject,
  context: ParsingContext
): ShadowStyle | null {
  const effectLst = spPr?.['a:effectLst']
  if (!effectLst) return null

  // 优先使用外部阴影
  const outerShdw = effectLst['a:outerShdw']
  if (outerShdw) {
    return resolveOuterShadow(outerShdw, context)
  }

  // 其次使用内部阴影
  const innerShdw = effectLst['a:innerShdw']
  if (innerShdw) {
    return resolveInnerShadow(innerShdw, context)
  }

  return null
}

/**
 * 应用透明度到颜色
 */
function applyAlphaToColor(hexColor: string, alpha: number): string {
  // 移除 # 前缀
  const hex = hexColor.replace('#', '')

  // 如果已经有 alpha 通道
  if (hex.length === 8) {
    const existingAlpha = parseInt(hex.slice(6, 8), 16) / 255
    const newAlpha = Math.round(alpha * existingAlpha * 255)
    return `#${hex.slice(0, 6)}${newAlpha.toString(16).padStart(2, '0')}`
  }

  // 添加 alpha 通道
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `#${hex}${alphaHex}`
}

/**
 * 将阴影转换为 CSS 样式
 */
export function shadowToCss(shadow: ShadowStyle | null): string {
  if (!shadow) return ''

  const { color, blur, offset } = shadow
  const x = offset.x.toFixed(2)
  const y = offset.y.toFixed(2)
  const blurPx = blur.toFixed(2)

  if (shadow.type === 'inner') {
    return `inset ${x}px ${y}px ${blurPx}px ${color}`
  }

  return `${x}px ${y}px ${blurPx}px ${color}`
}
