import type { FastifyInstance } from 'fastify'
import { conversionRoutes } from './routes/convert.js'
import { healthRoutes } from './routes/health.js'
import { uiRoutes } from './routes/ui.js'

// Import and register all converters
import { registerTextConverter } from './converters/text.js'
import { registerShapeConverter } from './converters/shape.js'
import { registerImageConverter } from './converters/image.js'
import { registerLineConverter } from './converters/line.js'
import { registerVideoConverter } from './converters/video.js'
import { registerAudioConverter } from './converters/audio.js'
import { registerTableConverter } from './converters/table.js'
import { registerChartConverter } from './converters/chart.js'
import { registerLatexConverter } from './converters/latex.js'
import { getLogger } from '../../utils/logger.js'

/**
 * Initialize all element converters
 */
function initializeConverters(): void {
  const logger = getLogger()

  registerTextConverter()
  registerShapeConverter()
  registerImageConverter()
  registerLineConverter()
  registerVideoConverter()
  registerAudioConverter()
  registerTableConverter()
  registerChartConverter()
  registerLatexConverter()

  logger.info('All element converters registered')
}

/**
 * Conversion module plugin
 */
export async function conversionModule(fastify: FastifyInstance): Promise<void> {
  // Initialize converters
  initializeConverters()

  // Register conversion routes
  await fastify.register(conversionRoutes, {
    prefix: '/api/v1',
  })

  // Register health check routes
  await fastify.register(healthRoutes, {
    prefix: '/api/v1',
  })

  // Register UI routes (served at root path)
  await fastify.register(uiRoutes)

  getLogger().info('Conversion module registered')
}

export default conversionModule
