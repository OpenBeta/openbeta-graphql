import { QueryResolvers, Resolvers } from '@gql';

const query: Resolvers['Query'] = {
  getTags: async () => {
    throw new Error('Not implemented');
  },
};

export default query;
