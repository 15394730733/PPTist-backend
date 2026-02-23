/**
 * 填充解析器
 * 参考 pptxtojson 的 fill.js 实现
 * 支持纯色、渐变、图片、图案填充
 */

import type { XmlObject, ParsingContext, ResourceMap } from '../context/parsing-context.js'
import { resolveSolidFill, getTextByPathList } from './color-resolver.js'

/**
 * 渐变停止点
 */
export interface GradientStop {
  pos: string  // 位置百分比，如 "0%", "50%"
  color: string  // 颜色值
}

/**
 * 纯色填充
 */
export interface SolidFill {
  type: 'solid'
  color: string
}

/**
 * 渐变填充
 */
export interface GradientFill {
  type: 'gradient'
  gradientType: 'linear' | 'path'
  angle?: number  // 线性渐变角度（度）
  path?: 'circle' | 'rect' | 'shape'  // 路径渐变类型
  colors: GradientStop[]
}

/**
 * 图片填充
 */
export interface ImageFill {
  type: 'image'
  src: string  // base64 数据 URL
  opacity?: number
  transparency?: number
}

/**
 * 图案填充
 */
export interface PatternFill {
  type: 'pattern'
  pattern: string  // 图案类型
  foregroundColor: string
  backgroundColor: string
}

/**
 * 无填充
 */
export interface NoFill {
  type: 'none'
}

/**
 * 填充样式联合类型
 */
export type FillStyle = SolidFill | GradientFill | ImageFill | PatternFill | NoFill

/**
 * 角度转度数
 */
function angleToDegrees(angle: string | number): number {
  const degrees = (typeof angle === 'string' ? parseInt(angle, 10) : angle) / 60000
  return degrees
}

/**
 * 获取填充类型
 */
export function getFillType(node: XmlObject): string {
  if (node['a:noFill']) return 'NO_FILL'
  if (node['a:solidFill']) return 'SOLID_FILL'
  if (node['a:gradFill']) return 'GRADIENT_FILL'
  if (node['a:pattFill']) return 'PATTERN_FILL'
  if (node['a:blipFill']) return 'PIC_FILL'
  if (node['a:grpFill']) return 'GROUP_FILL'
  return ''
}

/**
 * 获取 MIME 类型
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
  }
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
}

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return Buffer.from(binary, 'binary').toString('base64')
}

/**
 * 从资源映射获取图片路径
 */
function getImagePath(rId: string, resObj: ResourceMap): string | undefined {
  const resource = resObj[rId]
  if (!resource) return undefined
  return resource.target
}

/**
 * 获取图片填充
 */
async function getPicFill(
  blipFill: XmlObject,
  context: ParsingContext,
  source: 'slide' | 'slideLayout' | 'slideMaster' | 'theme' = 'slide'
): Promise<ImageFill | null> {
  const blip = blipFill?.['a:blip']
  if (!blip) return null

  const rId = getTextByPathList(blip, ['attrs', 'r:embed']) as string
  if (!rId) return null

  // 根据来源选择资源映射
  let resObj: ResourceMap
  switch (source) {
    case 'slideLayout':
      resObj = context.layoutResObj
      break
    case 'slideMaster':
      resObj = context.masterResObj
      break
    case 'theme':
      resObj = context.themeResObj
      break
    default:
      resObj = context.slideResObj
  }

  let imgPath = getImagePath(rId, resObj)

  // 如果在当前级别找不到，尝试在更高级别查找
  if (!imgPath && source === 'slide') {
    imgPath = getImagePath(rId, context.layoutResObj)
  }
  if (!imgPath && source === 'slide') {
    imgPath = getImagePath(rId, context.masterResObj)
  }

  if (!imgPath) return null

  // 检查缓存
  const cachedImage = context.loadedImages.get(imgPath)
  if (cachedImage) {
    return {
      type: 'image',
      src: cachedImage,
      opacity: getPicFillOpacity(blipFill),
    }
  }

  // xml 文件不是图片
  const ext = imgPath.split('.').pop()?.toLowerCase()
  if (ext === 'xml') return null

  try {
    const imgArrayBuffer = await context.zip.file(imgPath)?.async('arraybuffer')
    if (!imgArrayBuffer) return null

    const mimeType = getMimeType(ext || '')
    const base64 = arrayBufferToBase64(imgArrayBuffer)
    const src = `data:${mimeType};base64,${base64}`

    // 缓存图片
    context.loadedImages.set(imgPath, src)

    return {
      type: 'image',
      src,
      opacity: getPicFillOpacity(blipFill),
    }
  } catch {
    return null
  }
}

/**
 * 获取图片填充透明度
 */
function getPicFillOpacity(blipFill: XmlObject): number {
  const aBlipNode = blipFill?.['a:blip']
  const aphaModFixNode = getTextByPathList(aBlipNode, ['a:alphaModFix', 'attrs'])
  if (aphaModFixNode && typeof aphaModFixNode === 'object' && 'amt' in aphaModFixNode) {
    return parseInt((aphaModFixNode as Record<string, unknown>)['amt'] as string, 10) / 100000
  }
  return 1
}

/**
 * 获取渐变填充
 */
