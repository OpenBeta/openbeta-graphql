import { ApolloServer } from 'apollo-server'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'

import { graphqlSchema } from './graphql/resolvers.js'
import { connectDB, getMediaModel } from './db/index.js'
import AreaDataSource from './model/AreaDataSource.js'
import { createContext, permissions } from './auth/index.js'

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
    }
  })

  await connectDB(async () => {
    getMediaModel()
    // additional initializing code here
  })
  await server.listen().then((): void => {
    console.log('🚀 Server ready!')
  })
})()
