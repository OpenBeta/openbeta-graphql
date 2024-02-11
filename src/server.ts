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
import { localDevBypassAuthContext } from './auth/local-dev/middleware.js'
import localDevBypassAuthPermissions from './auth/local-dev/permissions.js'
import XMediaDataSource from './model/XMediaDataSource.js'
import PostDataSource from './model/PostDataSource.js'
import MutableOrgDS from './model/MutableOrganizationDataSource.js'
import type { Context } from './types.js'
import type { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import UserDataSource from './model/UserDataSource.js'
import express from 'express'
import * as http from 'http'

export async function createServer (): Promise<{ app: express.Application, server: ApolloServer }> {
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

  const server = new ApolloServer({
    introspection: true,
    schema,
    context: process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthContext : createContext,
    dataSources,
    cache: 'bounded'
  })
  // server must be started before applying middleware
  await server.start()
  server.applyMiddleware({ app, path: '/' })

  return { app, server }
}

export async function startServer ({ app, server, port = 4000 }: {
  app: express.Application
  server: ApolloServer
  port?: number
}): Promise<void> {
  const httpServer = http.createServer(app)

  httpServer.on('error', (e) => {
    console.error('Error starting server', e)
    throw e
  })

  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve))
  console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`)
}
