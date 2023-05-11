import { ApolloServer } from 'apollo-server'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers.js'

import { createInstance as createNewAreaDS } from './model/MutableAreaDataSource.js'
import { changelogDataSource } from './model/ChangeLogDataSource.js'
import MutableMediaDataSource from './model/MutableMediaDataSource.js'
import { createInstance as createNewClimbDS } from './model/MutableClimbDataSource.js'
import TickDataSource from './model/TickDataSource.js'
import { createContext, permissions } from './auth/index.js'
import XMediaDataSource from './model/XMediaDataSource.js'
import PostDataSource from './model/PostDataSource.js'
import { createInstance as createNewOrgDS } from './model/MutableOrganizationDataSource.js'
import type { Context } from './types.js'
import type { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import UserDataSource from './model/UserDataSource.js'

export async function createServer (): Promise<ApolloServer> {
  const schema = applyMiddleware(
    graphqlSchema,
    permissions.generate(graphqlSchema)
  )
  const dataSources: () => DataSources<Context> = () => ({
    climbs: createNewClimbDS(),
    areas: createNewAreaDS(),
    organizations: createNewOrgDS(),
    ticks: new TickDataSource(mongoose.connection.db.collection('ticks')),
    history: changelogDataSource, // see source for explantion why we don't instantiate the object
    media: new MutableMediaDataSource(
      mongoose.connection.db.collection('media')
    ),
    xmedia: new XMediaDataSource(mongoose.connection.db.collection('xmedia')),
    post: new PostDataSource(mongoose.connection.db.collection('post')),
    users: new UserDataSource(mongoose.connection.db.collection('user'))
  })
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources,
    cache: 'bounded'
  })

  return server
}
