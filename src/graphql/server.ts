import { ApolloServer } from 'apollo-server'
import { applyMiddleware } from 'graphql-middleware'
import mongoose from 'mongoose'
import { permissions, createContext } from '../auth'
import { changelogDataSource } from '../model/ChangeLogDataSource'
import MutableMediaDataSource from '../model/MutableMediaDataSource'
import TickDataSource from '../model/TickDataSource'
import { graphqlSchema } from './resolvers'

import { createInstance as createNewAreaDS } from '../model/MutableAreaDataSource.js'
import { createInstance as createNewClimbDS } from '../model/MutableClimbDataSource.js'

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
