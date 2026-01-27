import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { drizzle } from 'drizzle-orm/node-postgres';
import typeDefs from './gql';
import { resolvers } from './resolvers';

interface Context {
  db: ReturnType<typeof drizzle>;
}

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const db = drizzle(process.env.DATABASE_URL!);

const { url } = await startStandaloneServer(server, {
  context: async () => ({ db }),
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
