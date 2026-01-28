import { QueryResolvers } from '@gql';

const query: QueryResolvers = {
  getChangeHistory: async () => {
    throw new Error('Not implemented');
  },
  getAreaHistory: async () => {
    throw new Error('Not implemented');
  },
  getOrganizationHistory: async () => {
    throw new Error('Not implemented');
  },
};

export default query;