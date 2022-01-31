import { ApolloServer } from 'apollo-server'
import mongoose from 'mongoose'
import { schema as graphQLSchema } from './schema/GraphQLSchema.js'
import { connectDB } from './db/index.js'
import Areas from './model/Areas.js'

// eslint-disable-next-line
(async function (): Promise<void> {
  const server = new ApolloServer({
    introspection: true,
    schema: graphQLSchema,
    dataSources: () => {
      return {
        areas: new Areas(mongoose.connection.db.collection('areas'))
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
