import { z, ZodSchema, ZodError } from 'zod';
import logger from './logger.js';
import { recordError } from './metrics.js';

/**
 * Validate data against a Zod schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with data or error
 */
export function validate<T extends ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ZodError } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  } catch (error) {
    logger.error({ error }, 'Validation error');
    recordError('validation');
    return {
      success: false,
      error: new ZodError([
        {
          code: 'custom',
          path: [],
          message: 'Unknown validation error',
        },
      ]),
    };
  }
}

/**
 * Validate data and throw if invalid
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws ZodError if validation fails
 */
export function validateOrThrow<T extends ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = validate(schema, data);

  if (!result.success) {
    logger.warn(
      {
        errors: result.error.errors,
      },
      'Validation failed'
    );
    throw result.error;
  }

  return result.data;
}

/**
 * Format Zod error for API response
 * @param error - ZodError
 * @returns Formatted error message
 */
export function formatZodError(error: ZodError): string {
  return error.errors
    .map((e) => `${e.path.join('.')}: ${e.message}`)
    .join(', ');
}

/**
 * Create a validation middleware for Fastify
 */
export function createValidationMiddleware<T extends ZodSchema>(
  schema: T,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return async (request: any) => {
    const data = request[property];
    const result = validate(schema, data);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  };
}

export default {
  validate,
  validateOrThrow,
  formatZodError,
  createValidationMiddleware,
};
