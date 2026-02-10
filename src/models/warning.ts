/**
 * Conversion Warning Model
 */

export interface ConversionWarning {
  code: string;
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
}

// Legacy types for backward compatibility with tests
export type WarningSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WarningType =
  | 'UNSUPPORTED_ELEMENT'
  | 'DOWNGRADED'
  | 'MISSING_MEDIA'
  | 'MEMORY_WARNING'
  | 'MEMORY_CRITICAL'
  | 'MACRO_IGNORED'
  | 'ACTIVEX_IGNORED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'ENCRYPTED_FILE'
  | 'CORRUPTED_FILE';

// Legacy warning interface for tests
export interface LegacyConversionWarning {
  id: string;
  type: string;
  elementType?: string;
  elementId?: string;
  message: string;
  suggestion?: string;
  severity: WarningSeverity;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Create unsupported element warning (legacy factory function)
 */
export function createUnsupportedElementWarning(options: {
  elementType?: string;
  elementId?: string;
  message: string;
  suggestion?: string;
  severity?: WarningSeverity;
}): ConversionWarning {
  return {
    type: 'UNSUPPORTED_ELEMENT',
    code: 'UNSUPPORTED_ELEMENT',
    message: options.message,
    severity: mapLegacySeverity(options.severity || 'low'),
    context: {
      elementType: options.elementType,
      elementId: options.elementId,
      suggestion: options.suggestion,
    },
  };
}

/**
 * Create downgrade warning (legacy factory function)
 */
export function createDowngradeWarning(options: {
  feature?: string;
  reason?: string;
  message: string;
  suggestion?: string;
  severity?: WarningSeverity;
}): ConversionWarning {
  return {
    type: 'DOWNGRADED',
    code: 'DOWNGRADED',
    message: options.message,
    severity: mapLegacySeverity(options.severity || 'low'),
    context: {
      feature: options.feature,
      reason: options.reason,
      suggestion: options.suggestion,
    },
  };
}

/**
 * Create memory warning (legacy factory function)
 */
export function createMemoryWarning(options: {
  usagePercent?: number;
  strategy?: string;
  message: string;
  suggestion?: string;
  severity?: WarningSeverity;
}): ConversionWarning {
  return {
    type: 'MEMORY_WARNING',
    code: 'MEMORY_WARNING',
    message: options.message,
    severity: mapLegacySeverity(options.severity || 'low'),
    context: {
      usagePercent: options.usagePercent,
      strategy: options.strategy,
      suggestion: options.suggestion,
    },
  };
}

/**
 * Create critical memory warning (legacy factory function)
 */
export function createCriticalMemoryWarning(options: {
  usagePercent?: number;
  action?: string;
  message: string;
  suggestion?: string;
  severity?: WarningSeverity;
}): ConversionWarning {
  return {
    type: 'MEMORY_CRITICAL',
    code: 'MEMORY_CRITICAL',
    message: options.message,
    severity: mapLegacySeverity(options.severity || 'critical'),
    context: {
      usagePercent: options.usagePercent,
      action: options.action,
      suggestion: options.suggestion,
    },
  };
}

/**
 * Map legacy severity to new severity
 */
function mapLegacySeverity(severity: WarningSeverity): 'error' | 'warning' | 'info' {
  const severityMap: Record<WarningSeverity, 'error' | 'warning' | 'info'> = {
    low: 'info',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  };

  return severityMap[severity] || 'warning';
}

/**
 * Map new severity back to legacy severity
 */
export function mapToLegacySeverity(severity: 'error' | 'warning' | 'info'): WarningSeverity {
  const severityMap: Record<'error' | 'warning' | 'info', WarningSeverity> = {
    error: 'high',
    warning: 'medium',
    info: 'low',
  };

  return severityMap[severity] || 'medium';
}
