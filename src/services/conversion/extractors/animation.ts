import type { PPTAnimation, AnimationType, AnimationTrigger, TurningMode } from '../../../types/pptist';
import { XMLParser } from 'fast-xml-parser';

/**
 * PPTX 动画类型映射
 * 将 PPTX 的动画类型映射到 PPTist 的动画类型
 */
const PPTX_TRANSITION_MAP: Record<string, TurningMode> = {
  // 淡入淡出
  'fade': 'fade',
  'throughBlack': 'fade',

  // 推入
  'pushLeft': 'slideX',
  'pushRight': 'slideX',
  'pushUp': 'slideY',
  'pushDown': 'slideY',

  // 擦除
  'wipeLeft': 'slideX',
  'wipeRight': 'slideX',
  'wipeUp': 'slideY',
  'wipeDown': 'slideY',

  // 分割
  'splitHIn': 'scaleX',
  'splitVIn': 'scaleY',

  // 3D 效果
  'cubeLeft': 'slideX3D',
  'cubeRight': 'slideX3D',
  'cubeUp': 'slideY3D',
  'cubeDown': 'slideY3D',

  // 旋转
  'rotateIn': 'rotate',

  // 缩放
  'zoomIn': 'scale',
  'zoomOut': 'scaleReverse',
};

/**
 * PPTX 元素动画类型映射
 */
const PPTX_ANIMATION_TYPE_MAP: Record<string, AnimationType> = {
  'entr': 'in',      // 进入动画
  'exit': 'out',     // 退出动画
  'emphasis': 'attention',  // 强调动画
  'motion': 'attention',    // 路径动画归为强调
};

/**
 * PPTX 动画触发方式映射
 */
const PPTX_TRIGGER_MAP: Record<string, AnimationTrigger> = {
  'onclick': 'click',
  'withPrevious': 'meantime',
  'afterPrevious': 'auto',
};

/**
 * 常见 PPTX 动画效果名称映射
 */
const PPTX_EFFECT_MAP: Record<string, string> = {
  // 进入动画
  'fadeIn': '淡入',
  'floatIn': '浮入',
  'flyIn': '飞入',
  'wipeIn': '擦除',
  'split': '劈裂',
  'zoom': '缩放',
  'bounce': '弹跳',
  'random': '随机',

  // 退出动画
  'fadeOut': '淡出',
  'floatOut': '浮出',
  'flyOut': '飞出',

  // 强调动画
  'pulse': '脉冲',
  'spin': '旋转',
  'teeter': '跷跷板',
  'wave': '波浪',
  'growShrink': '放大/缩小',
  'desaturate': '饱和',
  'darken': '变暗',
  'lighten': '变亮',
};

/**
 * 动画提取服务
 * 负责从 PPTX 中提取幻灯片切换动画和元素动画
 */
