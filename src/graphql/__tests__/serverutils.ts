import mongoose from 'mongoose'
import { ApolloServer } from 'apollo-server'
import { applyMiddleware } from 'graphql-middleware'
import { permissions } from '../../auth'
import { changelogDataSource } from '../../model/ChangeLogDataSource'
import MutableMediaDataSource from '../../model/MutableMediaDataSource'
import TickDataSource from '../../model/TickDataSource'
import { graphqlSchema } from '.././resolvers'

import { createInstance as createNewAreaDS } from '../../model/MutableAreaDataSource.js'
import { createInstance as createNewClimbDS } from '../../model/MutableClimbDataSource.js'
import { ExpressContext } from 'apollo-server-express/dist/ApolloServer'
import { AuthUserType } from '../../types'
import muid from 'uuid-mongodb'

/**
   * Create the mock context (e2e testing)
   * When creating the request, all you need to do is set the authorization header
   * to something along the lines of:
   * Bearer { "roles": ["some_role"], "uuid": "arb_uuid"}
   * the context creator will parse the JSON and use it to create the context.
   * */
export async function createTestContext (ctx: ExpressContext): Promise<{user: AuthUserType}> {
  const user: AuthUserType = {
    roles: [],
    uuid: undefined
  }

  if (ctx.req === undefined) return { user }
  if (ctx.req.headers === undefined) return { user }

  const { headers } = ctx.req
  const authHeader = String(headers?.authorization ?? '')

  if (authHeader.startsWith('Bearer ')) {
    const tokenRaw = authHeader.substring(7, authHeader.length).trim()
    const token = JSON.parse(tokenRaw)

    user.roles = token.roles ?? []
    const uidStr: string | undefined = token.uuid
    user.uuid = uidStr != null ? muid.from(uidStr) : undefined
  }

  return { user }
}

/**
 * For the sake of simplifying test behavior and reduce moving components, we mock the
 * Part of the context creation that is based on JWT.
 *
 * Instead, the test context creator will naively take the Authorization header and
 * parse it as a JSON object. This means contexts can be created ad-hoc while testing without
 * the need to create or decode JWTs.
 *
 * If JWTs themselves are the target of testing, there should be a specific test environment
 * made for their examination. When testing GQL layer, we are only interested in the actual
 * behavior of the server to the context.
 */
export async function createTestGqlServer (): Promise<ApolloServer> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))

  const server = new ApolloServer({
    schema,
    dataSources: () => ({
      climbs: createNewClimbDS(),
      areas: createNewAreaDS(),
      ticks: new TickDataSource(mongoose.connection.db.collection('ticks')),
      media: new MutableMediaDataSource(mongoose.connection.db.collection('media')),
      history: changelogDataSource // see source for explantion why we don't instantiate the object
    }),
    context: (x: AuthUserType) => {
      return x
    }
  })

  return server
}
