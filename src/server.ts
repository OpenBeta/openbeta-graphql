import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import express from 'express'
import cors from 'cors'
import * as http from 'http'
import bodyParser from 'body-parser'
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache'

import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers.js'
import MutableAreaDataSource from './model/MutableAreaDataSource.js'
import ChangeLogDataSource from './model/ChangeLogDataSource.js'
import MutableMediaDataSource from './model/MutableMediaDataSource.js'
import MutableClimbDataSource from './model/MutableClimbDataSource.js'
import TickDataSource from './model/TickDataSource.js'
import permissions from './auth/permissions.js'
import { createContext } from './auth/middleware.js'
import { localDevBypassAuthContext } from './auth/local-dev/middleware.js'
import localDevBypassAuthPermissions from './auth/local-dev/permissions.js'
import MutableOrgDS from './model/MutableOrganizationDataSource.js'
import UserDataSource from './model/UserDataSource.js'
import BulkImportDataSource from './model/BulkImportDataSource.js'
import { errorMonitor } from './utils/ErrorMonitor.js'

/**
 * Create a GraphQL server
 */
export async function createServer (): Promise<{ app: express.Application, server: ApolloServer }> {
  const schema = applyMiddleware(
    graphqlSchema,
    (process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthPermissions : permissions).generate(graphqlSchema)
  )
  const dataSources = ({
    climbs: MutableClimbDataSource.getInstance(),
    areas: MutableAreaDataSource.getInstance(),
    bulkImport: BulkImportDataSource.getInstance(),
    organizations: MutableOrgDS.getInstance(),
    ticks: TickDataSource.getInstance(),
    history: ChangeLogDataSource.getInstance(),
    media: MutableMediaDataSource.getInstance(),
    users: UserDataSource.getInstance()
  })

  const app = express()
  const httpServer = http.createServer(app)

  const server = new ApolloServer({
    introspection: true,
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    cache: new InMemoryLRUCache({
      max: 100,
      maxSize: 1024 * 1024 * 20, // Increased cache size
      ttl: 300000 // 5 minutes TTL to prevent memory leaks
    }),
    // Enhanced error handling
    formatError: (formattedError, _error) => {
      // Log the error with enhanced monitoring
      errorMonitor.logGraphQLError(formattedError, undefined, undefined)

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        // Remove stack trace and internal details
        if (formattedError.extensions?.exception != null) {
          delete (formattedError.extensions.exception as any).stacktrace
        }
        if (formattedError.message.includes('internal') ||
            formattedError.message.includes('database')) {
          return new Error('Internal server error')
        }
      }

      return formattedError
    }
  })
  // server must be started before applying middleware
  await server.start()

  const context = process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthContext : createContext

  // Enhanced health check with memory monitoring
  app.get('/health', (req, res) => {
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Check if memory usage is getting too high
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100

    const status = memoryUsagePercent > 85 ? 'warning' : 'ok'

    res.json({
      status,
      timestamp: new Date().toISOString(),
      uptime: `${Math.round(uptime / 60)} minutes`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${heapTotalMB}MB`,
        heapUsed: `${heapUsedMB}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        usagePercent: `${Math.round(memoryUsagePercent)}%`
      },
      warnings: memoryUsagePercent > 85 ? ['High memory usage detected'] : []
    })

    // Log warning if memory usage is high
    if (memoryUsagePercent > 85) {
      console.warn(`High memory usage: ${Math.round(memoryUsagePercent)}% (${heapUsedMB}MB/${heapTotalMB}MB)`)
    }
  })

  // Periodic memory cleanup and monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100

    // Force garbage collection if memory usage is high and gc is available
    if (memoryUsagePercent > 80 && global.gc != null) {
      console.log('Running garbage collection due to high memory usage')
      global.gc()
    }

    // Log memory stats every 5 minutes
    console.log(`Memory usage: ${heapUsedMB}MB/${heapTotalMB}MB (${Math.round(memoryUsagePercent)}%)`)
  }, 5 * 60 * 1000) // Every 5 minutes

  // Error monitoring endpoint
  app.get('/errors', (req, res) => {
    const stats = errorMonitor.getStats()
    const healthStatus = errorMonitor.getHealthStatus()

    res.json({
      healthStatus,
      totalErrors: stats.totalErrors,
      errorsByType: Object.fromEntries(stats.errorsByType),
      recentErrors: stats.recentErrors.slice(-10), // Last 10 errors
      lastReset: stats.lastReset
    })
  })

  app.use('/',
    bodyParser.json({ limit: '5mb' }),
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ dataSources, ...await context({ req }) })
    })
  )

  await new Promise<void>(resolve => httpServer.listen({ port: 4000 }, resolve))
  return { app, server }
}
