import { z } from 'zod';
import { PPTistPresentation } from '../types/pptist';

/**
 * Result status enum
 */
export enum ResultStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial', // Some elements converted, some failed
}

/**
 * Conversion statistics schema
 */
export const ConversionStatsSchema = z.object({
  totalElements: z.number().int().min(0),
  convertedElements: z.number().int().min(0),
  skippedElements: z.number().int().min(0),
  failedElements: z.number().int().min(0),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  duration: z.number().nonnegative(), // milliseconds
});

/**
 * Conversion result schema
 */
export const ConversionResultSchema = z.object({
  taskId: z.string().uuid(),
  status: z.nativeEnum(ResultStatus),
  json: z.any(), // PPTistPresentation (any to avoid circular dependency)
  jsonPath: z.string().optional(), // Path to saved JSON file
  zipPath: z.string().optional(), // Path to saved ZIP file (with media)
  stats: ConversionStatsSchema,
  createdAt: z.date(),
  expiresAt: z.date(),
});

/**
 * Result metadata schema
 */
export const ResultMetadataSchema = z.object({
  taskId: z.string().uuid(),
  fileName: z.string(),
  fileSize: z.number().int().positive(),
  pptistVersion: z.string(),
  convertedAt: z.date(),
  conversionDuration: z.number().nonnegative(),
  elementCount: z.number().int().min(0),
  mediaCount: z.number().int().min(0),
  warningCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
});

/**
 * Preview data schema (subset of result for quick preview)
 */
export const PreviewDataSchema = z.object({
  taskId: z.string().uuid(),
  status: z.nativeEnum(ResultStatus),
  fileName: z.string(),
  slideCount: z.number().int().min(0),
  elementCount: z.number().int().min(0),
  mediaCount: z.number().int().min(0),
  pptistVersion: z.string(),
  stats: ConversionStatsSchema.partial(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  createdAt: z.date(),
});

// Type exports
export type ConversionStats = z.infer<typeof ConversionStatsSchema>;
export type ConversionResult = z.infer<typeof ConversionResultSchema>;
export type ResultMetadata = z.infer<typeof ResultMetadataSchema>;
export type PreviewData = z.infer<typeof PreviewDataSchema>;

/**
 * Conversion result model class
 */
export class ConversionResultModel {
  constructor(
    public taskId: string,
    public status: ResultStatus,
    public json: PPTistPresentation | null,
    public jsonPath: string | undefined,
    public zipPath: string | undefined,
    public stats: ConversionStats,
    public createdAt: Date,
    public expiresAt: Date
  ) {}

  /**
   * Create a successful result
   */
  static createSuccess(
    taskId: string,
    json: PPTistPresentation,
    jsonPath: string,
    zipPath: string,
    stats: ConversionStats,
    ttlHours: number = 24
  ): ConversionResultModel {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    return new ConversionResultModel(
      taskId,
      ResultStatus.SUCCESS,
      json,
      jsonPath,
      zipPath,
      stats,
      now,
      expiresAt
    );
  }

  /**
   * Create a failed result
   */
  static createFailure(
    taskId: string,
    error: Error,
    duration: number,
    ttlHours: number = 24
  ): ConversionResultModel {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const stats: ConversionStats = {
      totalElements: 0,
      convertedElements: 0,
      skippedElements: 0,
      failedElements: 0,
      warnings: [],
      errors: [error.message],
      duration,
    };

    return new ConversionResultModel(
      taskId,
      ResultStatus.FAILURE,
      null,
      undefined,
      undefined,
      stats,
      now,
      expiresAt
    );
  }

  /**
   * Create a partial result (some elements failed)
   */
  static createPartial(
    taskId: string,
    json: PPTistPresentation,
    jsonPath: string,
    zipPath: string,
    stats: ConversionStats,
    ttlHours: number = 24
  ): ConversionResultModel {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    return new ConversionResultModel(
      taskId,
      ResultStatus.PARTIAL,
      json,
      jsonPath,
      zipPath,
      stats,
      now,
      expiresAt
    );
  }

  /**
   * Check if result is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if result has JSON file
   */
  hasJsonFile(): boolean {
    return !!this.jsonPath;
  }

  /**
   * Check if result has ZIP file
   */
  hasZipFile(): boolean {
    return !!this.zipPath;
  }

  /**
   * Get metadata for preview
   */
  getMetadata(fileName: string, pptistVersion: string): ResultMetadata {
    const slideCount = this.json?.slides.length || 0;
    const elementCount = this.stats.totalElements;
    const mediaCount = this.json?.slides.reduce((count, slide) => {
      return (
        count +
        slide.elements.filter((e) => ['image', 'video', 'audio'].includes(e.type)).length
      );
    }, 0) || 0;

    return {
      taskId: this.taskId,
      fileName,
      fileSize: this.stats.totalElements, // Approximation
      pptistVersion,
      convertedAt: this.createdAt,
      conversionDuration: this.stats.duration,
      elementCount,
      mediaCount,
      warningCount: this.stats.warnings.length,
      errorCount: this.stats.errors.length,
    };
  }

  /**
   * Get preview data
   */
  getPreview(fileName: string, pptistVersion: string): PreviewData {
    const metadata = this.getMetadata(fileName, pptistVersion);

    return {
      taskId: this.taskId,
      status: this.status,
      fileName,
      slideCount: this.json?.slides.length || 0,
      elementCount: metadata.elementCount,
      mediaCount: metadata.mediaCount,
      pptistVersion,
      stats: this.stats,
      warnings: this.stats.warnings.length > 0 ? this.stats.warnings : undefined,
      errors: this.stats.errors.length > 0 ? this.stats.errors : undefined,
      createdAt: this.createdAt,
    };
  }

  /**
   * Convert to plain object
   */
  toObject(): ConversionResult {
    return {
      taskId: this.taskId,
      status: this.status,
      json: this.json,
      jsonPath: this.jsonPath,
      zipPath: this.zipPath,
      stats: this.stats,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }
}

export default {
  ResultStatus,
  ConversionStatsSchema,
  ConversionResultSchema,
  ResultMetadataSchema,
  PreviewDataSchema,
  ConversionResultModel,
};
