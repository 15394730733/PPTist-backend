import { v4 as uuidv4 } from 'uuid';
import type { ImageElement } from '../../../types/pptist';
import type { ConversionWarning } from '../../../models/warning';
import type { PPTXElement } from '../../../types/pptx';

/**
 * 不支持的元素类型
 */
export enum UnsupportedElementType {
  SMARTART = 'SmartArt',
  THREE_D_MODEL = 'ThreeDModel',
  DIAGRAM = 'Diagram',
  MATH_EQUATION = 'MathEquation',
  AUDIO_MACRO = 'AudioMacro',
  VIDEO_MACRO = 'VideoMacro',
  INK = 'Ink',
  GROUP_advanced = 'AdvancedGroup',
  ARTISTIC_EFFECT = 'ArtisticEffect',
}

/**
 * 降级策略
 */
export enum DowngradeStrategy {
  /** 转换为图片 */
  TO_IMAGE = 'to_image',
  /** 移除元素 */
  REMOVE = 'remove',
  /** 转换为形状 */
  TO_SHAPE = 'to_shape',
  /** 保留但标记警告 */
  KEEP_WITH_WARNING = 'keep_with_warning',
}

/**
 * 元素降级处理器
 * 负责处理 PPTist 不支持的元素类型
 */
export class DowngradeHandler {
  /**
   * 处理不支持的元素
   * @param element PPTX 元素
   * @param unsupportedType 不支持的元素类型
   * @param strategy 降级策略
   * @param warnings 警告收集器
   * @returns 处理后的元素或 undefined（如果移除）
   */
  handleUnsupportedElement(
    element: PPTXElement,
    unsupportedType: UnsupportedElementType,
    strategy: DowngradeStrategy,
    warnings: ConversionWarning[]
  ): ImageElement | PPTXElement | undefined {
    const elementId = element.id || 'unknown';

    // 记录警告
    this.addWarning(elementId, unsupportedType, strategy, warnings);

    // 根据策略处理
    switch (strategy) {
      case DowngradeStrategy.TO_IMAGE:
        return this.convertToImage(element, unsupportedType);

      case DowngradeStrategy.REMOVE:
        return undefined;

      case DowngradeStrategy.TO_SHAPE:
        return this.convertToShape(element);

      case DowngradeStrategy.KEEP_WITH_WARNING:
        return element;

      default:
        // 默认转换为图片
        return this.convertToImage(element, unsupportedType);
    }
  }

  /**
   * 将元素转换为图片元素
   * @param element 原始元素
   * @param unsupportedType 不支持的元素类型
   * @returns 图片元素
   */
  private convertToImage(
    element: PPTXElement,
    unsupportedType: UnsupportedElementType
  ): ImageElement {
    // 尝试从元素中提取图片（如果可用）
    const imageSrc = this.extractImageFromElement(element, unsupportedType);

    return {
      id: element.id || uuidv4(),
      type: 'image',
      left: element.left || 0,
      top: element.top || 0,
      width: element.width || 100,
      height: element.height || 100,
      rotate: element.rotate || 0,
      fixedRatio: true,
      src: imageSrc,
      name: `${unsupportedType} (已转换为图片)`,
      // 保留原始元素的通用属性
      lock: element.lock,
      groupId: element.groupId,
      link: element.link,
    };
  }

  /**
   * 从元素中提取图片
   * @param element 元素
   * @param unsupportedType 不支持的元素类型
   * @returns 图片 Base64 或占位符
   */
  private extractImageFromElement(element: PPTXElement, unsupportedType: UnsupportedElementType): string {
    // 尝试获取元素中的嵌入图片
    if (element.blipEmbed) {
      return element.blipEmbed;
    }

    // 如果没有嵌入图片，返回占位符
    return this.getPlaceholderImage(unsupportedType);
  }

