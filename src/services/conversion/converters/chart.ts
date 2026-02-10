/**
 * Chart Element Converter
 *
 * Converts PPTX chart elements to PPTist chart elements.
 * Extracts chart data, labels, and formatting.
 *
 * @module services/conversion/converters/chart
 */

import { BaseElementConverter } from '../base-converter';
import { ElementType, type ConversionContext } from '../../../types/converters';
import type { ChartElement } from '../../../types/pptist';
import type { ParsedElement } from '../../../services/pptx/parser';
import { generateTrackedId, ID_PREFIXES } from '../../../utils/id-generator';
import { logger } from '../../../utils/logger';

/**
 * Chart converter implementation
 */
export class ChartConverter extends BaseElementConverter<ParsedElement, ChartElement> {
  readonly type = ElementType.CHART;
  readonly priority = 100;
  readonly supportedVersions = ['1.0.0', 'latest'];

  /**
   * Check if this converter can handle the element
   */
  async canConvert(element: ParsedElement): Promise<boolean> {
    return element.type === 'chart';
  }

  /**
   * Convert PPTX chart element to PPTist chart element
   */
  async convert(element: ParsedElement, context: ConversionContext): Promise<ChartElement | null> {
    logger.debug('Converting chart element', {
      id: element.id,
      chartRef: element.chartRef,
    });

    const pptistElement: ChartElement = {
      id: generateTrackedId(ID_PREFIXES.CHART, undefined, element.id),
      type: 'chart',
      x: element.position?.x || 0,
      y: element.position?.y || 0,
      width: element.size?.width || 400,
      height: element.size?.height || 300,
      rotate: element.rotation || 0,
      locked: element.locked || false,
      visible: !element.hidden,
      chartType: 'bar', // Default chart type
      data: this.extractChartData(element),
      options: this.extractChartOptions(element),
    };

    // Convert theme colors
    if (element.fill) {
      pptistElement.fill = this.convertFill(element.fill);
    }

    // Convert effects
    if (element.effects) {
      this.convertEffects(element.effects, pptistElement);
    }

    return pptistElement;
  }

  /**
   * Extract chart data (placeholder implementation)
   * In production, this would parse the embedded chart data
   */
  private extractChartData(element: ParsedElement): any {
    // This is a simplified implementation
    // In production, you would parse the chart XML data
    return {
      labels: [],
      series: [],
    };
  }

  /**
   * Extract chart options (placeholder implementation)
   * In production, this would parse the chart formatting options
   */
  private extractChartOptions(element: ParsedElement): any {
    // This is a simplified implementation
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: false,
        },
      },
    };
  }

  /**
   * Convert fill
   */
  private convertFill(fill: any): any {
    if (!fill) return undefined;

    if (fill.type === 'solid' && fill.color) {
      return {
        type: 'solid',
        color: fill.color,
      };
    }

    if (fill.type === 'gradient' && fill.colors) {
      return {
        type: 'gradient',
        colors: fill.colors,
      };
    }

    return undefined;
  }

  /**
   * Convert effects
   */
  private convertEffects(effects: any, pptistElement: ChartElement): void {
    if (effects.shadow) {
      pptistElement.shadow = this.convertShadow(effects.shadow);
    }

    if (effects.glow) {
      pptistElement.glow = this.convertGlow(effects.glow);
    }
  }

  /**
   * Convert shadow effect
   */
  private convertShadow(shadow: any): any {
    const pptistShadow: any = {};

    if (shadow.color) pptistShadow.color = shadow.color;
    if (shadow.offset !== undefined) pptistShadow.offset = shadow.offset;
    if (shadow.blur !== undefined) pptistShadow.blur = shadow.blur;
    if (shadow.angle !== undefined) pptistShadow.angle = shadow.angle;
    if (shadow.opacity !== undefined) pptistShadow.opacity = shadow.opacity;

    return pptistShadow;
  }

  /**
   * Convert glow effect
   */
  private convertGlow(glow: any): any {
    const pptistGlow: any = {};

    if (glow.color) pptistGlow.color = glow.color;
    if (glow.radius !== undefined) pptistGlow.radius = glow.radius;

    return pptistGlow;
  }
}

/**
 * Create chart converter instance
 */
export function createChartConverter(): ChartConverter {
  return new ChartConverter();
}
