/**
 * Warning Collector
 *
 * Collects and manages warnings from the conversion process.
 *
 * @module services/conversion/warnings
 */

import type { ConversionWarning } from '../../models/warning';
import type { ExtractedPPTX } from '../pptx/unzip';
import type { ValidationError } from '../pptx/validator';
import { logger } from '../../utils/logger';

/**
 * Warning types
 */
export enum WarningType {
  UNSUPPORTED_ELEMENT = 'unsupported_element',
  DOWNGRADED_FEATURE = 'downgraded_feature',
  MISSING_MEDIA = 'missing_media',
  EXTERNAL_MEDIA = 'external_media',
  ENCRYPTED_CONTENT = 'encrypted_content',
  MACROS_IGNORED = 'macros_ignored',
  FORMAT_LOSS = 'format_loss',
  VERSION_MISMATCH = 'version_mismatch',
}

/**
 * Collect warnings from extraction and validation
 *
 * @param extracted - Extracted PPTX structure
 * @param validationWarnings - Validation warnings
 * @returns Conversion warnings
 */
export function collectWarnings(
  extracted: ExtractedPPTX,
  validationWarnings?: ValidationError[]
): ConversionWarning[] {
  const warnings: ConversionWarning[] = [];

  // Add validation warnings
  if (validationWarnings) {
    for (const vw of validationWarnings) {
      warnings.push({
        code: vw.code,
        type: WarningType.DOWNGRADED_FEATURE,
        message: vw.message,
        severity: 'warning',
        context: vw.context,
      });
    }
  }

  // Add encryption warning
  if (extracted.metadata.hasEncrypted) {
    warnings.push({
      code: 'ENCRYPTED_CONTENT',
      type: WarningType.ENCRYPTED_CONTENT,
      message: 'PPTX contains encrypted content that could not be processed',
      severity: 'error',
      context: {
        hasEncrypted: true,
      },
    });
  }

  // Add macros warning
  if (extracted.metadata.hasMacros) {
    warnings.push({
      code: 'MACROS_IGNORED',
      type: WarningType.MACROS_IGNORED,
      message: 'PPTX contains VBA macros which have been ignored during conversion',
      severity: 'info',
      context: {
        hasMacros: true,
      },
    });
  }

  // Add media warnings
  if (extracted.metadata.totalMedia > 0) {
    // Check for externally linked media (placeholder)
    const hasExternalMedia = Array.from(extracted.media.keys()).some((filename) =>
      filename.startsWith('http')
    );

    if (hasExternalMedia) {
      warnings.push({
        code: 'EXTERNAL_MEDIA',
        type: WarningType.EXTERNAL_MEDIA,
        message: 'PPTX contains externally linked media files that could not be embedded',
        severity: 'warning',
        context: {
          externalMediaCount: Array.from(extracted.media.keys()).filter((f) => f.startsWith('http')).length,
        },
      });
    }
  }

  // Add statistics
  logger.info('Warnings collected', {
    totalWarnings: warnings.length,
    errorCount: warnings.filter((w) => w.severity === 'error').length,
    warningCount: warnings.filter((w) => w.severity === 'warning').length,
    infoCount: warnings.filter((w) => w.severity === 'info').length,
  });

  return warnings;
}

/**
 * Create warning for unsupported element
 *
 * @param elementType - Element type
 * @param elementId - Element ID
 * @returns Conversion warning
 */
export function createUnsupportedElementWarning(
  elementType: string,
  elementId: string
): ConversionWarning {
  return {
    code: 'UNSUPPORTED_ELEMENT',
    type: WarningType.UNSUPPORTED_ELEMENT,
    message: `Element type "${elementType}" is not supported and has been ignored`,
    severity: 'warning',
    context: {
      elementType,
      elementId,
    },
  };
}

/**
 * Create warning for downgraded feature
 *
 * @param feature - Feature name
 * @param reason - Reason for downgrade
 * @returns Conversion warning
 */
export function createDowngradedFeatureWarning(
  feature: string,
  reason: string
): ConversionWarning {
  return {
    code: 'DOWNGRADED_FEATURE',
    type: WarningType.DOWNGRADED_FEATURE,
    message: `Feature "${feature}" has been downgraded: ${reason}`,
    severity: 'info',
    context: {
      feature,
      reason,
    },
  };
}

/**
 * Create warning for missing media
 *
 * @param mediaRef - Media reference
 * @returns Conversion warning
 */
export function createMissingMediaWarning(mediaRef: string): ConversionWarning {
  return {
    code: 'MISSING_MEDIA',
    type: WarningType.MISSING_MEDIA,
    message: `Media file could not be found: ${mediaRef}`,
    severity: 'error',
    context: {
      mediaRef,
    },
  };
}

/**
 * Filter warnings by severity
 *
 * @param warnings - All warnings
 * @param severity - Severity level
 * @returns Filtered warnings
 */
export function filterWarningsBySeverity(
  warnings: ConversionWarning[],
  severity: 'error' | 'warning' | 'info'
): ConversionWarning[] {
  return warnings.filter((w) => w.severity === severity);
}

/**
 * Format warnings for display
 *
 * @param warnings - Warnings to format
 * @returns Formatted warning strings
 */
export function formatWarnings(warnings: ConversionWarning[]): string[] {
  return warnings.map((w) => {
    const prefix = w.severity.toUpperCase();
    return `[${prefix}] ${w.message}`;
  });
}
