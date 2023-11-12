import { logger } from './logger'
import { connectDB, defaultPostConnect } from './db/index'
import { createServer } from './server'

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
