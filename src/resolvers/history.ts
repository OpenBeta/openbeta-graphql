import { Resolvers } from '@gql';

export const historyResolvers: Resolvers['History'] = {
  id: async (parent) => {
    throw new Error('Not implemented');
  },
  editedBy: async (parent) => {
    throw new Error('Not implemented');
  },
  editedByUser: async (parent) => {
    throw new Error('Not implemented');
  },
  operation: async (parent) => {
    throw new Error('Not implemented');
  },
  createdAt: async (parent) => {
    throw new Error('Not implemented');
  },
  changes: async (parent) => {
    throw new Error('Not implemented');
  },
};
