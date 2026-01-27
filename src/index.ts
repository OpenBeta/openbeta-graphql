import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const gqlLoc = './src/gql';
const typeDefs = await readdir(gqlLoc)
  .then((files) =>
    files.map((file) =>
      readFile(
        path.join(gqlLoc, file),
        { encoding: 'utf-8' },
      )
    )
  )
  .then((pending) => Promise.all(pending))
  .then((fileContents) => fileContents.join('\n'));

const server = new ApolloServer({
  typeDefs,
  resolvers: {},
});

const db = drizzle(process.env.DATABASE_URL!);

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