  /**
   * 获取占位符图片
   * @param unsupportedType 不支持的元素类型
   * @returns Base64 占位符图片
   */
  private getPlaceholderImage(unsupportedType: UnsupportedElementType): string {
    // 简单的 SVG 占位符（透明背景 + 文字）
    const text = this.getPlaceholderText(unsupportedType);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
        <rect width="200" height="150" fill="#f0f0f0" stroke="#cccccc" stroke-width="2"/>
        <text x="100" y="75" font-family="Arial" font-size="14" fill="#666666" text-anchor="middle">${text}</text>
      </svg>
    `;

    // 转换为 Base64
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * 获取占位符文本
   */
  private getPlaceholderText(unsupportedType: UnsupportedElementType): string {
    const textMap: Record<UnsupportedElementType, string> = {
      [UnsupportedElementType.SMARTART]: 'SmartArt图形',
      [UnsupportedElementType.THREE_D_MODEL]: '3D模型',
      [UnsupportedElementType.DIAGRAM]: '图表',
      [UnsupportedElementType.MATH_EQUATION]: '数学公式',
      [UnsupportedElementType.AUDIO_MACRO]: '音频对象',
      [UnsupportedElementType.VIDEO_MACRO]: '视频对象',
      [UnsupportedElementType.INK]: '手写批注',
      [UnsupportedElementType.GROUP_advanced]: '组合元素',
      [UnsupportedElementType.ARTISTIC_EFFECT]: '艺术效果',
    };

    return textMap[unsupportedType] || '不支持的元素';
  }

  /**
   * 将元素转换为简单形状
   * @param element 原始元素
   * @returns 形状元素
   */
  private convertToShape(element: PPTXElement): PPTXElement {
    // 将元素转换为简单的矩形形状
    return {
      ...element,
      type: 'shape',
      name: `${element.name || '元素'} (已简化)`,
    };
  }

  /**
   * 添加降级警告
   * @param elementId 元素 ID
   * @param unsupportedType 不支持的元素类型
   * @param strategy 降级策略
   * @param warnings 警告数组
   */
  private addWarning(
    elementId: string,
    unsupportedType: UnsupportedElementType,
    strategy: DowngradeStrategy,
    warnings: ConversionWarning[]
  ): void {
    const message = this.getWarningMessage(unsupportedType, strategy);
    const suggestion = this.getSuggestion(unsupportedType, strategy);
    const severity = this.getSeverity(strategy);

    warnings.push({
      type: 'DOWNGRADED',
      code: 'DOWNGRADED',
      message,
      severity: severity as 'error' | 'warning' | 'info',
      context: {
        elementType: unsupportedType,
        elementId,
        suggestion,
      },
    });
  }

  /**
   * 获取警告消息
   */
  private getWarningMessage(unsupportedType: UnsupportedElementType, strategy: DowngradeStrategy): string {
    const actionText = this.getActionText(strategy);
    return `不支持的元素类型 "${unsupportedType}" 已${actionText}`;
  }

  /**
   * 获取操作文本
   */
  private getActionText(strategy: DowngradeStrategy): string {
    const actionMap: Record<DowngradeStrategy, string> = {
      [DowngradeStrategy.TO_IMAGE]: '转换为图片',
      [DowngradeStrategy.REMOVE]: '移除',
      [DowngradeStrategy.TO_SHAPE]: '简化为形状',
      [DowngradeStrategy.KEEP_WITH_WARNING]: '保留但可能显示异常',
    };

    return actionMap[strategy] || '处理';
  }

  /**
   * 获取建议
   */
  private getSuggestion(unsupportedType: UnsupportedElementType, strategy: DowngradeStrategy): string {
    if (strategy === DowngradeStrategy.TO_IMAGE) {
      return `建议: 在 PPTist 中手动重新创建此${unsupportedType}`;
    }

    if (strategy === DowngradeStrategy.REMOVE) {
      return `建议: 此元素已移除，如需保留请截图并添加为图片`;
    }

    if (strategy === DowngradeStrategy.TO_SHAPE) {
      return `建议: 元素已简化，可能需要手动调整样式`;
    }

    return `建议: 检查此元素在 PPTist 中的显示效果`;
  }

  /**
   * 获取严重程度
   */
  private getSeverity(strategy: DowngradeStrategy): 'error' | 'warning' | 'info' {
    if (strategy === DowngradeStrategy.REMOVE) {
      return 'error';
    }

    if (strategy === DowngradeStrategy.KEEP_WITH_WARNING) {
      return 'warning';
    }

    return 'info';
  }

  /**
   * 检测元素类型并返回建议的降级策略
   * @param unsupportedType 不支持的元素类型
   * @returns 建议的降级策略
   */
  getRecommendedStrategy(unsupportedType: UnsupportedElementType): DowngradeStrategy {
    // SmartArt: 转换为图片（因为结构复杂）
    if (unsupportedType === UnsupportedElementType.SMARTART) {
      return DowngradeStrategy.TO_IMAGE;
    }

    // 3D 模型: 转换为图片（无法在 PPTist 中渲染）
    if (unsupportedType === UnsupportedElementType.THREE_D_MODEL) {
      return DowngradeStrategy.TO_IMAGE;
    }

    // 图表: 尝试转换为简单形状或图片
    if (unsupportedType === UnsupportedElementType.DIAGRAM) {
      return DowngradeStrategy.TO_IMAGE;
    }

    // 数学公式: 转换为图片（LaTeX 支持有限）
    if (unsupportedType === UnsupportedElementType.MATH_EQUATION) {
      return DowngradeStrategy.TO_IMAGE;
    }

    // 手写批注: 移除（通常是临时的）
    if (unsupportedType === UnsupportedElementType.INK) {
      return DowngradeStrategy.REMOVE;
    }

    // 艺术效果: 保留但警告（视觉效果可能丢失）
    if (unsupportedType === UnsupportedElementType.ARTISTIC_EFFECT) {
      return DowngradeStrategy.KEEP_WITH_WARNING;
    }

    // 默认: 转换为图片
    return DowngradeStrategy.TO_IMAGE;
  }
}

/**
 * 创建降级处理器实例
 */
export function createDowngradeHandler(): DowngradeHandler {
  return new DowngradeHandler();
}
