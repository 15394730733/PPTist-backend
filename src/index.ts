import { createApp } from './app.js'
import { getConfig } from './config/index.js'
import { getLogger } from './utils/logger.js'

async function main() {
  const config = getConfig()
  const logger = getLogger()

  try {
    const app = await createApp()

    // Start server
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    })

    logger.info(`Server listening on http://${config.HOST}:${config.PORT}`)
    logger.info(`Max file size: ${config.MAX_FILE_SIZE} bytes`)
    logger.info(`Rate limit: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW}ms`)

    // Graceful shutdown handlers
    const signals = ['SIGINT', 'SIGTERM'] as const
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`)
        try {
          await app.close()
          logger.info('Server closed')
          process.exit(0)
        } catch (err) {
          logger.error({ err }, 'Error during shutdown')
          process.exit(1)
        }
      })
    }
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    process.exit(1)
  }
}

main()
