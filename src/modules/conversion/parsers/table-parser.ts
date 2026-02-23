/**
 * 表格解析器
 * 参考 pptxtojson 的 table.js 实现
 * 支持完整表格解析，包括合并单元格、样式继承
 */

import type { XmlObject, ParsingContext } from '../context/parsing-context.js'
import { resolveSolidFill, getTextByPathList } from '../resolvers/color-resolver.js'
import { resolveFill } from '../resolvers/fill-resolver.js'
import type { PPTXElement, PPTXTransform, PPTXTableCell } from '../types/pptx.js'

/**
 * 表格边框
 */
export interface TableBorder {
  color?: string
  width?: number
  type?: 'solid' | 'dashed' | 'dotted'
}

/**
 * 表格边框集合
 */
export interface TableBorders {
  top?: TableBorder
  bottom?: TableBorder
  left?: TableBorder
  right?: TableBorder
}

/**
 * 表格样式属性对象
 */
interface TableStyleAttrs {
  isFrstRowAttr: number
  isFrstColAttr: number
  isLstRowAttr: number
  isLstColAttr: number
  isBandRowAttr: number
  isBandColAttr: number
}

/**
 * 单元格解析结果
 */
interface CellParams {
  fillColor?: string
  fontColor?: string
  fontBold?: boolean
  borders?: TableBorders
  rowSpan?: number
  colSpan?: number
  vMerge?: number
  hMerge?: number
}

// EMU 到点的转换比例
const RATIO_EMUs_Points = 1 / 12700

/**
 * 获取边框样式
 */
function getBorderFromLn(lnNode: XmlObject | undefined): TableBorder | undefined {
  if (!lnNode) return undefined

  const attrs = lnNode['attrs'] || {}
  const width = attrs['w'] ? parseInt(attrs['w'], 10) * RATIO_EMUs_Points : undefined

  // 解析边框颜色
  let color: string | undefined
  const solidFill = lnNode['a:solidFill']
  if (solidFill) {
    color = resolveSolidFill(solidFill, {} as ParsingContext) // 简化处理
  }

  // 解析边框类型
  let type: 'solid' | 'dashed' | 'dotted' | undefined
  const prstDash = lnNode['a:prstDash']?.['attrs']?.['val']
  if (prstDash) {
    switch (prstDash) {
      case 'dash':
      case 'dashDot':
      case 'lgDash':
      case 'lgDashDot':
      case 'lgDashDotDot':
      case 'sysDash':
      case 'sysDashDot':
      case 'sysDashDotDot':
        type = 'dashed'
        break
      case 'dot':
      case 'sysDot':
        type = 'dotted'
        break
      default:
        type = 'solid'
    }
  }

  return { color, width, type }
}

/**
 * 获取表格行参数（条件格式）
 */
