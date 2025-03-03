import { ApolloServer, BaseContext } from '@apollo/server'
import express, { Application } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { expressMiddleware } from '@apollo/server/express4'
import bodyParser from 'body-parser'
import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from '../../graphql/resolvers'
import cors from 'cors'
import { dataFixtures } from './data.fixtures'
import { createContext, permissions } from '../../auth'
import { ASTNode, print } from 'graphql'

let server: ApolloServer<BaseContext>
let app: Application

interface ServerTestFixtures {
  ctx: {
    server: ApolloServer<BaseContext>
    app: Application
  }
  query: (opts: QueryAPIProps) => Promise<request.Response>
}

export interface QueryAPIProps {
  query?: string | ASTNode
  operationName?: string
  variables?: any
  userUuid?: string
  roles?: string[]
  port?: number
  endpoint?: string
  app?: express.Application
  body?: any
}

export const gqlTest = dataFixtures.extend<ServerTestFixtures>({
  ctx: async ({
    climbs, areas, bulkImport,
    organizations,
    ticks,
    history,
    media,
    users
  }, use) => {
    if (app === undefined) {
      app = express()
    }

    if (server === undefined) {
      const schema = applyMiddleware(
        graphqlSchema,
        permissions.generate(graphqlSchema)
      )

      const dataSources = ({
        climbs,
        areas,
        bulkImport,
        organizations,
        ticks,
        history,
        media,
        users
      })

      server = new ApolloServer({
        schema,
        introspection: false,
        plugins: []
      })

      // server must be started before applying middleware
      await server.start()

      app.use('/',
        bodyParser.json({ limit: '10mb' }),
        cors<cors.CorsRequest>(),
        express.json(),
        expressMiddleware(server, {
          context: async ({ req }) => ({ dataSources, ...await createContext({ req }) })
        })
      )
    }

    await use({
      app, server
    })
  },

  query: async ({ ctx }, use) => {
    await use(
      async ({
        query,
        operationName,
        variables,
        userUuid,
        roles = [],
        endpoint = '/'
      }: QueryAPIProps) => {
        // Avoid needing to pass in actual signed tokens.
        const jwtSpy = vi.spyOn(jwt, 'verify')

        jwtSpy.mockImplementation(() => {
          return {
            // Roles defined at https://manage.auth0.com/dashboard/us/dev-fmjy7n5n/roles
            'https://tacos.openbeta.io/roles': roles,
            'https://tacos.openbeta.io/uuid': userUuid
          }
        })

        // It can be convienient to pass in the results of some
        // gql`dksjfhsdkjf` as in many IDE's this will provide
        // syntax highlighting and will create a more useful error
        // message when a mistake in the query literal is made.
        if (query !== undefined && typeof query !== 'string') {
          query = print(query)
        }

        const queryObj = { query, operationName, variables }

        let req = request(ctx.app)
          .post(endpoint)
          .send(queryObj)

        if (userUuid != null) {
          req = req.set('Authorization', 'Bearer placeholder-jwt-see-SpyOn')
        }

        return await req
      }
    )
  }
})
