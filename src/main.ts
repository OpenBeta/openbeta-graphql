import { ApolloServer } from 'apollo-server'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'

import { graphqlSchema } from './graphql/resolvers.js'
import { connectDB, defaultPostConnect } from './db/index.js'
import MutableAreaDataSource from './model/MutableAreaDataSource.js'
import { createContext, permissions } from './auth/index.js'
import { logger } from './logger.js'

// eslint-disable-next-line
(async function (): Promise<void> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources: () => {
      return {
        areas: new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
      }
    },
    cache: 'bounded'
  })

  await connectDB(defaultPostConnect)

  const port = 4000

  await server.listen({
    port
  }).then((): void => {
    logger.info(`🚀 Server ready at http://localhost:${port}`)
  })
})()
