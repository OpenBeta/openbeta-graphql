import { ApolloServer } from 'apollo-server'
import { DataSources } from 'apollo-server-core/dist/graphqlOptions'
import mongoose from 'mongoose'
import { shield, allow, rule } from 'graphql-shield'
import { applyMiddleware } from 'graphql-middleware'

import { graphqlSchema } from './graphql/resolvers.js'
import { connectDB, getMediaModel } from './db/index.js'
import AreaDataSource from './model/AreaDataSource.js'
import { verify } from './auth/util.js'

interface UserType {
  roles: string[]
}
// eslint-disable-next-line
(async function (): Promise<void> {
  const createContext = async ({ req }): Promise<any> => {
    const { headers } = req

    const user: UserType = {
      roles: []
    }
    const authHeader = String(headers?.authorization ?? '')
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7, authHeader.length).trim()
      const z = await verify(token)
      user.roles = z?.['https://tacos.openbeta.io/roles'] ?? []
    }

    return { user }
  }

  const isEditor = rule()(async (parent, args, ctx, info) => {
    console.log('#rule isEditor', ctx)
    return ctx.user.roles.includes('editor')
  })

  const permissions = shield({
    Query: {
      '*': allow
    },
    Mutation: {
      setDestinationFlag: isEditor
    }
  },
  {
    fallbackRule: allow
  })

  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources: (): DataSources<AreaDataSource> => {
      return {
        areas: new AreaDataSource(mongoose.connection.db.collection('areas'))
      }
    }
  })

  await connectDB(async () => {
    getMediaModel()
    // additional initializing code here
  })
  await server.listen().then((): void => {
    console.log('🚀 Server ready!')
  })
})()
