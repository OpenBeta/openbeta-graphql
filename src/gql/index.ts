import { readdir, readFile } from 'fs/promises';
import path from 'path';
const gqlLoc = './src/gql';
const typeDefs = await readdir(gqlLoc)
  .then((files) =>
    files
      .filter((f) => f.endsWith('.gql'))
      .map((file) =>
        readFile(
          path.join(gqlLoc, file),
          { encoding: 'utf-8' },
        )
      )
  )
  .then((pending) => Promise.all(pending))
  .then((fileContents) => fileContents.join('\n'));

export default typeDefs;
