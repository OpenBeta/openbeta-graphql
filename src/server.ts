import { ApolloServer } from 'apollo-server-express'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers.js'

import MutableAreaDataSource from './model/MutableAreaDataSource.js'
import ChangeLogDataSource from './model/ChangeLogDataSource.js'
import MutableMediaDataSource from './model/MutableMediaDataSource.js'
import MutableClimbDataSource from './model/MutableClimbDataSource.js'
import TickDataSource from './model/TickDataSource.js'
import { createContext } from './auth/middleware.js'
import permissions from './auth/permissions.js'
import { localDevBypassAuthMiddleware } from './auth/local-dev/middleware.js'
import localDevBypassAuthPermissions from './auth/local-dev/permissions.js'
import XMediaDataSource from './model/XMediaDataSource.js'
import PostDataSource from './model/PostDataSource.js'
import MutableOrgDS from './model/MutableOrganizationDataSource.js'
import type { Context } from './types.js'
import type { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import UserDataSource from './model/UserDataSource.js'
import express from 'express'
import * as http from 'http'

export async function startServer (port = 4000): Promise<ApolloServer> {
  const schema = applyMiddleware(
    graphqlSchema,
    (process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthPermissions : permissions).generate(graphqlSchema)
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

  const app = express()
  const httpServer = http.createServer(app)

  const server = new ApolloServer({
    introspection: true,
    schema,
    context: process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthMiddleware : createContext,
    dataSources,
    cache: 'bounded'
  })
  await server.start()
  server.applyMiddleware({ app, path: '/' })

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve))
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)

  return server
}
