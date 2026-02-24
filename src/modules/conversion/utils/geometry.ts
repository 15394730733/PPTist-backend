/**
 * Geometry conversion utilities for PPTX to PPTist conversion
 */

/**
 * EMU 到像素的标准转换比例（基于 96 DPI）
 * 1 英寸 = 914400 EMU
 * 1 英寸 = 96 像素（96 DPI）
 * 因此：1 EMU = 96/914400 像素 = 1/9525 像素
 */
const EMU_TO_PIXEL = 1 / 9525

/**
 * 将 EMU 单位转换为像素
 * @param emu EMU 值
 * @returns 像素值（四舍五入到整数）
 */
export function emuToPixel(emu: number): number {
  return Math.round(emu * EMU_TO_PIXEL)
}

/**
 * 从 ConversionContext 创建尺寸转换函数
 * 简化版本：直接使用标准 EMU 到像素转换，无需幻灯片尺寸参数
 */
export function createEmuConverters() {
  return {
    toPixelX: (emu: number) => emuToPixel(emu),
    toPixelY: (emu: number) => emuToPixel(emu),
  }
}