function getTableRowParams(
  trNodes: XmlObject[],
  rowIndex: number,
  tblStylAttrObj: TableStyleAttrs,
  thisTblStyle: XmlObject | undefined,
  context: ParsingContext
): { fillColor?: string; fontColor?: string; fontBold?: boolean } {
  let fillColor: string | undefined
  let fontColor: string | undefined
  let fontBold: boolean | undefined

  // 整表样式
  if (thisTblStyle?.['a:wholeTbl']) {
    const bgFillschemeClr = getTextByPathList(
      thisTblStyle,
      ['a:wholeTbl', 'a:tcStyle', 'a:fill', 'a:solidFill']
    ) as XmlObject | undefined
    if (bgFillschemeClr) {
      fillColor = resolveSolidFill(bgFillschemeClr, context)
    }

    const rowTxtStyl = getTextByPathList(thisTblStyle, ['a:wholeTbl', 'a:tcTxStyle']) as XmlObject | undefined
    if (rowTxtStyl) {
      fontColor = resolveSolidFill(rowTxtStyl, context)
      if (getTextByPathList(rowTxtStyl, ['attrs', 'b']) === 'on') {
        fontBold = true
      }
    }
  }

  // 首行样式
  if (rowIndex === 0 && tblStylAttrObj.isFrstRowAttr === 1 && thisTblStyle) {
    const bgFillschemeClr = getTextByPathList(
      thisTblStyle,
      ['a:firstRow', 'a:tcStyle', 'a:fill', 'a:solidFill']
    ) as XmlObject | undefined
    if (bgFillschemeClr) {
      fillColor = resolveSolidFill(bgFillschemeClr, context)
    }

    const rowTxtStyl = getTextByPathList(thisTblStyle, ['a:firstRow', 'a:tcTxStyle']) as XmlObject | undefined
    if (rowTxtStyl) {
      fontColor = resolveSolidFill(rowTxtStyl, context)
      if (getTextByPathList(rowTxtStyl, ['attrs', 'b']) === 'on') {
        fontBold = true
      }
    }
  }

  // 交替行样式
  if (rowIndex > 0 && tblStylAttrObj.isBandRowAttr === 1 && thisTblStyle) {
    if (rowIndex % 2 === 0 && thisTblStyle['a:band2H']) {
      const bgFillschemeClr = getTextByPathList(
        thisTblStyle,
        ['a:band2H', 'a:tcStyle', 'a:fill', 'a:solidFill']
      ) as XmlObject | undefined
      if (bgFillschemeClr) {
        fillColor = resolveSolidFill(bgFillschemeClr, context)
      }
    } else if (rowIndex % 2 !== 0 && thisTblStyle['a:band1H']) {
      const bgFillschemeClr = getTextByPathList(
        thisTblStyle,
        ['a:band1H', 'a:tcStyle', 'a:fill', 'a:solidFill']
      ) as XmlObject | undefined
      if (bgFillschemeClr) {
        fillColor = resolveSolidFill(bgFillschemeClr, context)
      }
    }
  }

  // 末行样式
  if (rowIndex === trNodes.length - 1 && tblStylAttrObj.isLstRowAttr === 1 && thisTblStyle) {
    const bgFillschemeClr = getTextByPathList(
      thisTblStyle,
      ['a:lastRow', 'a:tcStyle', 'a:fill', 'a:solidFill']
    ) as XmlObject | undefined
    if (bgFillschemeClr) {
      fillColor = resolveSolidFill(bgFillschemeClr, context)
    }

    const rowTxtStyl = getTextByPathList(thisTblStyle, ['a:lastRow', 'a:tcTxStyle']) as XmlObject | undefined
    if (rowTxtStyl) {
      fontColor = resolveSolidFill(rowTxtStyl, context)
      if (getTextByPathList(rowTxtStyl, ['attrs', 'b']) === 'on') {
        fontBold = true
      }
    }
  }

  return { fillColor, fontColor, fontBold }
}

/**
 * 获取单元格参数
 */
async function getTableCellParams(
  tcNode: XmlObject,
  thisTblStyle: XmlObject | undefined,
  cellSource: string | undefined,
  context: ParsingContext
): Promise<CellParams> {
  const rowSpan = getTextByPathList(tcNode, ['attrs', 'rowSpan']) as string
  const colSpan = getTextByPathList(tcNode, ['attrs', 'gridSpan']) as string
  const vMerge = getTextByPathList(tcNode, ['attrs', 'vMerge']) as string
  const hMerge = getTextByPathList(tcNode, ['attrs', 'hMerge']) as string

  let fillColor: string | undefined
  let fontColor: string | undefined
  let fontBold: boolean | undefined

  // 从单元格属性获取填充
  const tcPr = getTextByPathList(tcNode, ['a:tcPr']) as XmlObject | undefined
  if (tcPr) {
    const fill = await resolveFill(tcPr, context, 'slide')
    if (fill.type === 'solid' && fill.color) {
      fillColor = fill.color
    }
  }

  // 从表格样式获取填充
  if (!fillColor && cellSource && thisTblStyle) {
    const bgFillschemeClr = getTextByPathList(
      thisTblStyle,
      [cellSource, 'a:tcStyle', 'a:fill', 'a:solidFill']
    ) as XmlObject | undefined
    if (bgFillschemeClr) {
      fillColor = resolveSolidFill(bgFillschemeClr, context)
    }
  }

  // 从表格样式获取文字样式
  if (cellSource && thisTblStyle) {
    const rowTxtStyl = getTextByPathList(thisTblStyle, [cellSource, 'a:tcTxStyle']) as XmlObject | undefined
    if (rowTxtStyl) {
      fontColor = resolveSolidFill(rowTxtStyl, context)
      if (getTextByPathList(rowTxtStyl, ['attrs', 'b']) === 'on') {
        fontBold = true
      }
    }
  }

  // 获取边框
  const borders: TableBorders = {}

  let lin_bottm = getTextByPathList(tcNode, ['a:tcPr', 'a:lnB']) as XmlObject | undefined
  let lin_top = getTextByPathList(tcNode, ['a:tcPr', 'a:lnT']) as XmlObject | undefined
  let lin_left = getTextByPathList(tcNode, ['a:tcPr', 'a:lnL']) as XmlObject | undefined
  let lin_right = getTextByPathList(tcNode, ['a:tcPr', 'a:lnR']) as XmlObject | undefined

  // 从表格样式获取边框
  if (thisTblStyle) {
    if (!lin_bottm) {
      lin_bottm = getTextByPathList(thisTblStyle, ['a:wholeTbl', 'a:tcStyle', 'a:tcBdr', 'a:bottom', 'a:ln']) as XmlObject | undefined
    }
    if (!lin_top) {
      lin_top = getTextByPathList(thisTblStyle, ['a:wholeTbl', 'a:tcStyle', 'a:tcBdr', 'a:top', 'a:ln']) as XmlObject | undefined
    }
    if (!lin_left) {
      lin_left = getTextByPathList(thisTblStyle, ['a:wholeTbl', 'a:tcStyle', 'a:tcBdr', 'a:left', 'a:ln']) as XmlObject | undefined
    }
    if (!lin_right) {
      lin_right = getTextByPathList(thisTblStyle, ['a:wholeTbl', 'a:tcStyle', 'a:tcBdr', 'a:right', 'a:ln']) as XmlObject | undefined
    }
  }

  if (lin_bottm) borders.bottom = getBorderFromLn(lin_bottm)
  if (lin_top) borders.top = getBorderFromLn(lin_top)
  if (lin_left) borders.left = getBorderFromLn(lin_left)
  if (lin_right) borders.right = getBorderFromLn(lin_right)

  return {
    fillColor,
    fontColor,
    fontBold,
    borders: Object.keys(borders).length > 0 ? borders : undefined,
    rowSpan: rowSpan ? parseInt(rowSpan, 10) : undefined,
    colSpan: colSpan ? parseInt(colSpan, 10) : undefined,
    vMerge: vMerge ? parseInt(vMerge, 10) : undefined,
    hMerge: hMerge ? parseInt(hMerge, 10) : undefined,
  }
}

