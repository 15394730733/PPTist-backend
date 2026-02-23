import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { getConfig } from '../../../config/index.js'
import { getLogger } from '../../../utils/logger.js'
import { Errors, ConversionError } from '../../../utils/errors.js'
import { parsePPTX } from '../services/parser.js'
import {
  convertSlides,
  createConversionContext,
  processMedia,
} from '../services/converter.js'
import { serializePresentation } from '../services/serializer.js'
import { validateNotPasswordProtected } from '../detectors/password.js'
import { formatResponse, getOutputFormat } from '../services/response.js'

const logger = getLogger()

// PPTX magic bytes (ZIP format starts with 'PK')
const PPTX_MAGIC_BYTES = [0x50, 0x4b] // 'PK'

/**
 * Validate file magic bytes for PPTX (ZIP format)
 */
function validateMagicBytes(buffer: Buffer): void {
  if (buffer.length < 2) {
    throw Errors.corruptedFile()
  }

  // Check ZIP magic bytes (PPTX is a ZIP file)
  if (buffer[0] !== PPTX_MAGIC_BYTES[0] || buffer[1] !== PPTX_MAGIC_BYTES[1]) {
    throw Errors.invalidFormat('File is not a valid PPTX (invalid format)')
  }
}

/**
 * Validate file size
 */
function validateFileSize(size: number, maxSize: number): void {
  if (size === 0) {
    throw Errors.emptyFile()
  }
  if (size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    throw Errors.fileTooLarge(`${maxMB}MB`)
  }
}

/**
 * Validate file extension
 */
function validateExtension(filename: string): void {
  const ext = filename.toLowerCase().split('.').pop()
  if (ext !== 'pptx') {
    throw Errors.invalidFormat('File must be a .pptx file')
  }
}

interface ConvertRequest {
  Body: FormData
  Querystring: {
    format?: string
  }
}

/**
 * Register conversion routes
 */
export async function conversionRoutes(fastify: FastifyInstance): Promise<void> {
  const config = getConfig()

  fastify.post('/convert', async (request: FastifyRequest<ConvertRequest>, reply: FastifyReply) => {
    const requestId = uuidv4()
    const startTime = Date.now()
    const formatParam = request.query.format

    // Get output format from query parameter or config default
    const format = getOutputFormat(formatParam)

    logger.info({ requestId, format }, 'Starting conversion request')

    try {
      // Get uploaded file
      const data = await request.file()

      if (!data) {
        throw Errors.invalidFormat('No file uploaded')
      }

      const filename = data.filename || ''

      // Validate extension
      validateExtension(filename)

      // Read file buffer
      const buffer = await data.toBuffer()

      // Validate file size
      validateFileSize(buffer.length, config.MAX_FILE_SIZE)

      // Validate magic bytes
      validateMagicBytes(buffer)

      // Validate content type (warning only)
      const contentType = data.mimetype || ''
      if (
        !contentType.includes('presentation') &&
        !contentType.includes('application/vnd.openxmlformats') &&
        !contentType.includes('application/zip')
      ) {
        logger.warn({ requestId, contentType }, 'Unexpected content type')
      }

      logger.info(
        { requestId, fileSize: buffer.length, filename, format },
        'File received, starting validation'
      )

      // Check for password protection
      await validateNotPasswordProtected(buffer)

      logger.info({ requestId, format }, 'File validated, starting parsing')

      // Parse PPTX
      const presentation = await parsePPTX(buffer)

      if (presentation.slides.length === 0) {
        throw Errors.emptyFile()
      }

      // Create conversion context with slideSize
      const context = createConversionContext(requestId, presentation.slideSize)

      logger.info(
        { requestId, slideCount: presentation.slides.length },
        'PPTX parsed successfully'
      )

      // Process media
      processMedia(presentation, context)

      // Convert slides
      const slides = convertSlides(presentation, context)

      logger.info({ requestId, convertedSlides: slides.length }, 'Slides converted')

      // Serialize to PPTist format
      const pptistData = serializePresentation(slides, context)

      const duration = Date.now() - startTime
      logger.info({ requestId, duration, format }, 'Conversion completed')

      // Format and send response based on requested format
      formatResponse(pptistData, format, reply)
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error({ requestId, duration, error }, 'Conversion failed')

      if (error instanceof ConversionError) {
        const response = error.toJSON()
        return reply.status(error.getStatusCode()).send(response)
      }

      // Unknown error
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ERR_CONVERSION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          suggestion: 'Please try again or contact support',
        },
      })
    }
  })
}
