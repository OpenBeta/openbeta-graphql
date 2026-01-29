import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/gql',
  generates: {
    'src/gql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        context: './src/server/context#Context',
      },
    },
  },
};

export default config;