function getGradientFill(
  gradFill: XmlObject,
  context: ParsingContext
): GradientFill {
  const gsLst = gradFill?.['a:gsLst']?.['a:gs'] || []
  const gsArray = Array.isArray(gsLst) ? gsLst : [gsLst]

  const colors: GradientStop[] = gsArray.map((gs: XmlObject) => {
    const color = resolveSolidFill(gs, context)
    const posAttr = getTextByPathList(gs, ['attrs', 'pos']) as string
    const pos = posAttr ? (parseInt(posAttr, 10) / 1000) + '%' : '0%'

    return { pos, color }
  })

  // 排序
  colors.sort((a, b) => parseInt(a.pos) - parseInt(b.pos))

  // 线性渐变
  const lin = gradFill?.['a:lin']
  let angle = 0
  let gradientType: 'linear' | 'path' = 'linear'
  let pathType: 'circle' | 'rect' | 'shape' | undefined

  if (lin) {
    angle = angleToDegrees(lin['attrs']?.['ang'] || 0)
  } else {
    const path = gradFill?.['a:path']
    gradientType = 'path'
    if (path?.['attrs']?.['path']) {
      pathType = path['attrs']['path'] as 'circle' | 'rect' | 'shape'
    }
  }

  const result: GradientFill = {
    type: 'gradient',
    gradientType,
    angle,
    colors,
  }

  if (pathType) {
    result.path = pathType
  }

  return result
}

/**
 * 获取图案填充
 */
function getPatternFill(
  pattFill: XmlObject,
  context: ParsingContext
): PatternFill | null {
  if (!pattFill) return null

  const type = getTextByPathList(pattFill, ['attrs', 'prst']) as string || ''

  const fgColorNode = pattFill['a:fgClr']
  const bgColorNode = pattFill['a:bgClr']

  let foregroundColor = '#000000'
  let backgroundColor = '#FFFFFF'

  if (fgColorNode) {
    foregroundColor = resolveSolidFill(fgColorNode, context) || '#000000'
  }

  if (bgColorNode) {
    backgroundColor = resolveSolidFill(bgColorNode, context) || '#FFFFFF'
  }

  return {
    type: 'pattern',
    pattern: type,
    foregroundColor,
    backgroundColor,
  }
}

/**
 * 解析填充样式
 * @param spPr 形状属性节点
 * @param context 解析上下文
 * @param source 填充来源
 */
export async function resolveFill(
  spPr: XmlObject | undefined,
  context: ParsingContext,
  source: 'slide' | 'slideLayout' | 'slideMaster' | 'theme' = 'slide'
): Promise<FillStyle> {
  if (!spPr) {
    return { type: 'none' }
  }

  const fillType = getFillType(spPr)

  switch (fillType) {
    case 'NO_FILL':
      return { type: 'none' }

    case 'SOLID_FILL': {
      const color = resolveSolidFill(spPr['a:solidFill'], context)
      return { type: 'solid', color }
    }

    case 'GRADIENT_FILL': {
      const gradient = getGradientFill(spPr['a:gradFill'], context)
      return gradient
    }

    case 'PIC_FILL': {
      const imageFill = await getPicFill(spPr['a:blipFill'], context, source)
      if (imageFill) return imageFill
      return { type: 'none' }
    }

    case 'PATTERN_FILL': {
      const patternFill = getPatternFill(spPr['a:pattFill'], context)
      if (patternFill) return patternFill
      return { type: 'none' }
    }

    case 'GROUP_FILL':
      // 组合填充需要从组层级继承
      return { type: 'none' }

    default: {
      // 尝试从样式引用获取填充
      const fillRef = spPr['a:fillRef']
      if (fillRef) {
        const color = resolveSolidFill(fillRef, context)
        if (color) return { type: 'solid', color }
      }
      return { type: 'none' }
    }
  }
}

/**
 * 解析幻灯片背景填充
 */
export async function resolveSlideBackgroundFill(
  context: ParsingContext
): Promise<FillStyle> {
  // 1. 首先检查幻灯片本身的背景
  let bgPr = getTextByPathList(
    context.slideContent,
    ['p:sld', 'p:cSld', 'p:bg', 'p:bgPr']
  ) as XmlObject | undefined

  if (bgPr) {
    const fill = await resolveFill(bgPr, context, 'slide')
    if (fill.type !== 'none') return fill
  }

  // 2. 检查布局背景
  bgPr = getTextByPathList(
    context.slideLayoutContent,
    ['p:sldLayout', 'p:cSld', 'p:bg', 'p:bgPr']
  ) as XmlObject | undefined

  if (bgPr) {
    const fill = await resolveFill(bgPr, context, 'slideLayout')
    if (fill.type !== 'none') return fill
  }

  // 3. 检查母版背景
  bgPr = getTextByPathList(
    context.slideMasterContent,
    ['p:sldMaster', 'p:cSld', 'p:bg', 'p:bgPr']
  ) as XmlObject | undefined

  if (bgPr) {
    const fill = await resolveFill(bgPr, context, 'slideMaster')
    if (fill.type !== 'none') return fill
  }

  // 4. 默认白色背景
  return { type: 'solid', color: '#FFFFFF' }
}

/**
 * 将填充样式转换为 PPTist 格式
 */
export function fillToPPTist(fill: FillStyle): string | Record<string, unknown> {
  switch (fill.type) {
    case 'solid':
      return fill.color

    case 'gradient':
      return {
        type: 'gradient',
        gradientType: fill.gradientType,
        angle: fill.angle,
        colors: fill.colors,
      }

    case 'image':
      return fill.src

    case 'pattern':
      return {
        type: 'pattern',
        pattern: fill.pattern,
        foregroundColor: fill.foregroundColor,
        backgroundColor: fill.backgroundColor,
      }

    case 'none':
    default:
      return 'transparent'
  }
}
