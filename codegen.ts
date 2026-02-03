import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/gql',
  generates: {
    'src/gql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: '../../server/context#Context',
        mappers: {
          Area: '../../resolvers/area#PartiallyResolvedArea',
          Climb: '../../beta/repo/climb#ClimbPrimitive',
          MediaWithTags: '../../beta/repo/media#MediaRecord',
          EntityTag: '../../resolvers/tag#EntityTagRecord',
        },
      },
    },
  },
};

export default config;
