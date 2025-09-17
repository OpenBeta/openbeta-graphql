import { connectDB, defaultPostConnect } from './db/index.js'
import { createServer } from './server.js'
import { errorMonitor, setupGlobalErrorHandlers } from './utils/ErrorMonitor.js'

// Setup enhanced error monitoring
setupGlobalErrorHandlers()

// Enhanced error handling with graceful shutdown
let isShuttingDown = false

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  errorMonitor.logError(error, 'UNCAUGHT_EXCEPTION')

  if (!isShuttingDown) {
    isShuttingDown = true
    // Give some time for cleanup before exiting
    setTimeout(() => {
      console.log('Final error stats:', errorMonitor.getStats())
      process.exit(1)
    }, 5000)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  const error = reason instanceof Error ? reason : new Error(String(reason))
  errorMonitor.logError(error, 'UNHANDLED_REJECTION', { promise })

  // Don't exit immediately on unhandled rejections in production
  // Log the error and continue running
  if (process.env.NODE_ENV !== 'production') {
    if (!isShuttingDown) {
      isShuttingDown = true
      setTimeout(() => process.exit(1), 5000)
    }
  }
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

try {
  await connectDB(defaultPostConnect)
  await createServer()
  console.log('🚀 Server started successfully')
} catch (error) {
  console.error('Failed to start server:', error)
  process.exit(1)
}
