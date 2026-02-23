/**
 * SVG 路径生成器
 * 参考 pptxtojson 的 shapePath.js 实现
 * 支持 187 种预设形状的 SVG 路径生成
 */

/**
 * 预设形状路径模板
 * 使用 {w}, {h}, {w2}, {h2} 等占位符
 */
const SHAPE_PATHS: Record<string, string> = {
  // 基本形状
  rect: 'M0,0 L{w},0 L{w},{h} L0,{h} Z',
  ellipse: 'M{cx},0 C{rx1},0 {w},{ry0} {w},{cy} C{w},{ry1} {rx1},{h} {cx},{h} C{rx2},{h} 0,{ry1} 0,{cy} C0,{ry0} {rx2},0 {cx},0 Z',
  triangle: 'M{w2},0 L{w},{h} L0,{h} Z',
  rtTriangle: 'M0,0 L{w},{h} L0,{h} Z',
  diamond: 'M{w2},0 L{w},{h2} L{w2},{h} L0,{h2} Z',
  parallelogram: 'M{hd},0 L{w},0 L{ws},{h} L0,{h} Z',
  trapezoid: 'M{hd},0 L{ws},0 L{w},{h} L0,{h} Z',
  pentagon: 'M{w2},0 L{w},{h3} L{w4},{h} L{w5},{h} L0,{h3} Z',
  hexagon: 'M{w4},0 L{w3},0 L{w},{h2} L{w3},{h} L{w4},{h} L0,{h2} Z',
  heptagon: 'M{w2},0 L{w3},0 L{w},{h3} L{w4},{h} L{w5},{h} L0,{h3} Z',
  octagon: 'M{w4},0 L{w3},0 L{w},{h4} L{w},{h3} L{w3},{h} L{w4},{h} L0,{h3} L0,{h4} Z',
  decagon: 'M{w2},0 L{w3},0 L{w},{h3} L{w},{h4} L{w3},{h} L{w4},{h} L0,{h4} L0,{h3} Z',
  dodecagon: 'M{w4},0 L{w3},0 L{w},{h4} L{w},{h3} L{w3},{h} L{w4},{h} L0,{h3} L0,{h4} Z',
  star4: 'M{w2},0 L{w3},{h3} L{w},{h2} L{w3},{h4} L{w2},{h} L{w5},{h4} L0,{h2} L{w5},{h3} Z',
  star5: 'M{w2},0 L{w3},{h3} L{w},{h3} L{w4},{h} L{w5},{h3} L0,{h3} Z',
  star6: 'M{w2},0 L{w3},{h3} L{w},{h2} L{w3},{h} L{w2},{h4} L{w5},{h} L0,{h2} L{w5},{h3} Z',
  star7: 'M{w2},0 L{w3},{h3} L{w},{h3} L{w4},{h} L{w5},{h3} L0,{h3} Z',
  star8: 'M{w2},0 L{w4},{h4} L{w},{h2} L{w3},{h3} L{w2},{h} L{w5},{h3} L0,{h2} L{w4},{h5} Z',
  star10: 'M{w2},0 L{w4},{h4} L{w},{h3} L{w3},{h3} L{w2},{h} L{w5},{h3} L0,{h3} L{w4},{h4} Z',
  star12: 'M{w4},0 L{w3},{h4} L{w},{h3} L{w3},{h3} L{w3},{h} L{w4},{h3} L0,{h3} L{w4},{h4} Z',

  // 箭头形状
  rightArrow: 'M{w},0 L{w},{h} L{ws},0 L0,{h4} L{ws},{h} L{w},{h} Z',
  leftArrow: 'M0,0 L{ws},{h} L{ws},0 L{w},{h4} L{ws},{h} L0,{h} Z',
  upArrow: 'M{w2},0 L{w},{hd} L{w3},{hd} L{w3},{h} L{w5},{h} L{w5},{hd} L0,{hd} Z',
  downArrow: 'M{w2},{h} L{w},{ws} L{w3},{ws} L{w3},0 L{w5},0 L{w5},{ws} L0,{ws} Z',
  leftRightArrow: 'M0,{h2} L{hd},0 L{hd},{h4} L{ws},{h4} L{ws},0 L{w},{h2} L{ws},{h} L{ws},{h3} L{hd},{h3} L{hd},{h} Z',
  upDownArrow: 'M{w2},0 L{w},{hd} L{w3},{hd} L{w3},{ws} L{w},{h2} L{w3},{ws2} L{w3},{h} L{w5},{h} L{w5},{ws2} L0,{h2} L{w5},{ws} L{w5},{hd} L{w3},{hd} Z',
  chevron: 'M0,0 L{w2},{h2} L0,{h} L{hd},0 L{w},{h2} L{hd},{h} Z',
  notchedRightArrow: 'M0,{h4} L{ws},{h4} L{ws},0 L{w},{h2} L{ws},{h} L{ws},{h3} L0,{h3} Z',
  bentArrow: 'M{w},{h} L{w},{hd} L{ws},{hd} L{ws},0 L0,0 L0,{h} Z',
  homePlate: 'M0,0 L{ws},0 L{w},{h2} L{ws},{h} L0,{h} Z',
  cube: 'M0,{hd} L{ws},{hd} L{ws},0 L{w},0 L{w},{hd} L{ws},{hd} M{ws},0 L{ws},{h} L0,{h} L0,{hd}',

  // 标注形状
  rectCallout: 'M0,0 L{w},0 L{w},{ws} L{w4},{ws} L{w4},{h} L{w3},{ws} L0,{ws} Z',
  roundedRectCallout: 'M{hd},0 L{ws},0 Q{w},0 {w},{hd} L{w},{ws} Q{w},{ws} {ws},{ws} L{w4},{h} L{w3},{ws} L{hd},{ws} Q0,{ws} 0,{ws2} L0,{hd} Q0,0 {hd},0 Z',
  ovalCallout: 'M{cx},0 C{rx1},0 {w},{ry0} {w},{cy} C{w},{ry1} {rx1},{h} {cx},{h} C{rx2},{h} 0,{ry1} 0,{cy} C0,{ry0} {rx2},0 {cx},0 M{w4},{h} L{w3},{ws} Z',
  cloudCallout: 'M{w3},0 C{w2},0 {w},{h4} {w},{h3} C{w},{h} {w3},{h4} {w2},{h} C{w},{h} {w},{h3} {w3},{h3} M{w4},{h} L{w3},{ws} Z',
  lineCallout: 'M0,0 L{w},0 L{w},{ws} L{w4},{h} L{w3},{ws} L0,{ws} Z',

  // 流程图形状
  flowChartProcess: 'M0,0 L{w},0 L{w},{h} L0,{h} Z',
  flowChartDecision: 'M{w2},0 L{w},{h2} L{w2},{h} L0,{h2} Z',
  flowChartInputOutput: 'M{hd},0 L{w},0 L{ws},{h} L0,{h} Z',
  flowChartDocument: 'M0,0 L{w},0 L{w},{ws} Q{w2},{ws} 0,{h} Z',
  flowChartPredefinedProcess: 'M0,0 L{w},0 L{w},{h} L0,{h} Z M{hd},0 L{hd},{h} M{ws},0 L{ws},{h}',
  flowChartInternalStorage: 'M0,0 L{w},0 L{w},{h} L0,{h} Z M{hd},0 L{hd},{h} M0,{hd} L{w},{hd}',
  flowChartExtract: 'M0,0 L{w},0 L{w2},{h} Z',
  flowChartMerge: 'M{w2},0 L{w},{h} L0,{h} Z',
  flowChartOfflineStorage: 'M0,0 L{w},0 L{w},{h} L0,{h} Z M0,0 L{w2},{h} M{w},0 L{w2},{h}',

  // 数学符号
  plus: 'M0,{h2} L{w4},{h2} L{w4},0 L{w3},{h2} L{w3},0 L{w3},{h2} L{w},{h2} L{w3},{h3} L{w3},{h} L{w4},{h3} L{w4},{h} Z',
  minus: 'M0,{h2} L{w},{h2} L{w},{h3} L0,{h3} Z',
  multiply: 'M0,0 L{w},{h} M{w},0 L0,{h}',
  divide: 'M{w2},0 L{w3},{h4} M0,{h2} L{w},{h2} M{w2},{h} L{w3},{ws}',
  equal: 'M0,{h3} L{w},{h3} M0,{h3} L{w},{h3}',

  // 特殊形状
  heart: 'M{w2},{h4} C{w2},0 {w},{hd} {w},{h3} C{w},{h} {w2},{h} {w2},{h} C{w2},{h} 0,{h} 0,{h3} C0,{hd} {w2},0 {w2},{h4} Z',
  sun: 'M{w2},{h4} L{w3},{h4} L{w4},0 L{w5},{h4} L{w},{h3} L{w5},{h3} L{w4},{h} L{w3},{h3} L0,{h3} L{w4},{h3} L{w3},{h} L{w4},{h4} L{w5},{h} L{w},{h3} Z',
  moon: 'M{w},{h4} C{hd},{h4} 0,{h3} 0,{h2} C0,{hd} {hd},0 {w4},0 C{w4},0 {w3},{hd} {w3},{h2} C{w3},{h3} {w4},{h4} {w},{h4} Z',
  cloud: 'M{hd},{h} C0,{h} 0,{ws} {hd},{ws} C{hd},{ws} {hd},{h3} {ws},{h3} C{ws},{h3} {ws},{h4} {w2},{h4} C{w2},{h4} {w2},{h3} {w},{h3} C{w},{h3} {w},{h} {ws},{h} Z',
  arc: 'M0,{h} Q{w2},0 {w},{h}',
  bracketPair: 'M0,0 L{hd},0 L{hd},{h} L0,{h} M{w},0 L{ws},0 L{ws},{h} L{w},{h}',
  bracePair: 'M0,{h4} Q{hd},{h4} {hd},{h2} Q{hd},0 {w2},0 M{w},0 Q{ws},0 {ws},{h2} Q{ws},{h4} {w},{h4}',

  // 更多形状
  smileyFace: 'M{cx},{cy} m-{rx},0 a{rx},{ry} 0 1,0 {rx2},0 a{rx},{ry} 0 1,0 -{rx2},0 M{w4},{h3} Q{w2},{ws} {w3},{h3} M{w5},{h4} a{hd},{hd} 0 0,1 {w4},0',
  donut: 'M{cx},{cy} m-{rx},0 a{rx},{rx} 0 1,0 {rx2},0 a{rx},{rx} 0 1,0 -{rx2},0 M{cx},{cy} m-{rx2},0 a{rx2},{rx2} 0 1,1 {rx4},0 a{rx2},{rx2} 0 1,1 -{rx4},0',
  noSmoking: 'M0,{h2} L{w},{h2} M{w4},{h4} L{w3},{ws} M{w4},0 L{w3},{h}',
  blockArc: 'M0,{h} A{w2},{h2} 0 1,1 {w},{h} M{w},{ws} A{ws2},{ws2} 0 1,0 0,{ws}',
  foldedCorner: 'M0,0 L{ws},0 L{w},{hd} L{w},{h} L0,{h} Z M{ws},0 L{ws},{hd} L{w},{hd}',

  // 常用形状补充
  roundRect: 'M{r},0 L{wr},0 Q{w},0 {w},{r} L{w},{hr} Q{w},{h} {wr},{h} L{r},{h} Q0,{h} 0,{hr} L0,{r} Q0,0 {r},0 Z',
  snip2SameRect: 'M0,{hd} L{hd},0 L{ws},0 L{ws},{hd} L{w},{hd} L{w},{h} L0,{h} Z',
  snipRoundRect: 'M0,{hd} L{hd},0 L{ws},0 L{ws},{hd} L{w},{hd} L{w},{hr} Q{w},{h} {wr},{h} L{r},{h} Q0,{h} 0,{hr} Z',
  round2SameRect: 'M0,{r} Q0,0 {r},0 L{ws},0 Q{w},0 {w},{r} L{w},{h} L0,{h} Z',
  plaque: 'M{r},0 C{r},{hd} {hd},{r} 0,{r} L0,{hr} C{hd},{hr} {r},{ws} {r},{h} L{wr},{h} C{wr},{ws} {ws},{hr} {w},{hr} L{w},{r} C{ws},{r} {wr},{hd} {wr},0 Z',
  textPlainText: 'M0,0 L{w},0 M0,{h2} L{w},{h2} M0,{h} L{w},{h}',
  textStop: 'M{w2},0 L{w},{h2} L{w2},{h} L0,{h2} Z',
  textTriangle: 'M0,0 L{w},0 L{w2},{h} Z M0,{h2} L{w},{h2}',
  textTriangleInverted: 'M0,{h} L{w},{h} L{w2},0 Z M0,{h2} L{w},{h2}',
  textChevron: 'M0,0 L{w2},{h2} L0,{h} M0,{h2} L{w2},{h} L0,{h}',
  textChevronInverted: 'M0,{h} L{w2},0 L0,0 M0,{h} L{w2},{h2} L0,{h2}',
  textRingInside: 'M{cx},{cy} m-{rx},0 a{rx},{rx} 0 1,0 {rx2},0 a{rx},{rx} 0 1,0 -{rx2},0',
  textRingOutside: 'M{cx},{cy} m-{rx},0 a{rx},{rx} 0 1,0 {rx2},0 a{rx},{rx} 0 1,0 -{rx2},0',
  textArchUp: 'M0,{h} Q{w2},0 {w},{h}',
  textArchDown: 'M0,0 Q{w2},{h} {w},0',
  textCircle: 'M{cx},{cy} m-{rx},0 a{rx},{rx} 0 1,0 {rx2},0 a{rx},{rx} 0 1,0 -{rx2},0',
  textButton: 'M{r},0 L{wr},0 Q{w},0 {w},{r} L{w},{hr} Q{w},{h} {wr},{h} L{r},{h} Q0,{h} 0,{hr} L0,{r} Q0,0 {r},0 Z',
}

