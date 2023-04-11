import { logger } from './logger.js'
import { connectDB, defaultPostConnect } from './db/index.js'
import { createServer } from './server.js'

const port = 4000
const server = await createServer()

await connectDB(defaultPostConnect)
await server
  .listen({
    port
  })
  .then((): void => {
    logger.info(`🚀 Server ready at http://localhost:${port}`)
  })
