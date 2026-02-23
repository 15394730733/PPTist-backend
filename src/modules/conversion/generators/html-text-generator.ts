/**
 * HTML 文本生成器
 * 参考 pptxtojson 的 text.js 和 fontStyle.js 实现
 * 生成 PPTist 兼容的 HTML 文本
 */

import type { XmlObject, ParsingContext } from '../context/parsing-context.js'
import { resolveSolidFill, getTextByPathList } from '../resolvers/color-resolver.js'
import type { PPTXTextRun, PPTXParagraph } from '../types/pptx.js'

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}

/**
 * 获取字体样式
 */
function getFontStyle(rPr: XmlObject | undefined, context: ParsingContext): Record<string, string | number | undefined> {
  if (!rPr) return {}

  const style: Record<string, string | number | undefined> = {}

  // 字体大小（PPT 中单位是百分之一点，需要转换为像素）
  const sz = getTextByPathList(rPr, ['attrs', 'sz']) as string
  if (sz) {
    const sizePt = parseInt(sz, 10) / 100
    style['font-size'] = `${sizePt}px`
  }

  // 字体名称
  const latin = getTextByPathList(rPr, ['attrs', 'latin']) as string
  const ea = getTextByPathList(rPr, ['attrs', 'ea']) as string
  if (latin || ea) {
    style['font-family'] = latin || ea
  }

  // 粗体
  const bold = getTextByPathList(rPr, ['attrs', 'b']) as string
  if (bold === '1') {
    style['font-weight'] = 'bold'
  }

  // 斜体
  const italic = getTextByPathList(rPr, ['attrs', 'i']) as string
  if (italic === '1') {
    style['font-style'] = 'italic'
  }

  // 下划线
  const underline = getTextByPathList(rPr, ['attrs', 'u']) as string
  if (underline === 'sng' || underline === '1') {
    style['text-decoration'] = style['text-decoration'] ? `${style['text-decoration']} underline` : 'underline'
  }

  // 删除线
  const strike = getTextByPathList(rPr, ['attrs', 'strike']) as string
  if (strike === 'sngStrike' || strike === '1') {
    style['text-decoration'] = style['text-decoration'] ? `${style['text-decoration']} line-through` : 'line-through'
  }

  // 颜色
  const solidFill = rPr['a:solidFill']
  if (solidFill) {
    const color = resolveSolidFill(solidFill, context)
    if (color) {
      style['color'] = color
    }
  }

  // 高亮（背景色）
  const highlight = rPr['a:highlight']
  if (highlight) {
    const bgColor = resolveSolidFill(highlight, context)
    if (bgColor) {
      style['background-color'] = bgColor
    }
  }

  // 字符间距
  const spc = getTextByPathList(rPr, ['attrs', 'spc']) as string
  if (spc) {
    const spacing = parseInt(spc, 10) / 100
    style['letter-spacing'] = `${spacing}px`
  }

  // 大小写
  const cap = getTextByPathList(rPr, ['attrs', 'cap']) as string
  if (cap === 'all') {
    style['text-transform'] = 'uppercase'
  } else if (cap === 'small') {
    style['text-transform'] = 'lowercase'
    style['font-size'] = 'smaller'
  }

  return style
}

/**
 * 将样式对象转换为 CSS 字符串
 */
function styleToCss(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
}

/**
 * 解析文本运行（run）
 */
function parseTextRun(run: XmlObject, context: ParsingContext): string {
  const rPr = run['a:rPr']
  const text = run['a:t'] || ''

  if (!text) return ''

  const style = getFontStyle(rPr, context)
  const escapedText = escapeHtml(String(text))

  if (Object.keys(style).length === 0) {
    return escapedText
  }

  return `<span style="${styleToCss(style)}">${escapedText}</span>`
}

/**
 * 解析段落属性
 */