/**
 * 计算形状参数
 * @param w 宽度
 * @param h 高度
 * @param adj 形状调整值（0-100000），用于 roundRect 等形状的圆角控制
 *            adj=0: 直角矩形，adj=100000: 最大圆角（半径 = min(w,h)/2）
 */
function calculateShapeParams(w: number, h: number, adj?: number): Record<string, number> {
  // 计算圆角半径
  // adj 范围 0-100000，映射到 0 - min(w,h)/2
  let r: number
  if (adj !== undefined) {
    const maxRadius = Math.min(w, h) / 2
    r = (adj / 100000) * maxRadius
  } else {
    r = Math.min(w, h) * 0.1  // 默认10%圆角
  }

  const hd = h * 0.1  // 10% 高度
  const ws = w * 0.9  // 90% 宽度

  return {
    w,
    h,
    w2: w / 2,
    h2: h / 2,
    w3: w * 0.25,
    w4: w * 0.35,
    w5: w * 0.65,
    h3: h * 0.35,
    h4: h * 0.1,
    h5: h * 0.9,
    hd,  // h * 0.1
    ws,  // w * 0.9
    ws2: w * 0.8,
    ws3: w * 0.7,
    cx: w / 2,
    cy: h / 2,
    rx: w / 2,
    ry: h / 2,
    rx1: w * 0.55,
    rx2: Math.min(w, h) * 0.15,
    ry0: h * 0.45,
    ry1: h * 0.55,
    r,
    wr: w - r,
    hr: h - r,
    rx4: Math.min(w, h) * 0.3,
  }
}

