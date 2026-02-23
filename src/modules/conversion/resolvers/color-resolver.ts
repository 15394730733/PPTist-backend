/**
 * 颜色解析器
 * 参考 pptxtojson 的 color.js 和 schemeColor.js 实现
 * 支持所有 PPTX 颜色类型和修饰符
 */

import tinycolor from 'tinycolor2'
import type { XmlObject, ParsingContext, ColorMapOverride } from '../context/parsing-context.js'

/**
 * 预设颜色名称到十六进制的映射
 */
const PRESET_COLORS: Record<string, string> = {
  white: 'FFFFFF',
  black: '000000',
  red: 'FF0000',
  green: '00FF00',
  blue: '0000FF',
  yellow: 'FFFF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  aliceblue: 'F0F8FF',
  antiquewhite: 'FAEBD7',
  aqua: '00FFFF',
  aquamarine: '7FFFD4',
  azure: 'F0FFFF',
  beige: 'F5F5DC',
  bisque: 'FFE4C4',
  blanchedalmond: 'FFEBCD',
  blueviolet: '8A2BE2',
  brown: 'A52A2A',
  burlywood: 'DEB887',
  cadetblue: '5F9EA0',
  chartreuse: '7FFF00',
  chocolate: 'D2691E',
  coral: 'FF7F50',
  cornflowerblue: '6495ED',
  cornsilk: 'FFF8DC',
  crimson: 'DC143C',
  darkblue: '00008B',
  darkcyan: '008B8B',
  darkgoldenrod: 'B8860B',
  darkgray: 'A9A9A9',
  darkgrey: 'A9A9A9',
  darkgreen: '006400',
  darkkhaki: 'BDB76B',
  darkmagenta: '8B008B',
  darkolivegreen: '556B2F',
  darkorange: 'FF8C00',
  darkorchid: '9932CC',
  darkred: '8B0000',
  darksalmon: 'E9967A',
  darkseagreen: '8FBC8F',
  darkslateblue: '483D8B',
  darkslategray: '2F4F4F',
  darkslategrey: '2F4F4F',
  darkturquoise: '00CED1',
  darkviolet: '9400D3',
  deeppink: 'FF1493',
  deepskyblue: '00BFFF',
  dimgray: '696969',
  dimgrey: '696969',
  dodgerblue: '1E90FF',
  firebrick: 'B22222',
  floralwhite: 'FFFAF0',
  forestgreen: '228B22',
  fuchsia: 'FF00FF',
  gainsboro: 'DCDCDC',
  ghostwhite: 'F8F8FF',
  gold: 'FFD700',
  goldenrod: 'DAA520',
  gray: '808080',
  grey: '808080',
  greenyellow: 'ADFF2F',
  honeydew: 'F0FFF0',
  hotpink: 'FF69B4',
  indianred: 'CD5C5C',
  indigo: '4B0082',
  ivory: 'FFFFF0',
  khaki: 'F0E68C',
  lavender: 'E6E6FA',
  lavenderblush: 'FFF0F5',
  lawngreen: '7CFC00',
  lemonchiffon: 'FFFACD',
  lightblue: 'ADD8E6',
  lightcoral: 'F08080',
  lightcyan: 'E0FFFF',
  lightgoldenrodyellow: 'FAFAD2',
  lightgray: 'D3D3D3',
  lightgrey: 'D3D3D3',
  lightgreen: '90EE90',
  lightpink: 'FFB6C1',
  lightsalmon: 'FFA07A',
  lightseagreen: '20B2AA',
  lightskyblue: '87CEFA',
  lightslategray: '778899',
  lightslategrey: '778899',
  lightsteelblue: 'B0C4DE',
  lightyellow: 'FFFFE0',
  lime: '00FF00',
  limegreen: '32CD32',
  linen: 'FAF0E6',
  maroon: '800000',
  mediumaquamarine: '66CDAA',
  mediumblue: '0000CD',
  mediumorchid: 'BA55D3',
  mediumpurple: '9370DB',
  mediumseagreen: '3CB371',
  mediumslateblue: '7B68EE',
  mediumspringgreen: '00FA9A',
  mediumturquoise: '48D1CC',
  mediumvioletred: 'C71585',
  midnightblue: '191970',
  mintcream: 'F5FFFA',
  mistyrose: 'FFE4E1',
  moccasin: 'FFE4B5',
  navajowhite: 'FFDEAD',
  navy: '000080',
  oldlace: 'FDF5E6',
  olive: '808000',
  olivedrab: '6B8E23',
  orange: 'FFA500',
  orangered: 'FF4500',
  orchid: 'DA70D6',
  palegoldenrod: 'EEE8AA',
  palegreen: '98FB98',
  paleturquoise: 'AFEEEE',
  palevioletred: 'DB7093',
  papayawhip: 'FFEFD5',
  peachpuff: 'FFDAB9',
  peru: 'CD853F',
  pink: 'FFC0CB',
  plum: 'DDA0DD',
  powderblue: 'B0E0E6',
  purple: '800080',
  rebeccapurple: '663399',
  rosybrown: 'BC8F8F',
  royalblue: '4169E1',
  saddlebrown: '8B4513',
  salmon: 'FA8072',
  sandybrown: 'F4A460',
  seagreen: '2E8B57',
  seashell: 'FFF5EE',
  sienna: 'A0522D',
  silver: 'C0C0C0',
  skyblue: '87CEEB',
  slateblue: '6A5ACD',
  slategray: '708090',
  slategrey: '708090',
  snow: 'FFFAFA',
  springgreen: '00FF7F',
  steelblue: '4682B4',
  tan: 'D2B48C',
  teal: '008080',
  thistle: 'D8BFD8',
  tomato: 'FF6347',
  turquoise: '40E0D0',
  violet: 'EE82EE',
  wheat: 'F5DEB3',
  whitesmoke: 'F5F5F5',
  yellowgreen: '9ACD32',
}

