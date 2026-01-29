import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Actor } from 'beta/actor';
import { AreaRepo } from 'beta/repo/area';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Context, context } from 'server/context';
import typeDefs from './gql';
import { resolvers } from './resolvers';

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(
  server,
  {
    context,
    listen: { port: 4000 },
  },
);

console.log(`🚀  Server ready at: ${url}`);