function parseParagraphProperties(pPr: XmlObject | undefined, _context: ParsingContext): Record<string, string | number | undefined> {
  if (!pPr) return {}

  const style: Record<string, string | number | undefined> = {}

  // 对齐方式
  const algn = getTextByPathList(pPr, ['attrs', 'algn']) as string
  switch (algn) {
    case 'l':
      style['text-align'] = 'left'
      break
    case 'r':
      style['text-align'] = 'right'
      break
    case 'ctr':
      style['text-align'] = 'center'
      break
    case 'just':
      style['text-align'] = 'justify'
      break
    case 'dist':
      style['text-align'] = 'justify'
      break
  }

  // 行距
  const lnSpc = pPr['a:lnSpc']
  if (lnSpc) {
    const spcPct = getTextByPathList(lnSpc, ['a:spcPct', 'attrs', 'val']) as string
    if (spcPct) {
      const percent = parseInt(spcPct, 10) / 1000
      style['line-height'] = `${percent}%`
    }
    const spcPts = getTextByPathList(lnSpc, ['a:spcPts', 'attrs', 'val']) as string
    if (spcPts) {
      const pts = parseInt(spcPts, 10) / 100
      style['line-height'] = `${pts}pt`
    }
  }

  // 段前间距
  const spcBef = pPr['a:spcBef']
  if (spcBef) {
    const pts = getTextByPathList(spcBef, ['a:spcPts', 'attrs', 'val']) as string
    if (pts) {
      style['margin-top'] = `${parseInt(pts, 10) / 100}px`
    }
  }

  // 段后间距
  const spcAft = pPr['a:spcAft']
  if (spcAft) {
    const pts = getTextByPathList(spcAft, ['a:spcPts', 'attrs', 'val']) as string
    if (pts) {
      style['margin-bottom'] = `${parseInt(pts, 10) / 100}px`
    }
  }

  // 缩进
  const indent = pPr['a:indent']
  if (indent) {
    const left = getTextByPathList(indent, ['attrs', 'left']) as string
    if (left) {
      // EMU 转像素（约）
      const px = parseInt(left, 10) / 12700
      style['margin-left'] = `${px}px`
    }
    const firstLine = getTextByPathList(indent, ['attrs', 'hanging']) as string
    if (firstLine) {
      const px = parseInt(firstLine, 10) / 12700
      style['text-indent'] = `-${px}px`
    }
  }

  return style
}

/**
 * 解析项目符号
 */
function parseBullet(pPr: XmlObject | undefined): { type: string; style: string } | null {
  if (!pPr) return null

  // 检查是否有项目符号
  const buFont = pPr['a:buFont']
  const buChar = pPr['a:buChar']
  const buAutoNum = pPr['a:buAutoNum']
  const buBlip = pPr['a:buBlip']

  if (!buFont && !buChar && !buAutoNum && !buBlip) {
    // 检查是否明确禁用项目符号
    const noBullet = getTextByPathList(pPr, ['attrs', 'noBullet']) as string
    if (noBullet === '1') {
      return null
    }
  }

  // 自动编号
  if (buAutoNum) {
    const type = getTextByPathList(buAutoNum, ['attrs', 'type']) as string
    let listStyle = 'decimal'

    switch (type) {
      case 'arabicPeriod':
      case 'arabicPlain':
        listStyle = 'decimal'
        break
      case 'romanUcPeriod':
      case 'romanUcPlain':
        listStyle = 'upper-roman'
        break
      case 'romanLcPeriod':
      case 'romanLcPlain':
        listStyle = 'lower-roman'
        break
      case 'alphaUcPeriod':
      case 'alphaUcPlain':
        listStyle = 'upper-alpha'
        break
      case 'alphaLcPeriod':
      case 'alphaLcPlain':
        listStyle = 'lower-alpha'
        break
      case 'eastAsiaChsPlain':
        listStyle = 'cjk-ideographic'
        break
    }

    return { type: 'ordered', style: listStyle }
  }

  // 字符项目符号
  if (buChar) {
    const char = getTextByPathList(buChar, ['attrs', 'char']) as string
    return { type: 'unordered', style: char || 'disc' }
  }

  // 图片项目符号
  if (buBlip) {
    return { type: 'unordered', style: 'disc' }
  }

  // 默认项目符号
  if (buFont) {
    return { type: 'unordered', style: 'disc' }
  }

  return null
}

/**
 * 解析文本体（txBody）
 */
