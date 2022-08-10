import { ApolloServer } from 'apollo-server'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'

import { graphqlSchema } from './graphql/resolvers.js'
import { connectDB, defaultPostConnect } from './db/index.js'
import MutableAreaDataSource from './model/MutableAreaDataSource.js'
import TickDataSource from './model/TickDataSource.js'
import { createContext, permissions } from './auth/index.js'
import { logger } from './logger.js'

// eslint-disable-next-line
(async function (): Promise<void> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources: () => ({
      areas: new MutableAreaDataSource(mongoose.connection.db.collection('areas')),
      ticks: new TickDataSource(mongoose.connection.db.collection('ticks'))
    }),
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