/**
 * 获取路径列表中的值
 */
export function getTextByPathList(obj: XmlObject | undefined, pathList: string[]): string | XmlObject | undefined {
  if (!obj) return undefined

  let current: XmlObject | string | undefined = obj
  for (const key of pathList) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined
    }
    current = (current as XmlObject)[key]
  }
  return current as string | XmlObject | undefined
}

/**
 * HSL 转 RGB
 */
function hslToRgb(hue: number, sat: number, light: number): { r: number; g: number; b: number } {
  const hueToRgb = (t1: number, t2: number, h: number): number => {
    if (h < 0) h += 6
    if (h >= 6) h -= 6
    if (h < 1) return (t2 - t1) * h + t1
    if (h < 3) return t2
    if (h < 4) return (t2 - t1) * (4 - h) + t1
    return t1
  }

  const hueNorm = hue / 60
  let t2: number
  if (light <= 0.5) {
    t2 = light * (sat + 1)
  } else {
    t2 = light + sat - light * sat
  }
  const t1 = light * 2 - t2

  return {
    r: Math.round(hueToRgb(t1, t2, hueNorm + 2) * 255),
    g: Math.round(hueToRgb(t1, t2, hueNorm) * 255),
    b: Math.round(hueToRgb(t1, t2, hueNorm - 2) * 255),
  }
}

/**
 * 数值转十六进制
 */
function toHex(value: number): string {
  const hex = Math.round(Math.min(255, Math.max(0, value))).toString(16)
  return hex.length === 1 ? '0' + hex : hex
}

/**
 * 应用阴影效果
 */
function applyShade(hexColor: string, shadeValue: number, hasAlpha: boolean): string {
  const color = tinycolor(hexColor).toHsl()
  shadeValue = Math.min(shadeValue, 1)
  const newL = Math.min(color.l * shadeValue, 1)
  const newColor = { h: color.h, s: color.s, l: newL, a: color.a }
  return hasAlpha ? tinycolor(newColor).toHex8() : tinycolor(newColor).toHex()
}

/**
 * 应用色调效果
 */
function applyTint(hexColor: string, tintValue: number, hasAlpha: boolean): string {
  const color = tinycolor(hexColor).toHsl()
  tintValue = Math.min(tintValue, 1)
  const newL = color.l * tintValue + (1 - tintValue)
  const newColor = { h: color.h, s: color.s, l: newL, a: color.a }
  return hasAlpha ? tinycolor(newColor).toHex8() : tinycolor(newColor).toHex()
}

/**
 * 应用亮度偏移
 */
function applyLumOff(hexColor: string, offset: number, hasAlpha: boolean): string {
  const color = tinycolor(hexColor).toHsl()
  const newL = Math.min(offset + color.l, 1)
  const newColor = { h: color.h, s: color.s, l: newL, a: color.a }
  return hasAlpha ? tinycolor(newColor).toHex8() : tinycolor(newColor).toHex()
}

/**
 * 应用亮度调制
 */
function applyLumMod(hexColor: string, multiplier: number, hasAlpha: boolean): string {
  const color = tinycolor(hexColor).toHsl()
  const newL = Math.min(color.l * multiplier, 1)
  const newColor = { h: color.h, s: color.s, l: newL, a: color.a }
  return hasAlpha ? tinycolor(newColor).toHex8() : tinycolor(newColor).toHex()
}

