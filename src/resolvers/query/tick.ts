import { QueryResolvers } from '@gql';

const query: QueryResolvers = {
  userTicks: async () => {
    throw new Error('Not implemented');
  },
  userTicksByClimbId: async () => {
    throw new Error('Not implemented');
  },
};

export default query;
