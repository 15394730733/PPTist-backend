/**
 * PPTX 解析上下文
 * 用于在整个解析过程中共享主题、布局、母版等信息
 */

import type JSZip from 'jszip'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type XmlObject = Record<string, any>

/**
 * 资源映射：rId -> 资源信息
 */
export interface ResourceInfo {
  type: string
  target: string
}

export type ResourceMap = Record<string, ResourceInfo>

/**
 * 元素索引表：用于占位符查找
 */
export interface IndexTables {
  idTable: Record<string, XmlObject>    // 通过 id 查找元素
  idxTable: Record<string, XmlObject>   // 通过 idx 查找占位符
  typeTable: Record<string, XmlObject>  // 通过 type 查找占位符
}

/**
 * 颜色映射覆盖（来自 slide 或 layout）
 */
export interface ColorMapOverride {
  tx1?: string  // 文本色 1 -> 映射到哪个主题色
  tx2?: string  // 文本色 2
  bg1?: string  // 背景色 1
  bg2?: string  // 背景色 2
  [key: string]: string | undefined
}

/**
 * PPTX 解析上下文
 * 包含解析过程中需要的所有共享信息
 */
export interface ParsingContext {
  /** JSZip 实例 */
  zip: JSZip

  // === 主题相关 ===
  /** 主题 XML 内容 */
  themeContent: XmlObject
  /** 主题颜色数组（6个强调色） */
  themeColors: string[]
  /** 主题文件路径 */
  themePath?: string

  // === 布局和母版相关 ===
  /** 幻灯片布局 XML 内容 */
  slideLayoutContent: XmlObject
  /** 幻灯片布局索引表 */
  slideLayoutTables: IndexTables

  /** 幻灯片母版 XML 内容 */
  slideMasterContent: XmlObject
  /** 幻灯片母版索引表 */
  slideMasterTables: IndexTables
  /** 幻灯片母版文本样式 */
  slideMasterTextStyles?: XmlObject

  // === 资源映射 ===
  /** 当前幻灯片的资源映射 */
  slideResObj: ResourceMap
  /** 布局的资源映射 */
  layoutResObj: ResourceMap
  /** 母版的资源映射 */
  masterResObj: ResourceMap
  /** 主题的资源映射 */
  themeResObj: ResourceMap

  // === 当前幻灯片 ===
  /** 当前幻灯片 XML 内容 */
  slideContent: XmlObject
  /** 幻灯片索引（从1开始） */
  slideIndex: number

  // === 样式相关 ===
  /** 默认文本样式 */
  defaultTextStyle?: XmlObject
  /** 表格样式 */
  tableStyles?: XmlObject
  /** 颜色映射覆盖 */
  colorMapOverride?: ColorMapOverride

  // === 缓存 ===
  /** 已加载的图片缓存（路径 -> base64） */
  loadedImages: Map<string, string>
}

/**
 * 创建空的索引表
 */
export function createEmptyIndexTables(): IndexTables {
  return {
    idTable: {},
    idxTable: {},
    typeTable: {},
  }
}

/**
 * 创建默认的解析上下文
 */
export function createDefaultParsingContext(zip: JSZip): ParsingContext {
  return {
    zip,
    themeContent: {},
    themeColors: [],
    slideLayoutContent: {},
    slideLayoutTables: createEmptyIndexTables(),
    slideMasterContent: {},
    slideMasterTables: createEmptyIndexTables(),
    slideResObj: {},
    layoutResObj: {},
    masterResObj: {},
    themeResObj: {},
    slideContent: {},
    slideIndex: 1,
    loadedImages: new Map(),
  }
}
