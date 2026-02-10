import { logger } from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import type { ConversionWarning } from '../../../models/warning';

/**
 * 宏检测器
 * 检测 PPTX 文件中的 VBA 宏代码
 */
export class MacroDetector {
  /**
   * 检测 PPTX 文件是否包含宏
   * @param pptxFiles PPTX 文件列表
   * @returns 是否包含宏
   */
  detectMacros(pptxFiles: Map<string, Buffer>): boolean {
    // VBA 宏通常存储在 vbaProject.bin 文件中
    const hasVbaProject = pptxFiles.has('ppt/vbaProject.bin');

    if (hasVbaProject) {
      logger.info('Detected VBA macros in PPTX file');
      return true;
    }

    return false;
  }

  /**
   * 获取宏警告信息
   * @returns 警告信息
   */
  getMacroWarning(): ConversionWarning {
    return {
      type: 'MACRO_IGNORED',
      code: 'MACRO_IGNORED',
      message: 'PPTX 文件包含 VBA 宏代码',
      severity: 'warning',
      context: {
        elementType: 'Macro',
        elementId: 'vbaProject',
        suggestion: '宏代码已被忽略，仅保留可视化元素。宏功能在 PPTist 中不支持。',
      },
    };
  }

  /**
   * 获取宏文件信息
   * @param pptxFiles PPTX 文件列表
   * @returns 宏文件信息
   */
  getMacroInfo(pptxFiles: Map<string, Buffer>): MacroInfo | null {
    const vbaData = pptxFiles.get('ppt/vbaProject.bin');

    if (!vbaData) {
      return null;
    }

    return {
      exists: true,
      size: vbaData.length,
      sizeKB: (vbaData.length / 1024).toFixed(2),
      macrosIgnored: true,
      recommendation: '宏代码已忽略，请在 PPTist 中手动重新实现相关功能',
    };
  }
}

/**
 * ActiveX 控件检测器
 * 检测和处理 PPTX 中的 ActiveX 控件
 */
export class ActiveXDetector {
  /**
   * 从幻灯片 XML 中检测 ActiveX 控件
   * @param slideXml 幻灯片 XML 内容
   * @returns ActiveX 控件列表
   */
  detectActiveXControls(slideXml: string): ActiveXControl[] {
    const controls: ActiveXControl[] = [];

    try {
      // ActiveX 控件在 PPTX XML 中的标签通常是 <p:control>
      // 使用正则表达式查找
      const controlRegex = /<p:control[^>]*>/gi;
      const matches = slideXml.match(controlRegex);

      if (matches) {
        for (const match of matches) {
          const control = this.parseControlTag(match);
          if (control) {
            controls.push(control);
          }
        }
      }

      if (controls.length > 0) {
        logger.info(`Detected ${controls.length} ActiveX controls in slide`);
      }
    } catch (error) {
      logger.error('Error detecting ActiveX controls', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return controls;
  }

  /**
   * 解析控件标签
   * @param tag 控件标签
   * @returns 控件信息
   */
  private parseControlTag(tag: string): ActiveXControl | null {
    try {
      // 提取属性
      const idMatch = tag.match(/r:id="([^"]*)"/);
      const nameMatch = tag.match(/name="([^"]*)"/);
      const typeMatch = tag.match(/type="([^"]*)"/);

      return {
        id: idMatch ? idMatch[1] : '',
        name: nameMatch ? nameMatch[1] : 'Unknown Control',
        type: typeMatch ? typeMatch[1] : 'Unknown',
        ignored: true,
        reason: 'ActiveX controls are not supported in PPTist',
      };
    } catch {
      return null;
    }
  }

  /**
   * 为检测到的控件生成警告
   * @param controls ActiveX 控件列表
   * @returns 警告列表
   */
  getControlWarnings(controls: ActiveXControl[]): ConversionWarning[] {
    const warnings: ConversionWarning[] = [];

    for (const control of controls) {
      warnings.push({
        type: 'ACTIVEX_IGNORED',
        code: 'ACTIVEX_IGNORED',
        message: `ActiveX 控件 "${control.name}" 已被忽略`,
        severity: 'warning',
        context: {
          elementType: 'ActiveX',
          elementId: control.id,
          suggestion: 'ActiveX 控件在 PPTist 中不支持。控件已被移除，但保留了其他静态内容。',
        },
      });
    }

    return warnings;
  }

  /**
   * 检测是否应该移除控件
   * @param control 控件信息
   * @returns 是否移除
   */
  shouldRemoveControl(control: ActiveXControl): boolean {
    // 所有 ActiveX 控件都应该移除
    // 因为它们在 PPTist 中无法正常工作
    return true;
  }

  /**
   * 获取控件的占位符信息（用于替代）
   * @param control 控件信息
   * @returns 占位符信息
   */
  getPlaceholderForControl(control: ActiveXControl): ControlPlaceholder {
    return {
      type: 'placeholder',
      elementType: 'ActiveX',
      originalName: control.name,
      message: `ActiveX 控件 "${control.name}" 已移除`,
      suggestion: '请在 PPTist 中手动重新实现此功能',
    };
  }
}

