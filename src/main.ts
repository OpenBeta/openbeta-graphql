import { ApolloServer } from 'apollo-server'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import mongoose from 'mongoose'
import { schema as graphQLSchema } from './schema/GraphQLSchema.js'
import { connectDB } from './db/index.js'
import AreaDataSource from './model/AreaDataSource.js'

// eslint-disable-next-line
(async function (): Promise<void> {
  const server = new ApolloServer({
    introspection: true,
    schema: graphQLSchema,
    dataSources: (): DataSources<AreaDataSource> => {
      return {
        areas: new AreaDataSource(mongoose.connection.db.collection('areas'))
      }
    }
  })

  await connectDB(async () => {
    // additional initializing code here
  })
  await server.listen().then((): void => {
    console.log('🚀 Server ready!')
  })
})()
