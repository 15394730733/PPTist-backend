/**
 * Conversion Result Serializer
 *
 * Serializes PPTist presentation, metadata, and warnings to final JSON format.
 *
 * @module services/conversion/serializer
 */

import type { PPTistPresentation } from '../../types/pptist';
import type { ConversionMetadata } from '../../models/metadata';
import type { ConversionWarning } from '../../models/warning';

/**
 * Serialized conversion result
 */
export interface SerializedResult {
  version: string;
  presentation: PPTistPresentation;
  metadata: ConversionMetadata;
  warnings?: ConversionWarning[];
  createdAt: string;
}

/**
 * Serialize conversion result to JSON-serializable format
 *
 * @param presentation - PPTist presentation
 * @param metadata - Conversion metadata
 * @param warnings - Conversion warnings
 * @returns Serialized result
 */
export function serializeResult(
  presentation: PPTistPresentation,
  metadata: ConversionMetadata,
  warnings?: ConversionWarning[]
): SerializedResult {
  return {
    version: '1.0.0',
    presentation,
    metadata,
    warnings: warnings || [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Deserialize conversion result from JSON
 *
 * @param json - JSON string or object
 * @returns Deserialized result
 */
export function deserializeResult(json: string | object): SerializedResult {
  const data = typeof json === 'string' ? JSON.parse(json) : json;

  return {
    version: data.version || '1.0.0',
    presentation: data.presentation,
    metadata: data.metadata,
    warnings: data.warnings || [],
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * Validate serialized result structure
 *
 * @param result - Result to validate
 * @returns true if valid
 */
export function validateSerializedResult(result: any): boolean {
  if (!result || typeof result !== 'object') {
    return false;
  }

  // Check required fields
  if (!result.presentation || typeof result.presentation !== 'object') {
    return false;
  }

  if (!result.metadata || typeof result.metadata !== 'object') {
    return false;
  }

  // Check presentation structure
  if (
    typeof result.presentation.width !== 'number' ||
    typeof result.presentation.height !== 'number' ||
    !Array.isArray(result.presentation.slides)
  ) {
    return false;
  }

  return true;
}
