import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import express from 'express'
import cors from 'cors'
import * as http from 'http'
import bodyParser from 'body-parser'

import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers.js'
import MutableAreaDataSource from './model/MutableAreaDataSource.js'
import ChangeLogDataSource from './model/ChangeLogDataSource.js'
import MutableMediaDataSource from './model/MutableMediaDataSource.js'
import MutableClimbDataSource from './model/MutableClimbDataSource.js'
import TickDataSource from './model/TickDataSource.js'
import permissions from './auth/permissions.js'
import { createContext } from './auth/middleware.js'
import { localDevBypassAuthContext } from './auth/local-dev/middleware.js'
import localDevBypassAuthPermissions from './auth/local-dev/permissions.js'
import MutableOrgDS from './model/MutableOrganizationDataSource.js'
import UserDataSource from './model/UserDataSource.js'
import BulkImportDataSource from './model/BulkImportDataSource.js'

/**
 * Create a GraphQL server
 */
export async function createServer (): Promise<{ app: express.Application, server: ApolloServer }> {
  const schema = applyMiddleware(
    graphqlSchema,
    (process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthPermissions : permissions).generate(graphqlSchema)
  )
  const dataSources = ({
    climbs: MutableClimbDataSource.getInstance(),
    areas: MutableAreaDataSource.getInstance(),
    bulkImport: BulkImportDataSource.getInstance(),
    organizations: MutableOrgDS.getInstance(),
    ticks: TickDataSource.getInstance(),
    history: ChangeLogDataSource.getInstance(),
    media: MutableMediaDataSource.getInstance(),
    users: UserDataSource.getInstance()
  })

  const app = express()
  const httpServer = http.createServer(app)

  const server = new ApolloServer({
    introspection: true,
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    cache: 'bounded'
  })
  // server must be started before applying middleware
  await server.start()

  const context = process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthContext : createContext

  app.use('/',
    bodyParser.json({ limit: '10mb' }),
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ dataSources, ...await context({ req }) })
    })
  )

  await new Promise<void>(resolve => httpServer.listen({ port: 4000 }, resolve))
  return { app, server }
}