export function parseTextBody(
  txBody: XmlObject | undefined,
  context: ParsingContext
): PPTXParagraph[] {
  if (!txBody) return []

  const pArray = txBody['a:p'] || []
  const paragraphs = Array.isArray(pArray) ? pArray : [pArray]

  return paragraphs.map((p: XmlObject) => {
    const runs: PPTXTextRun[] = []

    // 解析所有文本运行
    const rArray = p?.['a:r'] || []
    const runArray = Array.isArray(rArray) ? rArray : [rArray]

    for (const run of runArray) {
      const r = run as XmlObject
      const rPr = r?.['a:rPr']
      const text = r?.['a:t'] || ''

      const solidFill = rPr?.['a:solidFill']
      const color = solidFill ? resolveSolidFill(solidFill, context) : undefined

      runs.push({
        text: String(text),
        bold: rPr?.['attrs']?.['b'] === '1',
        italic: rPr?.['attrs']?.['i'] === '1',
        underline: rPr?.['attrs']?.['u'] === 'sng' || rPr?.['attrs']?.['u'] === '1',
        strike: rPr?.['attrs']?.['strike'] === 'sngStrike',
        fontSize: rPr?.['attrs']?.['sz'] ? parseInt(rPr['attrs']['sz'] as string, 10) / 100 : undefined,
        fontName: rPr?.['attrs']?.['latin'] as string | undefined,
        color,
      })
    }

    // 解析段落属性
    const pPr = p?.['a:pPr']
    const algn = pPr?.['attrs']?.['algn'] as string
    let align: 'left' | 'center' | 'right' | 'justify' | undefined
    switch (algn) {
      case 'l':
        align = 'left'
        break
      case 'r':
        align = 'right'
        break
      case 'ctr':
        align = 'center'
        break
      case 'just':
      case 'dist':
        align = 'justify'
        break
    }

    // 检查是否有项目符号
    const bullet = !!(pPr?.['a:buFont'] || pPr?.['a:buChar'] || pPr?.['a:buAutoNum'])
    const level = pPr?.['attrs']?.['lvl'] ? parseInt(pPr['attrs']['lvl'] as string, 10) : undefined

    return {
      runs,
      align,
      bullet,
      level,
    }
  })
}

/**
 * 生成 HTML 文本
 */
export function generateHtmlText(
  txBody: XmlObject | undefined,
  context: ParsingContext
): string {
  if (!txBody) return ''

  const pArray = txBody['a:p'] || []
  const paragraphs = Array.isArray(pArray) ? pArray : [pArray]

  const htmlParts: string[] = []
  let inList = false
  let listType = 'ul'

  for (const p of paragraphs) {
    const pPr = p?.['a:pPr']
    const bullet = parseBullet(pPr)

    // 解析段落样式
    const pStyle = parseParagraphProperties(pPr, context)
    const pStyleStr = Object.keys(pStyle).length > 0 ? ` style="${styleToCss(pStyle)}"` : ''

    // 解析文本内容
    const rArray = p?.['a:r'] || []
    const runArray = Array.isArray(rArray) ? rArray : [rArray]
    let textContent = ''
    for (const run of runArray) {
      textContent += parseTextRun(run as XmlObject, context)
    }

    // 如果没有文本内容，添加一个空格
    if (!textContent) {
      textContent = '&nbsp;'
    }

    // 处理列表
    if (bullet) {
      if (!inList) {
        inList = true
        listType = bullet.type === 'ordered' ? 'ol' : 'ul'
        htmlParts.push(`<${listType} style="list-style-type: ${bullet.style}; margin: 0; padding-left: 20px;">`)
      }
      htmlParts.push(`<li${pStyleStr}>${textContent}</li>`)
    } else {
      if (inList) {
        htmlParts.push(`</${listType}>`)
        inList = false
      }
      htmlParts.push(`<p${pStyleStr}>${textContent}</p>`)
    }
  }

  // 关闭未结束的列表
  if (inList) {
    htmlParts.push(`</${listType}>`)
  }

  return htmlParts.join('\n')
}

/**
 * 从 PPTX 段落数据生成 HTML
 */
export function paragraphsToHtml(paragraphs: PPTXParagraph[]): string {
  const htmlParts: string[] = []

  for (const para of paragraphs) {
    let style = ''
    if (para.align) {
      style = ` style="text-align: ${para.align}"`
    }

    let content = ''
    for (const run of para.runs) {
      const styles: string[] = []

      if (run.bold) styles.push('font-weight: bold')
      if (run.italic) styles.push('font-style: italic')
      if (run.underline) styles.push('text-decoration: underline')
      if (run.color) styles.push(`color: ${run.color}`)
      if (run.fontSize) styles.push(`font-size: ${run.fontSize}px`)
      if (run.fontName) styles.push(`font-family: ${run.fontName}`)

      const styleStr = styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
      const text = escapeHtml(run.text)

      if (styleStr) {
        content += `<span${styleStr}>${text}</span>`
      } else {
        content += text
      }
    }

    if (!content) content = '&nbsp;'

    if (para.bullet) {
      htmlParts.push(`<li>${content}</li>`)
    } else {
      htmlParts.push(`<p${style}>${content}</p>`)
    }
  }

  return htmlParts.join('\n')
}
