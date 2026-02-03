import { ApolloServer } from '@apollo/server';
import { Database } from '@schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Actor } from '../../../beta/actor';
import { AreaRepo } from '../../../beta/repo/area';
import typeDefs from '../../../gql';
import { resolvers } from '../../../resolvers';
import { Context, context } from '../../../server/context';

const COUNTRIES_QUERY = gql`
  query GetCountries {
    countries {
      id
      uuid
      area_name
      areaName
      gradeContext
      density
      totalClimbs
      metadata {
        isDestination
        leaf
        isBoulder
      }
      content {
        description
        areaLocation
      }
      ancestors
      pathTokens
      pathHash
      aggregate {
        byGrade {
          count
          label
        }
        byDiscipline {
          trad {
            total
            bands {
              unknown
              beginner
              intermediate
              advanced
              expert
            }
          }
          sport {
            total
            bands {
              unknown
              beginner
              intermediate
              advanced
              expert
            }
          }
          bouldering {
            total
            bands {
              unknown
              beginner
              intermediate
              advanced
              expert
            }
          }
        }
        byGradeBand {
          unknown
          beginner
          intermediate
          advanced
          expert
        }
      }
    }
  }
`;

describe('Countries Query', () => {
});
