/**
 * Common entity schemas and models
 */

import { z } from 'zod';

/**
 * PPTX file metadata schema
 */
export const PPTXFileMetadataSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(104857600), // Max 100MB
  mimeType: z.string().default('application/vnd.openxmlformats-officedocument.presentationml.presentation'),
  sha256: z.string().optional(),
  uploadedAt: z.date(),
});

/**
 * Media resource schema
 */
export const MediaResourceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['image', 'audio', 'video']),
  originalName: z.string(),
  extractedPath: z.string(), // Local path after extraction
  relativePath: z.string(), // Path within PPTX (e.g., "media/image1.png")
  mimeType: z.string(),
  size: z.number().int().positive(),
  width: z.number().int().positive().optional(), // For images/videos
  height: z.number().int().positive().optional(), // For images/videos
  duration: z.number().nonnegative().optional(), // For audio/videos (seconds)
  extractedAt: z.date(),
});

/**
 * Processing options schema
 */
export const ProcessingOptionsSchema = z.object({
  pptistVersion: z.string().optional().default('latest'),
  extractMedia: z.boolean().optional().default(true),
  includeStyles: z.boolean().optional().default(true),
  includeAnimations: z.boolean().optional().default(false),
  strictMode: z.boolean().optional().default(false),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
  timeout: z.number().nonnegative().optional().default(300000), // 5 minutes default
});

/**
 * API response wrapper schema
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z
    .object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    })
    .optional(),
  metadata: z
    .object({
      timestamp: z.date().optional(),
      requestId: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  total: z.number().int().min(0).optional(),
  pages: z.number().int().min(0).optional(),
});

/**
 * Paginated response schema
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: PaginationSchema,
  });

// Type exports
export type PPTXFileMetadata = z.infer<typeof PPTXFileMetadataSchema>;
export type MediaResource = z.infer<typeof MediaResourceSchema>;
export type ProcessingOptions = z.infer<typeof ProcessingOptionsSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Media resource model
 */
export class MediaResourceModel {
  constructor(
    public id: string,
    public type: 'image' | 'audio' | 'video',
    public originalName: string,
    public extractedPath: string,
    public relativePath: string,
    public mimeType: string,
    public size: number,
    public extractedAt: Date,
    public width?: number,
    public height?: number,
    public duration?: number
  ) {}

  /**
   * Create from file metadata
   */
  static create(
    relativePath: string,
    extractedPath: string,
    mimeType: string,
    size: number,
    dimensions?: { width?: number; height?: number; duration?: number }
  ): MediaResourceModel {
    const type = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/')
        ? 'audio'
        : mimeType.startsWith('video/')
          ? 'video'
          : 'image'; // Default to image for unknown types

    const originalName = relativePath.split('/').pop() || relativePath;

    return new MediaResourceModel(
      crypto.randomUUID(),
      type,
      originalName,
      extractedPath,
      relativePath,
      mimeType,
      size,
      new Date(),
      dimensions?.width,
      dimensions?.height,
      dimensions?.duration
    );
  }

  /**
   * Check if this is an image resource
   */
  isImage(): boolean {
    return this.type === 'image';
  }

  /**
   * Check if this is an audio resource
   */
  isAudio(): boolean {
    return this.type === 'audio';
  }

  /**
   * Check if this is a video resource
   */
  isVideo(): boolean {
    return this.type === 'video';
  }

  /**
   * Get file extension
   */
  getExtension(): string {
    return this.originalName.split('.').pop() || '';
  }

  /**
   * Convert to plain object
   */
  toObject(): MediaResource {
    return {
      id: this.id,
      type: this.type,
      originalName: this.originalName,
      extractedPath: this.extractedPath,
      relativePath: this.relativePath,
      mimeType: this.mimeType,
      size: this.size,
      width: this.width,
      height: this.height,
      duration: this.duration,
      extractedAt: this.extractedAt,
    };
  }
}

export default {
  PPTXFileMetadataSchema,
  MediaResourceSchema,
  ProcessingOptionsSchema,
  ApiResponseSchema,
  PaginationSchema,
  PaginatedResponseSchema,
  MediaResourceModel,
};