/**
 * 解析单元格文本
 */
function parseCellText(txBody: XmlObject | undefined): string {
  if (!txBody) return ''

  const pArray = txBody['a:p'] || []
  const paragraphs = Array.isArray(pArray) ? pArray : [pArray]

  const textParts: string[] = []
  for (const p of paragraphs) {
    const rArray = p?.['a:r'] || []
    const runs = Array.isArray(rArray) ? rArray : [rArray]

    for (const r of runs) {
      const text = r?.['a:t'] || ''
      if (typeof text === 'string') {
        textParts.push(text)
      }
    }
  }

  return textParts.join('')
}

/**
 * 获取单元格来源（用于条件格式）
 */
function getCellSource(
  colIndex: number,
  rowIndex: number,
  colCount: number,
  rowCount: number,
  tblStylAttrObj: TableStyleAttrs,
  thisTblStyle: XmlObject | undefined
): string | undefined {
  // 首列
  if (colIndex === 0 && tblStylAttrObj.isFrstColAttr === 1) {
    // 角落单元格
    if (tblStylAttrObj.isLstRowAttr === 1 && rowIndex === rowCount - 1 && thisTblStyle?.['a:seCell']) {
      return 'a:seCell'
    }
    if (tblStylAttrObj.isFrstRowAttr === 1 && rowIndex === 0 && thisTblStyle?.['a:neCell']) {
      return 'a:neCell'
    }
    return 'a:firstCol'
  }

  // 末列
  if (colIndex === colCount - 1 && tblStylAttrObj.isLstColAttr === 1) {
    if (tblStylAttrObj.isLstRowAttr === 1 && rowIndex === rowCount - 1 && thisTblStyle?.['a:swCell']) {
      return 'a:swCell'
    }
    if (tblStylAttrObj.isFrstRowAttr === 1 && rowIndex === 0 && thisTblStyle?.['a:nwCell']) {
      return 'a:nwCell'
    }
    return 'a:lastCol'
  }

  // 交替列
  if (tblStylAttrObj.isBandColAttr === 1) {
    if (colIndex % 2 !== 0 && thisTblStyle?.['a:band2V']) {
      return 'a:band2V'
    }
  }

  return undefined
}

/**
 * 解析表格元素
 * @param graphicFrame 图形框架节点
 * @param transform 变换信息
 * @param context 解析上下文
 */