/**
 * 应用色调调制
 */
function applyHueMod(hexColor: string, multiplier: number, hasAlpha: boolean): string {
  const color = tinycolor(hexColor).toHsl()
  let newH = color.h * multiplier
  if (newH >= 360) newH -= 360
  const newColor = { h: newH, s: color.s, l: color.l, a: color.a }
  return hasAlpha ? tinycolor(newColor).toHex8() : tinycolor(newColor).toHex()
}

/**
 * 应用饱和度调制
 */
function applySatMod(hexColor: string, multiplier: number, hasAlpha: boolean): string {
  const color = tinycolor(hexColor).toHsl()
  const newS = Math.min(color.s * multiplier, 1)
  const newColor = { h: color.h, s: newS, l: color.l, a: color.a }
  return hasAlpha ? tinycolor(newColor).toHex8() : tinycolor(newColor).toHex()
}

/**
 * 从主题获取方案颜色
 */
export function getSchemeColorFromTheme(
  schemeClr: string,
  context: ParsingContext,
  clrMap?: ColorMapOverride,
  phClr?: string
): string {
  // 获取颜色映射覆盖
  let slideLayoutClrOvride = clrMap
  let color: string
  if (!slideLayoutClrOvride) {
    const sldClrMapOvr = getTextByPathList(
      context.slideContent,
      ['p:sld', 'p:clrMapOvr', 'a:overrideClrMapping', 'attrs']
    ) as XmlObject | undefined
    if (sldClrMapOvr) {
      slideLayoutClrOvride = sldClrMapOvr as ColorMapOverride
    } else {
      const layoutClrMapOvr = getTextByPathList(
        context.slideLayoutContent,
        ['p:sldLayout', 'p:clrMapOvr', 'a:overrideClrMapping', 'attrs']
      ) as XmlObject | undefined
      if (layoutClrMapOvr) {
        slideLayoutClrOvride = layoutClrMapOvr as ColorMapOverride
      } else {
        slideLayoutClrOvride = getTextByPathList(
          context.slideMasterContent,
          ['p:sldMaster', 'p:clrMap', 'attrs']
        ) as ColorMapOverride | undefined
      }
    }
  }

  // 去掉 'a:' 前缀
  const schmClrName = schemeClr.replace(/^a:/, '')

  if (schmClrName === 'phClr' && phClr) {
    color = phClr
  } else {
    // 处理颜色映射
    let mappedSchemeClr = schemeClr
    if (slideLayoutClrOvride) {
      switch (schmClrName) {
        case 'tx1':
        case 'tx2':
        case 'bg1':
        case 'bg2':
          mappedSchemeClr = 'a:' + (slideLayoutClrOvride[schmClrName] || schmClrName)
          break
      }
    } else {
      // 默认映射
      switch (schemeClr) {
        case 'tx1':
          mappedSchemeClr = 'a:dk1'
          break
        case 'tx2':
          mappedSchemeClr = 'a:dk2'
          break
        case 'bg1':
          mappedSchemeClr = 'a:lt1'
          break
        case 'bg2':
          mappedSchemeClr = 'a:lt2'
          break
      }
    }

    // 从主题获取颜色
    const refNode = getTextByPathList(
      context.themeContent,
      ['a:theme', 'a:themeElements', 'a:clrScheme', mappedSchemeClr]
    ) as XmlObject | undefined
    color = getTextByPathList(refNode || {}, ['a:srgbClr', 'attrs', 'val']) as string || ''
    if (!color && refNode) {
      color = getTextByPathList(refNode, ['a:sysClr', 'attrs', 'lastClr']) as string || ''
    }
  }

  return color
}

/**
 * 解析纯色填充节点，返回十六进制颜色
 */