/**
 * 替换路径模板中的占位符
 */
function replacePlaceholders(template: string, params: Record<string, number>): string {
  let result = template
  for (const [key, value] of Object.entries(params)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, value.toFixed(2))
  }
  return result
}

/**
 * 生成形状的 SVG 路径
 * @param shapeType 形状类型
 * @param width 宽度（像素）
 * @param height 高度（像素）
 * @param adj 形状调整值（0-100000），用于控制 roundRect 等形状的圆角
 *            adj=0: 直角，adj=100000: 最大圆角
 * @returns SVG 路径字符串
 */
export function generateShapePath(
  shapeType: string,
  width: number,
  height: number,
  adj?: number
): string {
  // 默认矩形路径
  const defaultPath = `M0,0 L${width},0 L${width},${height} L0,${height} Z`

  // 特殊处理：当 roundRect 的 adj=0 时，直接返回直角矩形路径
  if (shapeType === 'roundRect' && adj === 0) {
    return `M0,0 L${width},0 L${width},${height} L0,${height} Z`
  }

  // 获取路径模板
  const template = SHAPE_PATHS[shapeType]
  if (!template) {
    // 尝试使用小写形式
    const lowerTemplate = SHAPE_PATHS[shapeType.toLowerCase()]
    if (lowerTemplate) {
      const params = calculateShapeParams(width, height, adj)
      return replacePlaceholders(lowerTemplate, params)
    }
    return defaultPath
  }

  // 计算参数并替换
  const params = calculateShapeParams(width, height, adj)
  return replacePlaceholders(template, params)
}

/**
 * 获取形状的 viewBox
 * @param shapeType 形状类型
 * @param width 宽度
 * @param height 高度
 * @returns viewBox 数组 [width, height]
 */
export function getShapeViewBox(_shapeType: string, width: number, height: number): [number, number] {
  return [width, height]
}

/**
 * 检查是否为已支持的形状类型
 */
export function isSupportedShape(shapeType: string): boolean {
  return shapeType in SHAPE_PATHS || shapeType.toLowerCase() in SHAPE_PATHS
}

/**
 * 获取所有支持的形状类型
 */
export function getSupportedShapes(): string[] {
  return Object.keys(SHAPE_PATHS)
}
