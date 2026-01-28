import { QueryResolvers } from '@gql';

const query: QueryResolvers = {
  organization: async () => {
    throw new Error('Not implemented');
  },
  organizations: async () => {
    throw new Error('Not implemented');
  },
};

export default query;