export async function parseTable(
  graphicFrame: XmlObject,
  transform: PPTXTransform,
  context: ParsingContext
): Promise<PPTXElement | null> {
  const graphicData = graphicFrame?.['a:graphic']?.['a:graphicData']
  const tableNode = graphicData?.['a:tbl']
  const tblPr = tableNode?.['a:tblPr'] || {}

  if (!tableNode) return null

  // 获取表格样式 ID
  const tbleStyleId = tblPr['a:tableStyleId'] as string | undefined

  // 查找表格样式
  let thisTblStyle: XmlObject | undefined
  if (tbleStyleId && context.tableStyles) {
    const tbleStylList = context.tableStyles['a:tblStyleLst']?.['a:tblStyle'] || []
    const styleArray = Array.isArray(tbleStylList) ? tbleStylList : [tbleStylList]

    for (const style of styleArray) {
      if (style?.['attrs']?.['styleId'] === tbleStyleId) {
        thisTblStyle = style
        break
      }
    }
  }

  // 解析表格属性
  const firstRowAttr = tblPr['attrs']?.['firstRow']
  const firstColAttr = tblPr['attrs']?.['firstCol']
  const lastRowAttr = tblPr['attrs']?.['lastRow']
  const lastColAttr = tblPr['attrs']?.['lastCol']
  const bandRowAttr = tblPr['attrs']?.['bandRow']
  const bandColAttr = tblPr['attrs']?.['bandCol']

  const tblStylAttrObj: TableStyleAttrs = {
    isFrstRowAttr: firstRowAttr === '1' ? 1 : 0,
    isFrstColAttr: firstColAttr === '1' ? 1 : 0,
    isLstRowAttr: lastRowAttr === '1' ? 1 : 0,
    isLstColAttr: lastColAttr === '1' ? 1 : 0,
    isBandRowAttr: bandRowAttr === '1' ? 1 : 0,
    isBandColAttr: bandColAttr === '1' ? 1 : 0,
  }

  if (thisTblStyle) {
    (thisTblStyle as XmlObject & { tblStylAttrObj: TableStyleAttrs }).tblStylAttrObj = tblStylAttrObj
  }

  // 获取表格背景色
  let tbl_bgcolor = ''
  const tblBgFillRef = getTextByPathList(thisTblStyle, ['a:tblBg', 'a:fillRef']) as XmlObject | undefined
  if (tblBgFillRef) {
    tbl_bgcolor = resolveSolidFill(tblBgFillRef, context)
  }
  if (!tbl_bgcolor) {
    const wholeTblFill = getTextByPathList(thisTblStyle, ['a:wholeTbl', 'a:tcStyle', 'a:fill', 'a:solidFill']) as XmlObject | undefined
    if (wholeTblFill) {
      tbl_bgcolor = resolveSolidFill(wholeTblFill, context)
    }
  }

  // 解析行
  let trNodes = tableNode['a:tr'] || []
  trNodes = Array.isArray(trNodes) ? trNodes : [trNodes]

  const rows: PPTXTableCell[][] = []

  for (let i = 0; i < trNodes.length; i++) {
    const trNode = trNodes[i]

    // 获取行级样式
    const rowParams = getTableRowParams(trNodes as XmlObject[], i, tblStylAttrObj, thisTblStyle, context)

    // 解析单元格
    let tcNodes = trNode['a:tc'] || []
    tcNodes = Array.isArray(tcNodes) ? tcNodes : [tcNodes]

    const row: PPTXTableCell[] = []

    for (let j = 0; j < tcNodes.length; j++) {
      const tcNode = tcNodes[j] as XmlObject

      // 获取单元格来源（用于条件格式）
      const cellSource = getCellSource(
        j, i,
        tcNodes.length, trNodes.length,
        tblStylAttrObj, thisTblStyle
      )

      // 解析单元格文本
      const text = parseCellText(tcNode['a:txBody'])

      // 解析单元格参数
      const cellParams = await getTableCellParams(tcNode, thisTblStyle, cellSource, context)

      const cell: PPTXTableCell = {
        text,
        rowSpan: cellParams.vMerge || cellParams.rowSpan,
        colSpan: cellParams.colSpan,
        formatting: {
          bold: cellParams.fontBold || rowParams.fontBold,
          color: cellParams.fontColor || rowParams.fontColor,
          backgroundColor: cellParams.fillColor || rowParams.fillColor || tbl_bgcolor,
        },
      }

      // 清理 undefined 值
      if (!cell.rowSpan) delete cell.rowSpan
      if (!cell.colSpan) delete cell.colSpan
      if (!cell.formatting?.bold) delete cell.formatting?.bold
      if (!cell.formatting?.color) delete cell.formatting?.color
      if (!cell.formatting?.backgroundColor) delete cell.formatting?.backgroundColor
      if (Object.keys(cell.formatting || {}).length === 0) delete cell.formatting

      row.push(cell)
    }

    rows.push(row)
  }

  return {
    type: 'table',
    id: `table-${context.slideIndex}-${Date.now()}`,
    transform,
    rows,
  }
}
