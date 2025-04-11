import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import express from 'express'
import cors from 'cors'
import * as http from 'http'
import bodyParser from 'body-parser'
import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache'

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
import { googleCloudWebHookRecieverWithValidator } from './google-cloud/push-subscriber.js'
import { GCS_ENABLE_SERVICES, GCS_MEDIA_HOOK_URL } from './google-cloud/index.js'
import { gcsTopicSubscription, handleMessageOnChannel } from './google-cloud/pull-subscriber.js'
import { logger } from './logger.js'
import { validateGoogleJWT } from './google-cloud/google-auth.js'

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
    cache: new InMemoryLRUCache({
      max: 100
    })
  })
  // server must be started before applying middleware
  await server.start()

  const context = process.env.LOCAL_DEV_BYPASS_AUTH === 'true' ? localDevBypassAuthContext : createContext

  // Look at the readme to see how google cloud services may interact with the API
  // Express processes routes in the order they are defined. By placing the webhook route definition first,
  // when a POST request comes in on the GCS_MEDIA_HOOK_URL, Express will match it to the defined route
  // and execute the reciever function. If the request doesn't match any of the explicitly defined routes,
  // it will then fall through to the Apollo Server middleware (mounted at /).
  if (GCS_ENABLE_SERVICES) {
    if (GCS_MEDIA_HOOK_URL !== undefined) {
      logger.info(`Setting up webhook at ${GCS_MEDIA_HOOK_URL}`)
      const handler = googleCloudWebHookRecieverWithValidator(validateGoogleJWT)
      app.post(GCS_MEDIA_HOOK_URL, bodyParser.json(), (req, res) => { void handler(req, res).catch(logger.error) })
    } else {
      logger.info('Setting up a pull notification on the GCS bucket')
      // todo: uhh does the gc clean this up at the end of scope?
      gcsTopicSubscription().on('message', (msg) => { handleMessageOnChannel(msg).then().catch(logger.warn) })
    }
  } else {
    logger.warn('GCS integration disabled, media upload will not work as expected')
  }

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