/**
 * 宏和 ActiveX 处理器
 * 统一处理宏和控件
 */
export class MacroAndActiveXHandler {
  private macroDetector: MacroDetector;
  private activeXDetector: ActiveXDetector;

  constructor() {
    this.macroDetector = new MacroDetector();
    this.activeXDetector = new ActiveXDetector();
  }

  /**
   * 处理 PPTX 文件中的宏和 ActiveX
   * @param pptxFiles PPTX 文件列表
   * @param slidesXml 幻灯片 XML 列表
   * @returns 处理结果
   */
  processMacrosAndActiveX(
    pptxFiles: Map<string, Buffer>,
    slidesXml: Map<string, string>
  ): MacroAndActiveXResult {
    const warnings: ConversionWarning[] = [];
    const ignoredControls: ActiveXControl[] = [];

    // 检测宏
    const hasMacros = this.macroDetector.detectMacros(pptxFiles);
    if (hasMacros) {
      const macroInfo = this.macroDetector.getMacroInfo(pptxFiles);
      if (macroInfo) {
        logger.warn('VBA macros detected and will be ignored', {
          sizeKB: macroInfo.sizeKB,
        });

        warnings.push(this.macroDetector.getMacroWarning());
      }
    }

    // 检测 ActiveX 控件
    for (const [slideId, slideXml] of slidesXml.entries()) {
      const controls = this.activeXDetector.detectActiveXControls(slideXml);

      for (const control of controls) {
        ignoredControls.push({
          ...control,
          slideId,
        });
      }

      if (controls.length > 0) {
        const controlWarnings = this.activeXDetector.getControlWarnings(controls);
        warnings.push(...controlWarnings);
      }
    }

    return {
      hasMacros,
      macroInfo: hasMacros ? this.macroDetector.getMacroInfo(pptxFiles) : null,
      ignoredControls,
      warnings,
    };
  }

  /**
   * 获取处理摘要
   * @param result 处理结果
   * @returns 摘要信息
   */
  getSummary(result: MacroAndActiveXResult): string {
    const parts: string[] = [];

    if (result.hasMacros) {
      parts.push(`VBA 宏: 已忽略 (${result.macroInfo?.sizeKB} KB)`);
    }

    if (result.ignoredControls.length > 0) {
      parts.push(`ActiveX 控件: 已忽略 ${result.ignoredControls.length} 个`);
    }

    if (parts.length === 0) {
      return '未检测到宏或 ActiveX 控件';
    }

    return parts.join(' | ');
  }
}

/**
 * 宏信息
 */
export interface MacroInfo {
  /** 是否存在宏 */
  exists: boolean;

  /** 文件大小（字节） */
  size: number;

  /** 文件大小（KB） */
  sizeKB: string;

  /** 宏是否被忽略 */
  macrosIgnored: boolean;

  /** 建议 */
  recommendation: string;
}

/**
 * ActiveX 控件信息
 */
export interface ActiveXControl {
  /** 控件 ID */
  id: string;

  /** 控件名称 */
  name: string;

  /** 控件类型 */
  type: string;

  /** 是否被忽略 */
  ignored: boolean;

  /** 忽略原因 */
  reason: string;

  /** 所属幻灯片 ID（可选） */
  slideId?: string;
}

/**
 * 控件占位符
 */
export interface ControlPlaceholder {
  /** 占位符类型 */
  type: 'placeholder';

  /** 元素类型 */
  elementType: string;

  /** 原始名称 */
  originalName: string;

  /** 消息 */
  message: string;

  /** 建议 */
  suggestion: string;
}

/**
 * 宏和 ActiveX 处理结果
 */
export interface MacroAndActiveXResult {
  /** 是否包含宏 */
  hasMacros: boolean;

  /** 宏信息 */
  macroInfo: MacroInfo | null;

  /** 被忽略的控件列表 */
  ignoredControls: ActiveXControl[];

  /** 警告列表 */
  warnings: ConversionWarning[];
}

/**
 * 创建宏检测器
 */
export function createMacroDetector(): MacroDetector {
  return new MacroDetector();
}

/**
 * 创建 ActiveX 检测器
 */
export function createActiveXDetector(): ActiveXDetector {
  return new ActiveXDetector();
}

/**
 * 创建宏和 ActiveX 处理器
 */
export function createMacroAndActiveXHandler(): MacroAndActiveXHandler {
  return new MacroAndActiveXHandler();
}