export function resolveSolidFill(
  solidFill: XmlObject | undefined,
  context: ParsingContext,
  clrMap?: ColorMapOverride,
  phClr?: string
): string {
  if (!solidFill) return ''

  let color = ''
  let clrNode: XmlObject | undefined

  // srgbClr: RGB 颜色
  if (solidFill['a:srgbClr']) {
    clrNode = solidFill['a:srgbClr']
    color = getTextByPathList(clrNode, ['attrs', 'val']) as string || ''
  }
  // schemeClr: 主题颜色
  else if (solidFill['a:schemeClr']) {
    clrNode = solidFill['a:schemeClr']
    const schemeClr = 'a:' + (getTextByPathList(clrNode, ['attrs', 'val']) as string || '')
    color = getSchemeColorFromTheme(schemeClr, context, clrMap, phClr)
  }
  // scrgbClr: RGB 百分比
  else if (solidFill['a:scrgbClr']) {
    clrNode = solidFill['a:scrgbClr']
    const attrs = clrNode!['attrs'] || {}
    const r = parseFloat((attrs['r'] || '0').toString().replace('%', '')) / 100
    const g = parseFloat((attrs['g'] || '0').toString().replace('%', '')) / 100
    const b = parseFloat((attrs['b'] || '0').toString().replace('%', '')) / 100
    color = toHex(255 * r) + toHex(255 * g) + toHex(255 * b)
  }
  // prstClr: 预设颜色
  else if (solidFill['a:prstClr']) {
    clrNode = solidFill['a:prstClr']
    const prstClr = getTextByPathList(clrNode, ['attrs', 'val']) as string || ''
    color = PRESET_COLORS[prstClr.toLowerCase()] || '000000'
  }
  // hslClr: HSL 颜色
  else if (solidFill['a:hslClr']) {
    clrNode = solidFill['a:hslClr']
    const attrs = clrNode!['attrs'] || {}
    const hue = parseFloat(attrs['hue'] || '0') / 100000
    const sat = parseFloat((attrs['sat'] || '0').toString().replace('%', '')) / 100
    const lum = parseFloat((attrs['lum'] || '0').toString().replace('%', '')) / 100
    const rgb = hslToRgb(hue, sat, lum)
    color = toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)
  }
  // sysClr: 系统颜色
  else if (solidFill['a:sysClr']) {
    clrNode = solidFill['a:sysClr']
    const sysClr = getTextByPathList(clrNode, ['attrs', 'lastClr']) as string
    if (sysClr) color = sysClr
  }

  // 如果没有颜色节点，但有 fillRef（样式引用）
  if (!color && solidFill['a:fillRef']) {
    return resolveSolidFill(solidFill['a:fillRef'], context, clrMap, phClr)
  }

  // 应用颜色修饰符
  if (clrNode && color) {
    let hasAlpha = false

    // alpha: 透明度
    const alpha = parseInt(getTextByPathList(clrNode, ['a:alpha', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(alpha)) {
      const alColor = tinycolor(color)
      alColor.setAlpha(alpha)
      color = alColor.toHex8()
      hasAlpha = true
    }

    // hueMod: 色调调制
    const hueMod = parseInt(getTextByPathList(clrNode, ['a:hueMod', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(hueMod)) {
      color = applyHueMod(color, hueMod, hasAlpha)
    }

    // lumMod: 亮度调制
    const lumMod = parseInt(getTextByPathList(clrNode, ['a:lumMod', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(lumMod)) {
      color = applyLumMod(color, lumMod, hasAlpha)
    }

    // lumOff: 亮度偏移
    const lumOff = parseInt(getTextByPathList(clrNode, ['a:lumOff', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(lumOff)) {
      color = applyLumOff(color, lumOff, hasAlpha)
    }

    // satMod: 饱和度调制
    const satMod = parseInt(getTextByPathList(clrNode, ['a:satMod', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(satMod)) {
      color = applySatMod(color, satMod, hasAlpha)
    }

    // shade: 阴影
    const shade = parseInt(getTextByPathList(clrNode, ['a:shade', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(shade)) {
      color = applyShade(color, shade, hasAlpha)
    }

    // tint: 色调
    const tint = parseInt(getTextByPathList(clrNode, ['a:tint', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(tint)) {
      color = applyTint(color, tint, hasAlpha)
    }
  }

  // 确保颜色有 # 前缀
  if (color && !color.startsWith('#')) {
    color = '#' + color
  }

  return color
}

/**
 * 解析颜色节点
 * @param node 包含颜色信息的节点（如 solidFill、fillRef 等）
 * @param context 解析上下文
 * @returns 十六进制颜色字符串（带 # 前缀）
 */
export function resolveColor(
  node: XmlObject | undefined,
  context: ParsingContext
): string {
  if (!node) return ''

  // 尝试解析各种颜色类型
  return resolveSolidFill(node, context)
}

/**
 * 解析纯色填充节点，返回颜色和透明度
 * @param solidFill solidFill XML 节点
 * @param context 解析上下文
 * @returns 包含颜色和可选透明度的对象
 */
export function resolveSolidFillWithAlpha(
  solidFill: XmlObject | undefined,
  context: ParsingContext,
  clrMap?: ColorMapOverride,
  phClr?: string
): { color: string; alpha?: number } {
  if (!solidFill) return { color: '' }

  let color = ''
  let alpha: number | undefined
  let clrNode: XmlObject | undefined

  // srgbClr: RGB 颜色
  if (solidFill['a:srgbClr']) {
    clrNode = solidFill['a:srgbClr']
    color = getTextByPathList(clrNode, ['attrs', 'val']) as string || ''
  }
  // schemeClr: 主题颜色
  else if (solidFill['a:schemeClr']) {
    clrNode = solidFill['a:schemeClr']
    const schemeClr = 'a:' + (getTextByPathList(clrNode, ['attrs', 'val']) as string || '')
    color = getSchemeColorFromTheme(schemeClr, context, clrMap, phClr)
  }
  // scrgbClr: RGB 百分比
  else if (solidFill['a:scrgbClr']) {
    clrNode = solidFill['a:scrgbClr']
    const attrs = clrNode!['attrs'] || {}
    const r = parseFloat((attrs['r'] || '0').toString().replace('%', '')) / 100
    const g = parseFloat((attrs['g'] || '0').toString().replace('%', '')) / 100
    const b = parseFloat((attrs['b'] || '0').toString().replace('%', '')) / 100
    color = toHex(255 * r) + toHex(255 * g) + toHex(255 * b)
  }
  // prstClr: 预设颜色
  else if (solidFill['a:prstClr']) {
    clrNode = solidFill['a:prstClr']
    const prstClr = getTextByPathList(clrNode, ['attrs', 'val']) as string || ''
    color = PRESET_COLORS[prstClr.toLowerCase()] || '000000'
  }
  // hslClr: HSL 颜色
  else if (solidFill['a:hslClr']) {
    clrNode = solidFill['a:hslClr']
    const attrs = clrNode!['attrs'] || {}
    const hue = parseFloat(attrs['hue'] || '0') / 100000
    const sat = parseFloat((attrs['sat'] || '0').toString().replace('%', '')) / 100
    const lum = parseFloat((attrs['lum'] || '0').toString().replace('%', '')) / 100
    const rgb = hslToRgb(hue, sat, lum)
    color = toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b)
  }
  // sysClr: 系统颜色
  else if (solidFill['a:sysClr']) {
    clrNode = solidFill['a:sysClr']
    const sysClr = getTextByPathList(clrNode, ['attrs', 'lastClr']) as string
    if (sysClr) color = sysClr
  }

  // 如果没有颜色节点，但有 fillRef（样式引用）
  if (!color && solidFill['a:fillRef']) {
    return resolveSolidFillWithAlpha(solidFill['a:fillRef'], context, clrMap, phClr)
  }

  // 提取 alpha 透明度（0-100000 范围，需要转换为 0-1）
  if (clrNode) {
    const alphaValue = getTextByPathList(clrNode, ['a:alpha', 'attrs', 'val'])
    if (alphaValue) {
      const parsedAlpha = parseInt(alphaValue as string, 10) / 100000
      if (!isNaN(parsedAlpha)) {
        alpha = parsedAlpha
      }
    }

    // 应用其他颜色修饰符（不影响 alpha）
    // 注意：这里我们只应用修饰符到颜色，不改变 alpha
    const hasAlpha = false

    // hueMod: 色调调制
    const hueMod = parseInt(getTextByPathList(clrNode, ['a:hueMod', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(hueMod)) {
      color = applyHueMod(color, hueMod, hasAlpha)
    }

    // lumMod: 亮度调制
    const lumMod = parseInt(getTextByPathList(clrNode, ['a:lumMod', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(lumMod)) {
      color = applyLumMod(color, lumMod, hasAlpha)
    }

    // lumOff: 亮度偏移
    const lumOff = parseInt(getTextByPathList(clrNode, ['a:lumOff', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(lumOff)) {
      color = applyLumOff(color, lumOff, hasAlpha)
    }

    // satMod: 饱和度调制
    const satMod = parseInt(getTextByPathList(clrNode, ['a:satMod', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(satMod)) {
      color = applySatMod(color, satMod, hasAlpha)
    }

    // shade: 阴影
    const shade = parseInt(getTextByPathList(clrNode, ['a:shade', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(shade)) {
      color = applyShade(color, shade, hasAlpha)
    }

    // tint: 色调
    const tint = parseInt(getTextByPathList(clrNode, ['a:tint', 'attrs', 'val']) as string || '') / 100000
    if (!isNaN(tint)) {
      color = applyTint(color, tint, hasAlpha)
    }
  }

  // 确保颜色有 # 前缀
  if (color && !color.startsWith('#')) {
    color = '#' + color
  }

  return { color, alpha }
}
