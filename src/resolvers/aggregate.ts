import { Resolvers } from '@gql';

export const aggregateTypeResolvers: Resolvers['AggregateType'] = {
  byGrade: async (parent) => {
    throw new Error('Not implemented');
  },
  byDiscipline: async (parent) => {
    throw new Error('Not implemented');
  },
  byGradeBand: async (parent) => {
    throw new Error('Not implemented');
  },
};
