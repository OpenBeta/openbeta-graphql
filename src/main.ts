import { ApolloServer } from 'apollo-server'
import mongoose from 'mongoose'
import { applyMiddleware } from 'graphql-middleware'
import { graphqlSchema } from './graphql/resolvers.js'
import { connectDB, defaultPostConnect } from './db/index.js'
import MutableAreaDataSource from './model/MutableAreaDataSource.js'
import { changelogDataSource } from './model/ChangeLogDataSource.js'
import TickDataSource from './model/TickDataSource.js'
import { createContext, permissions } from './auth/index.js'
import { logger } from './logger.js'
import CommentDataSource from './model/CommentDataSource.js'

// eslint-disable-next-line
(async function (): Promise<void> {
  const schema = applyMiddleware(graphqlSchema, permissions.generate(graphqlSchema))
  const server = new ApolloServer({
    introspection: true,
    schema,
    context: createContext,
    dataSources: () => ({
      areas: new MutableAreaDataSource(mongoose.connection.db.collection('areas')),
      ticks: new TickDataSource(mongoose.connection.db.collection('ticks')),
      comments: new CommentDataSource(mongoose.connection.db.collection('comments')),
      history: changelogDataSource // see source for explantion why we don't instantiate the object
    }),
    cache: 'bounded'
  })

  await connectDB(defaultPostConnect)

  const port = 4000

  await server.listen({
    port
  }).then((): void => {
    logger.info(`🚀 Server ready at http://localhost:${port}`)
  })
})()
