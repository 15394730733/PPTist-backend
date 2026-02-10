import { XMLParser } from 'fast-xml-parser';

/**
 * 备注提取服务
 * 负责从 PPTX 中提取幻灯片备注（Notes）
 *
 * PPTX 备注结构:
 * - ppt/notesSlides/notesSlide1.xml, notesSlide2.xml, ...
 * - 备注内容在 <a:txt> 节点中
 */
export class NotesExtractor {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
    });
  }

  /**
   * 从备注幻灯片 XML 中提取备注文本
   * @param notesSlideXml 备注 XML 内容
   * @returns 备注文本字符串，如果无备注则返回 undefined
   */
  extractNotes(notesSlideXml: string): string | undefined {
    try {
      const parsed = this.parser.parse(notesSlideXml);

      // PPTX 备注结构: p:notes > p:spTree > p:sp > p:txBody > a:p > a:r > a:t
      const notesSlide = parsed?.['p:notes'];
      if (!notesSlide) return undefined;

      const spTree = notesSlide['p:spTree'];
      if (!spTree) return undefined;

      // 获取所有形状
      const shapes = Array.isArray(spTree['p:sp']) ? spTree['p:sp'] : [spTree['p:sp']];

      for (const shape of shapes) {
        if (!shape) continue;

        // 查找文本框
        const txBody = shape['p:txBody'];
        if (!txBody) continue;

        // 提取段落文本
        const text = this.extractTextFromParagraphs(txBody);

        // 过滤掉占位符文本（如 "Click to add notes"）
        if (text && this.isValidNotesText(text)) {
          return text.trim();
        }
      }

      return undefined;
    } catch (error) {
      // 解析失败，返回 undefined
      return undefined;
    }
  }

  /**
   * 从段落列表中提取文本
   * @param txBody 文本框节点
   * @returns 合并后的文本
   */
  private extractTextFromParagraphs(txBody: any): string {
    const paragraphs = Array.isArray(txBody['a:p']) ? txBody['a:p'] : [txBody['a:p']];

    const textParts: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph) continue;

      // 提取运行（runs）中的文本
      const runs = Array.isArray(paragraph['a:r']) ? paragraph['a:r'] : [paragraph['a:r']];

      for (const run of runs) {
        if (!run) continue;

        // 获取文本内容
        const text = run['a:t'] || run['#text'];
        if (text && typeof text === 'string') {
          textParts.push(text);
        }
      }

      // 添加段落分隔
      textParts.push('\n');
    }

    return textParts.join('').trim();
  }

  /**
   * 检查是否为有效的备注文本
   * 过滤掉 PowerPoint 默认的占位符文本
   * @param text 文本内容
   * @returns 是否为有效备注
   */
  private isValidNotesText(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }

    const trimmed = text.trim().toLowerCase();

    // 常见的占位符文本（英文）
    const placeholders = [
      'click to add notes',
      'click to add note',
      'add notes',
      'notes',
    ];

    // 常见的占位符文本（中文）
    const chinesePlaceholders = [
      '单击此处添加备注',
      '点击此处添加备注',
      '添加备注',
      '备注',
    ];

    const allPlaceholders = [...placeholders, ...chinesePlaceholders];

    // 检查是否匹配占位符
    for (const placeholder of allPlaceholders) {
      if (trimmed === placeholder) {
        return false;
      }
    }

    // 如果文本太短（少于 2 个字符），可能不是有效备注
    if (trimmed.length < 2) {
      return false;
    }

    return true;
  }

  /**
   * 从备注 XML 中提取结构化备注信息
   * 包含文本和基本格式信息（如果有）
   * @param notesSlideXml 备注 XML 内容
   * @returns 结构化备注对象或 undefined
   */
  extractStructuredNotes(notesSlideXml: string): StructuredNotes | undefined {
    try {
      const parsed = this.parser.parse(notesSlideXml);
      const notesSlide = parsed?.['p:notes'];
      if (!notesSlide) return undefined;

      const spTree = notesSlide['p:spTree'];
      if (!spTree) return undefined;

      const shapes = Array.isArray(spTree['p:sp']) ? spTree['p:sp'] : [spTree['p:sp']];

      for (const shape of shapes) {
        if (!shape) continue;

        const txBody = shape['p:txBody'];
        if (!txBody) continue;

        // 提取文本内容
        const text = this.extractTextFromParagraphs(txBody);
        if (!text || !this.isValidNotesText(text)) {
          continue;
        }

        // 提取段落信息
        const paragraphs = this.extractParagraphInfo(txBody);

        return {
          text: text.trim(),
          paragraphs,
          hasFormatting: paragraphs.length > 1,
        };
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 提取段落信息
   * @param txBody 文本框节点
   * @returns 段落数组
   */
  private extractParagraphInfo(txBody: any): ParagraphInfo[] {
    const paragraphs: ParagraphInfo[] = [];
    const pList = Array.isArray(txBody['a:p']) ? txBody['a:p'] : [txBody['a:p']];

    for (const p of pList) {
      if (!p) continue;

      const runs = Array.isArray(p['a:r']) ? p['a:r'] : [p['a:r']];
      const textParts: string[] = [];

      for (const run of runs) {
        if (!run) continue;

        const text = run['a:t'] || run['#text'];
        if (text && typeof text === 'string') {
          textParts.push(text);
        }
      }

      const paragraphText = textParts.join('');

      // 提取文本属性
      const properties = this.extractTextProperties(p);

      paragraphs.push({
        text: paragraphText,
        ...properties,
      });
    }

    return paragraphs.filter(p => p.text.trim().length > 0);
  }

  /**
   * 提取文本属性
   * @param paragraph 段落节点
   * @returns 文本属性
   */
  private extractTextProperties(paragraph: any): Partial<TextProperties> {
    const properties: Partial<TextProperties> = {};

    // 提取段落级别属性
    const pPr = paragraph['a:pPr'];
    if (pPr) {
      // 对齐方式
      const algn = pPr['algn'];
      if (algn) {
        properties.alignment = this.mapAlignment(algn);
      }

      // 项目符号
      if (pPr['buChar'] || pPr['buAutoNum']) {
        properties.hasBullet = true;
      }
    }

    // 提取运行级别属性（使用第一个运行的属性）
    const r = Array.isArray(paragraph['a:r']) ? paragraph['a:r'][0] : paragraph['a:r'];
    if (r) {
      const rPr = r['a:rPr'];
      if (rPr) {
        if (rPr['b'] === '1') properties.bold = true;
        if (rPr['i'] === '1') properties.italic = true;
        if (rPr['u'] === 'sng') properties.underline = true;
      }
    }

    return properties;
  }

  /**
   * 映射对齐方式
   */
  private mapAlignment(alignment: string): 'left' | 'center' | 'right' | 'justify' {
    const map: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
      'l': 'left',
      'ctr': 'center',
      'r': 'right',
      'just': 'justify',
      'dist': 'justify',
    };

    return map[alignment] || 'left';
  }
}

/**
 * 结构化备注信息
 */
export interface StructuredNotes {
  /** 完整文本 */
  text: string;
  /** 段落列表 */
  paragraphs: ParagraphInfo[];
  /** 是否包含格式化 */
  hasFormatting: boolean;
}

/**
 * 段落信息
 */
export interface ParagraphInfo {
  /** 段落文本 */
  text: string;
  /** 对齐方式 */
  alignment?: 'left' | 'center' | 'right' | 'justify';
  /** 是否加粗 */
  bold?: boolean;
  /** 是否斜体 */
  italic?: boolean;
  /** 是否下划线 */
  underline?: boolean;
  /** 是否有项目符号 */
  hasBullet?: boolean;
}

/**
 * 文本属性
 */
export interface TextProperties {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  hasBullet?: boolean;
}

/**
 * 创建备注提取器实例
 */
export function createNotesExtractor(): NotesExtractor {
  return new NotesExtractor();
}
