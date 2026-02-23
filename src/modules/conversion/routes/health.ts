import type { FastifyInstance } from 'fastify'

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks?: {
    memory: boolean
  }
}

/**
 * Check memory usage
 */
function checkMemory(): boolean {
  const used = process.memoryUsage()
  const heapUsedMB = used.heapUsed / 1024 / 1024
  // Consider unhealthy if heap usage > 500MB
  return heapUsedMB < 500
}

/**
 * Register health check routes
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now()

  fastify.get('/health', async (): Promise<HealthResponse> => {
    const memoryOk = checkMemory()
    const uptime = Math.floor((Date.now() - startTime) / 1000)

    return {
      status: memoryOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime,
      checks: {
        memory: memoryOk,
      },
    }
  })

  // Readiness probe for Kubernetes
  fastify.get('/ready', async () => {
    return { ready: true }
  })

  // Liveness probe for Kubernetes
  fastify.get('/live', async () => {
    return { alive: true }
  })
}

export default healthRoutes
