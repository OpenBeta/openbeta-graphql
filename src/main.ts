import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers.js'

import { connectDB, defaultPostConnect } from './db/index.js'
import { createContext, permissions } from './auth/index.js'
import { logger } from './logger.js'
import { GraphQLContext } from './auth/middleware.js'

async function main (): Promise<void> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer<GraphQLContext>({ schema })

  await connectDB(defaultPostConnect)

  const { url } = await startStandaloneServer(server, {
    context: createContext,
    listen: { port: 4000 }
  })

  if (typeof url !== 'string') {
    throw new Error('Server did not appear to start correctly')
  }

  logger.info(`🚀  Server ready at ${url}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
