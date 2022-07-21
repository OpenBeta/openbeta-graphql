import { ApolloServer } from 'apollo-server'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'

import { graphqlSchema } from './graphql/resolvers.js'
import { connectDB, getMediaModel } from './db/index.js'
import AreaDataSource from './model/AreaDataSource.js'
import { createContext, permissions } from './auth/index.js'
import { logger } from './logger.js'
import streamListener from './db/edit/streamListener.js'

// eslint-disable-next-line
(async function (): Promise<void> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources: (): DataSources<AreaDataSource> => {
      return {
        areas: new AreaDataSource(mongoose.connection.db.collection('areas'))
      }
    },
    cache: 'bounded'
  })

  await connectDB(async () => {
    getMediaModel()
    streamListener(mongoose.connection)
    console.log('Kudos!')
  })

  const port = 4000

  await server.listen({
    port
  }).then((): void => {
    logger.info(`🚀 Server ready at http://localhost:${port}`)
  })
})()
