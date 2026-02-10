/**
 * Validator Utility Unit Tests
 *
 * Tests for Zod validation utilities.
 *
 * @module tests/unit/utils/validator
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validate,
  validateOrThrow,
  formatZodError,
  createValidationMiddleware,
} from '../../../src/utils/validator';

describe('Validator Utility - Unit Tests', () => {
  describe('validate', () => {
    it('should return success for valid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = validate(schema, { name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('should return error for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = validate(schema, { name: 'John', age: 'thirty' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toHaveLength(1);
        expect(result.error.errors[0].path).toContain('age');
      }
    });

    it('should handle missing required fields', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      const result = validate(schema, { name: 'John' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle complex validation rules', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        age: z.number().min(18).max(120),
      });

      const invalidData = {
        email: 'not-an-email',
        password: 'short',
        age: 15,
      };

      const result = validate(schema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should handle null and undefined values', () => {
      const schema = z.object({
        value: z.string().nullable(),
      });

      const result1 = validate(schema, { value: null });
      expect(result1.success).toBe(true);

      const result2 = validate(schema, { value: undefined });
      expect(result2.success).toBe(false);
    });

    it('should handle array validation', () => {
      const schema = z.object({
        tags: z.array(z.string()).min(1).max(5),
      });

      const validResult = validate(schema, { tags: ['tag1', 'tag2'] });
      expect(validResult.success).toBe(true);

      const emptyResult = validate(schema, { tags: [] });
      expect(emptyResult.success).toBe(false);

      const tooManyResult = validate(schema, { tags: ['1', '2', '3', '4', '5', '6'] });
      expect(tooManyResult.success).toBe(false);
    });

    it('should handle enum validation', () => {
      const schema = z.object({
        status: z.enum(['pending', 'active', 'completed']),
      });

      const validResult = validate(schema, { status: 'active' });
      expect(validResult.success).toBe(true);

      const invalidResult = validate(schema, { status: 'cancelled' });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('should return data for valid input', () => {
      const schema = z.object({
        username: z.string().min(3),
      });

      const result = validateOrThrow(schema, { username: 'john123' });

      expect(result).toEqual({ username: 'john123' });
    });

    it('should throw ZodError for invalid input', () => {
      const schema = z.object({
        username: z.string().min(3),
      });

      expect(() => {
        validateOrThrow(schema, { username: 'jo' });
      }).toThrow(z.ZodError);
    });

    it('should include error details in thrown error', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      try {
        validateOrThrow(schema, { email: 'invalid-email' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        if (error instanceof z.ZodError) {
          expect(error.errors).toHaveLength(1);
          expect(error.errors[0].path).toContain('email');
        }
      }
    });
  });

  describe('formatZodError', () => {
    it('should format single error', () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = validate(schema, { name: 123 });

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('name');
        expect(formatted).toContain('Expected string');
      }
    });

    it('should format multiple errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      const result = validate(schema, { name: 123, age: 'thirty', email: 'invalid' });

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('name');
        expect(formatted).toContain('age');
        expect(formatted).toContain('email');
      }
    });

    it('should handle nested path errors', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            age: z.number(),
          }),
        }),
      });

      const result = validate(schema, { user: { profile: { age: 'thirty' } } });

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('user.profile.age');
      }
    });

    it('should handle array index errors', () => {
      const schema = z.object({
        items: z.array(z.number()),
      });

      const result = validate(schema, { items: [1, 2, 'three', 4] });

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('items.2');
      }
    });
  });

  describe('createValidationMiddleware', () => {
    it('should validate body by default', async () => {
      const schema = z.object({
        username: z.string(),
      });

      const middleware = createValidationMiddleware(schema);
      const request = {
        body: { username: 'john' },
      };

      const result = await middleware(request);
      expect(result).toEqual({ username: 'john' });
    });

    it('should validate query when specified', async () => {
      const schema = z.object({
        page: z.number(),
      });

      const middleware = createValidationMiddleware(schema, 'query');
      const request = {
        query: { page: 1 },
      };

      const result = await middleware(request);
      expect(result).toEqual({ page: 1 });
    });

    it('should validate params when specified', async () => {
      const schema = z.object({
        id: z.string(),
      });

      const middleware = createValidationMiddleware(schema, 'params');
      const request = {
        params: { id: '123' },
      };

      const result = await middleware(request);
      expect(result).toEqual({ id: '123' });
    });

    it('should throw for invalid data', async () => {
      const schema = z.object({
        username: z.string().min(3),
      });

      const middleware = createValidationMiddleware(schema);
      const request = {
        body: { username: 'jo' },
      };

      await expect(middleware(request)).rejects.toThrow(z.ZodError);
    });

    it('should handle complex schemas', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
          age: z.number().min(18),
        }),
        preferences: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean(),
        }),
      });

      const middleware = createValidationMiddleware(schema);
      const request = {
        body: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 25,
          },
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
      };

      const result = await middleware(request);
      expect(result.user.name).toBe('John Doe');
      expect(result.preferences.theme).toBe('dark');
    });
  });

  describe('real-world validation scenarios', () => {
    it('should validate file upload metadata', () => {
      const fileSchema = z.object({
        filename: z.string().min(1),
        mimetype: z.string().regex(/^application\/|image\//),
        size: z.number().positive().max(50 * 1024 * 1024), // 50MB max
      });

      const validFile = {
        filename: 'presentation.pptx',
        mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 1024 * 1024,
      };

      const result = validate(fileSchema, validFile);
      expect(result.success).toBe(true);
    });

    it('should validate task status', () => {
      const taskSchema = z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']),
        progress: z.number().min(0).max(100),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      });

      const validTask = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'processing',
        progress: 50,
        createdAt: '2026-01-26T12:00:00Z',
        updatedAt: '2026-01-26T12:05:00Z',
      };

      const result = validate(taskSchema, validTask);
      expect(result.success).toBe(true);
    });

    it('should validate conversion options', () => {
      const optionsSchema = z.object({
        extractNotes: z.boolean().default(true),
        extractAnimations: z.boolean().default(true),
        downgradeUnsupported: z.boolean().default(false),
        quality: z.enum(['low', 'medium', 'high']).default('medium'),
      });

      const options = {
        extractNotes: true,
        extractAnimations: false,
        quality: 'high',
      };

      const result = validate(optionsSchema, options);
      expect(result.success).toBe(true);
    });

    it('should validate batch request', () => {
      const batchSchema = z.object({
        files: z
          .array(
            z.object({
              filename: z.string(),
              size: z.number().positive(),
              mimetype: z.string(),
            })
          )
          .min(1)
          .max(10),
        options: z.object({
          concurrent: z.boolean().optional(),
          priority: z.number().min(1).max(10).optional(),
        }),
      });

      const validBatch = {
        files: [
          { filename: 'file1.pptx', size: 1024, mimetype: 'application/pptx' },
          { filename: 'file2.pptx', size: 2048, mimetype: 'application/pptx' },
        ],
        options: {
          concurrent: true,
          priority: 5,
        },
      };

      const result = validate(batchSchema, validBatch);
      expect(result.success).toBe(true);
    });
  });
});
