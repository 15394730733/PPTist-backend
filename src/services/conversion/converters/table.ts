/**
 * Table Element Converter
 *
 * Converts PPTX table elements to PPTist table elements.
 * Handles cell data, styling, and merging.
 *
 * @module services/conversion/converters/table
 */

import { BaseElementConverter } from '../base-converter';
import { ElementType, type ConversionContext } from '../../../types/converters';
import type { TableElement } from '../../../types/pptist';
import type { ParsedElement } from '../../../services/pptx/parser';
import { generateTrackedId, ID_PREFIXES } from '../../../utils/id-generator';
import { logger } from '../../../utils/logger';

/**
 * Table converter implementation
 */
export class TableConverter extends BaseElementConverter<ParsedElement, TableElement> {
  readonly type = ElementType.TABLE;
  readonly priority = 100;
  readonly supportedVersions = ['1.0.0', 'latest'];

  /**
   * Check if this converter can handle the element
   */
  async canConvert(element: ParsedElement): Promise<boolean> {
    return element.type === 'table';
  }

  /**
   * Convert PPTX table element to PPTist table element
   */
  async convert(element: ParsedElement, context: ConversionContext): Promise<TableElement | null> {
    logger.debug('Converting table element', {
      id: element.id,
      rowCount: element.rowCount,
      colCount: element.colCount,
    });

    const pptistElement: TableElement = {
      id: generateTrackedId(ID_PREFIXES.TABLE, undefined, element.id),
      type: 'table',
      x: element.position?.x || 0,
      y: element.position?.y || 0,
      width: element.size?.width || 400,
      height: element.size?.height || 300,
      rotate: element.rotation || 0,
      locked: element.locked || false,
      visible: !element.hidden,
      data: this.convertTableData(element),
      style: this.convertTableStyle(element),
    };

    // Convert effects
    if (element.effects) {
      this.convertEffects(element.effects, pptistElement);
    }

    // Convert fill (table background)
    if (element.fill) {
      pptistElement.fill = this.convertFill(element.fill);
    }

    // Convert outline (table border)
    if (element.stroke) {
      pptistElement.outline = this.convertStroke(element.stroke);
    }

    return pptistElement;
  }

  /**
   * Convert table data (cells)
   */
  private convertTableData(element: ParsedElement): string[][] {
    if (!element.rows) return [[]];

    return element.rows.map((row: any) => {
      if (!row.cells) return [];

      return row.cells.map((cell: any) => {
        return cell.text || '';
      });
    });
  }

  /**
   * Convert table style
   */
  private convertTableStyle(element: ParsedElement): any {
    const style: any = {
      theme: 'default',
    };

    if (element.style) {
      if (element.style.rowCount !== undefined) {
        style.rowCount = element.style.rowCount;
      }

      if (element.style.colCount !== undefined) {
        style.colCount = element.style.colCount;
      }

      // Table flags
      if (element.style.bandCol !== undefined) {
        style.bandCol = element.style.bandCol;
      }

      if (element.style.bandRow !== undefined) {
        style.bandRow = element.style.bandRow;
      }

      if (element.style.firstCol !== undefined) {
        style.firstCol = element.style.firstCol;
      }

      if (element.style.firstRow !== undefined) {
        style.firstRow = element.style.firstRow;
      }

      if (element.style.lastCol !== undefined) {
        style.lastCol = element.style.lastCol;
      }

      if (element.style.lastRow !== undefined) {
        style.lastRow = element.style.lastRow;
      }
    }

    return style;
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
   * Convert stroke
   */
  private convertStroke(stroke: any): any {
    if (!stroke) return undefined;

    const pptistStroke: any = {};

    if (stroke.width !== undefined) pptistStroke.width = stroke.width;
    if (stroke.color) pptistStroke.color = stroke.color;
    if (stroke.dashType) pptistStroke.style = stroke.dashType;

    return pptistStroke;
  }

  /**
   * Convert effects
   */
  private convertEffects(effects: any, pptistElement: TableElement): void {
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
 * Create table converter instance
 */
export function createTableConverter(): TableConverter {
  return new TableConverter();
}
