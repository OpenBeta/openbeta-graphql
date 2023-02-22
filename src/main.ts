
import { connectDB, defaultPostConnect } from './db/index.js'
import { logger } from './logger.js'
import { getGqlServer } from './graphql/server.js'

async function main (): Promise<void> {
  const server = await getGqlServer()

  await connectDB(defaultPostConnect)

  const port = 4000

  await server.listen({
    port
  }).then((): void => {
    logger.info(`🚀 Server ready at http://localhost:${port}`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
