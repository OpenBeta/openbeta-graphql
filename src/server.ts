import { ApolloServer } from 'apollo-server'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers'

import MutableAreaDataSource from './model/MutableAreaDataSource'
import ChangeLogDataSource from './model/ChangeLogDataSource'
import MutableMediaDataSource from './model/MutableMediaDataSource'
import MutableClimbDataSource from './model/MutableClimbDataSource'
import TickDataSource from './model/TickDataSource'
import { createContext, permissions } from './auth/index'
import XMediaDataSource from './model/XMediaDataSource'
import PostDataSource from './model/PostDataSource'
import MutableOrgDS from './model/MutableOrganizationDataSource'
import type { Context } from './types'
import type { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import UserDataSource from './model/UserDataSource'

export async function createServer (): Promise<ApolloServer> {
  const schema = applyMiddleware(
    graphqlSchema,
    permissions.generate(graphqlSchema)
  )
  const dataSources: () => DataSources<Context> = () => ({
    climbs: MutableClimbDataSource.getInstance(),
    areas: MutableAreaDataSource.getInstance(),
    organizations: MutableOrgDS.getInstance(),
    ticks: TickDataSource.getInstance(),
    history: ChangeLogDataSource.getInstance(),
    media: MutableMediaDataSource.getInstance(),
    users: UserDataSource.getInstance(),
    /**
     * We're not actively developing Xmedia and Post.
     * Consider removing it in the future.
     */
    xmedia: new XMediaDataSource(mongoose.connection.db.collection('xmedia')),
    post: new PostDataSource(mongoose.connection.db.collection('post'))
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
