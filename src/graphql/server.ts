import { ApolloServer } from 'apollo-server'
import { applyMiddleware } from 'graphql-middleware'
import mongoose from 'mongoose'
import { permissions, createContext } from '../auth/index.js'
import { graphqlSchema } from './resolvers.js'
import { createInstance as createNewAreaDS } from '../model/MutableAreaDataSource.js'
import { createInstance as createNewClimbDS } from '../model/MutableClimbDataSource.js'
import { changelogDataSource } from '../model/ChangeLogDataSource.js'
import MutableMediaDataSource from '../model/MutableMediaDataSource.js'
import TickDataSource from '../model/TickDataSource.js'

/**
 * This server configuration reflects how an Apollo server is configured for OpenBeta
 * when facing actual users.
 * */
export async function getGqlServer (): Promise<ApolloServer> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources: () => ({
      climbs: createNewClimbDS(),
      areas: createNewAreaDS(),
      ticks: new TickDataSource(mongoose.connection.db.collection('ticks')),
      history: changelogDataSource, // see source for explantion why we don't instantiate the object
      media: new MutableMediaDataSource(mongoose.connection.db.collection('media'))
    }),
    cache: 'bounded'
  })

  return server
}
