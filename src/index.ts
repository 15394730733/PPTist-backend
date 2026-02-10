/**
 * Main Application Entry Point
 *
 * Starts the Fastify server and conversion worker.
 *
 * @module index
 */

import { createApp, startServer, shutdownServer } from './app.js';
import { registerV1Routes } from './api/v1/index.js';
import { createQueue } from './queue/factory.js';
import { createAndStartWorker } from './services/conversion/worker.js';
import { logger } from './utils/logger.js';
import { getDefaultResultsDir, getDefaultMediaDir } from './utils/paths.js';

/**
 * Main application class
 */
class Application {
  private worker: any = null;
  private queue: any = null;

  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting PPTX to JSON Conversion Service...');

      // Simple configuration (avoid config module issues)
      const port = 3000;
      const queueType = 'memory';

      // Create Fastify app
      const app = createApp();

      // Create task queue
      this.queue = createQueue();
      logger.info('Task queue created', { type: queueType });

      // Register API routes
      await app.register(async (fastify) => {
        fastify.register(registerV1Routes, this.queue);
      }, { prefix: '/api/v1' });

      // Start conversion worker
      this.worker = await createAndStartWorker({
        queue: this.queue,
        resultsDir: getDefaultResultsDir(),
        mediaDir: getDefaultMediaDir(),
        workerId: 'worker-1',
      });

      logger.info('Conversion worker started');

      // Start server
      await startServer(app, port);

      logger.info('Application started successfully');
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? (error as any).cause : undefined,
      });
      console.error('Detailed error:', error);
      throw error;
    }
  }

  /**
   * Stop the application
   */
  async stop(): Promise<void> {
    logger.info('Stopping application...');

    try {
      // Stop worker
      if (this.worker) {
        await this.worker.stop();
        logger.info('Worker stopped');
      }

      // Note: Fastify server shutdown is handled by signals
      logger.info('Application stopped');
    } catch (error) {
      logger.error('Error during application shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Start application if this file is run directly
 */
// Normalize path for cross-platform compatibility
const modulePath = process.argv[1].replace(/\\/g, '/');
if (import.meta.url === `file:///${modulePath}`) {
  const app = new Application();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await app.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
      reason,
      promise,
    });
    process.exit(1);
  });

  // Start application
  app.start().catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
}

export { Application };
export default Application;
