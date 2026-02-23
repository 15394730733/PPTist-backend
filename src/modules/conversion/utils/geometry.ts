/**
 * Geometry conversion utilities for PPTX to PPTist conversion
 */

// 目标画布尺寸（16:9）
export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720

/**
 * 将 EMU 单位转换为像素（X 轴）
 * @param emu EMU 值
 * @param slideWidth 实际幻灯片宽度（EMU）
 */
export function emuToPixelX(emu: number, slideWidth: number): number {
  return Math.round((emu / slideWidth) * CANVAS_WIDTH)
}

/**
 * 将 EMU 单位转换为像素（Y 轴）
 * @param emu EMU 值
 * @param slideHeight 实际幻灯片高度（EMU）
 */
export function emuToPixelY(emu: number, slideHeight: number): number {
  return Math.round((emu / slideHeight) * CANVAS_HEIGHT)
}

/**
 * 从 ConversionContext 创建尺寸转换函数
 */
export function createEmuConverters(slideSize: { width: number; height: number }) {
  return {
    toPixelX: (emu: number) => emuToPixelX(emu, slideSize.width),
    toPixelY: (emu: number) => emuToPixelY(emu, slideSize.height),
  }
}
