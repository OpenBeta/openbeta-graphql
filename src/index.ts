import { ApolloServer } from 'apollo-server'
import { connection } from 'mongoose'
import { schema as graphQLSchema } from './schema'
import Climbs from './model/Climbs'
import { connectDB } from './db'
import Areas from './model/Areas'

// eslint-disable-next-line
(async function (): Promise<void> {
  const server = new ApolloServer({
    introspection: true,
    schema: graphQLSchema,
    dataSources: () => {
      return {
        climbs: new Climbs(connection.db.collection('Climb')),
        areas: new Areas(connection.db.collection('areas'))
      }
    }
  })

  await connectDB()
  await server.listen().then((): void => {
    console.log('🚀 Server ready!')
  })
})()