export class AnimationExtractor {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '#text',
    });
  }

  /**
   * 提取幻灯片切换动画
   * @param slideXml 幻灯片 XML 内容
   * @returns TurningMode 或 undefined
   */
  extractSlideTransition(slideXml: string): TurningMode | undefined {
    try {
      const parsed = this.parser.parse(slideXml);
      const transition = parsed?.['p:sld']?.['p:transition'];

      if (!transition) {
        return undefined;
      }

      // 获取切换效果
      const effect = transition['a:evtFilter']?.['attrib'] || transition['spd']?.['attrib'];

      if (effect && typeof effect === 'string') {
        // 尝试直接映射
        if (PPTX_TRANSITION_MAP[effect]) {
          return PPTX_TRANSITION_MAP[effect];
        }

        // 尝试从效果名称中提取关键信息
        const effectLower = effect.toLowerCase();
        for (const [pptxKey, pptistValue] of Object.entries(PPTX_TRANSITION_MAP)) {
          if (effectLower.includes(pptxKey.toLowerCase())) {
            return pptistValue;
          }
        }
      }

      // 如果无法识别具体效果，返回默认的 fade
      return transition ? 'fade' : undefined;
    } catch (error) {
      // 解析失败，返回 undefined
      return undefined;
    }
  }

  /**
   * 提取元素动画
   * @param slideXml 幻灯片 XML 内容
   * @param elementIdMap 元素 ID 映射 (PPTX ID -> PPTist ID)
   * @returns PPTAnimation 数组
   */
  extractElementAnimations(
    slideXml: string,
    elementIdMap: Map<string, string>
  ): PPTAnimation[] {
    const animations: PPTAnimation[] = [];

    try {
      const parsed = this.parser.parse(slideXml);
      const timing = parsed?.['p:sld']?.['p:timing'];

      if (!timing) {
        return animations;
      }

      // 获取所有动画序列
      const seqList = Array.isArray(timing['p:tnLst']?.['p:seq'])
        ? timing['p:tnLst']['p:seq']
        : timing['p:tnLst']?.['p:seq']
        ? [timing['p:tnLst']['p:seq']]
        : [];

      for (const seq of seqList) {
        if (!seq) continue;

        // 获取此序列的所有动画
        const cTnList = Array.isArray(seq['p:cTn']) ? seq['p:cTn'] : [seq['p:cTn']];

        for (const cTn of cTnList) {
          if (!cTn) continue;

          // 递归提取动画
          this.extractAnimationsFromCTn(cTn, elementIdMap, animations, 'auto');
        }
      }
    } catch (error) {
      // 解析失败，返回空数组
      return animations;
    }

    return animations;
  }

  /**
   * 从时间节点中递归提取动画
   * @param cTn 时间节点
   * @param elementIdMap 元素 ID 映射
   * @param animations 动画数组（累积结果）
   * @param parentTrigger 父级触发方式
   */
  private extractAnimationsFromCTn(
    cTn: any,
    elementIdMap: Map<string, string>,
    animations: PPTAnimation[],
    parentTrigger: AnimationTrigger
  ): void {
    if (!cTn) return;

    // 检查是否有子节点
    const childTnList = Array.isArray(cTn['p:childTnLst']?.['p:seq'])
      ? cTn['p:childTnLst']['p:seq']
      : cTn['p:childTnLst']?.['p:seq']
      ? [cTn['p:childTnLst']['p:seq']]
      : [];

    for (const childTn of childTnList) {
      if (!childTn) continue;
      this.extractAnimationsFromCTn(childTn, elementIdMap, animations, parentTrigger);
    }

    // 提取当前节点的动画
    const targetElement = cTn['p:tgtEl']?.['p:spTgt'];
    if (!targetElement) return;

    const pptxId = targetElement['spid'];
    if (!pptxId) return;

    // 映射到 PPTist ID
    const pptistId = elementIdMap.get(pptxId);
    if (!pptistId) return;

    // 获取动画类型
    const presetClass = cTn['p:cBhvr']?.['p:cTn']?.['p:presetClass']?.['val'] || '';
    const animationType = this.mapAnimationType(presetClass);

    // 获取动画效果名称
    const presetId = cTn['p:cBhvr']?.['p:presetAttr']?.['val'] || presetClass;
    const effectName = this.mapEffectName(presetId);

    // 获取持续时间（毫秒）
    const duration = cTn['p:cBhvr']?.['p:dur'] || '1000';
    const durationMs = this.parseDuration(duration);

    // 获取触发方式
    const trigger = this.mapTriggerType(cTn['stCondList']?.['p:cond'], parentTrigger);

    // 生成动画对象
    const animation: PPTAnimation = {
      id: this.generateAnimationId(),
      elId: pptistId,
      effect: effectName,
      type: animationType,
      duration: durationMs,
      trigger,
    };

    animations.push(animation);
  }

  /**
   * 映射动画类型
   */
  private mapAnimationType(presetClass: string): AnimationType {
    if (!presetClass) return 'in';

    const lower = presetClass.toLowerCase();

    // 检查是否包含特定关键词
    for (const [pptxKey, pptistType] of Object.entries(PPTX_ANIMATION_TYPE_MAP)) {
      if (lower.includes(pptxKey.toLowerCase())) {
        return pptistType;
      }
    }

    // 默认为进入动画
    return 'in';
  }

  /**
   * 映射动画效果名称
   */
  private mapEffectName(presetId: string): string {
    if (!presetId) return '淡入';

    // 尝试直接映射
    if (PPTX_EFFECT_MAP[presetId]) {
      return PPTX_EFFECT_MAP[presetId];
    }

    // 尝试模糊匹配
    const lower = presetId.toLowerCase();
    for (const [key, name] of Object.entries(PPTX_EFFECT_MAP)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return name;
      }
    }

    // 无法识别时返回通用名称
    return '动画效果';
  }

  /**
   * 解析持续时间
   * PPTX 使用格式: "1000" 表示 1000 毫秒
   */
  private parseDuration(duration: string): number {
    if (!duration) return 1000;

    // 移除非数字字符
    const numeric = parseInt(duration.replace(/\D/g, ''), 10);

    return isNaN(numeric) ? 1000 : numeric;
  }

  /**
   * 映射触发方式
   */
  private mapTriggerType(cond: any, parentTrigger: AnimationTrigger): AnimationTrigger {
    if (!cond) return parentTrigger || 'click';

    // 检查是否有延迟触发
    if (cond['delay']) {
      return 'auto';
    }

    // 默认继承父级触发方式
    return parentTrigger || 'click';
  }

  /**
   * 生成动画 ID
   */
  private generateAnimationId(): string {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 创建动画提取器实例
 */
export function createAnimationExtractor(): AnimationExtractor {
  return new AnimationExtractor();
}
