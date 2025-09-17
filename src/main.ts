import { connectDB, defaultPostConnect } from './db/index.js'
import { createServer } from './server.js'

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
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
