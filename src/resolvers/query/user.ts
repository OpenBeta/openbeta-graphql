import { QueryResolvers } from '@gql';

const query: QueryResolvers = {
  user: async () => {
    throw new Error('Not implemented');
  },
  userPage: async () => {
    throw new Error('Not implemented');
  },
  usernameExists: async () => {
    throw new Error('Not implemented');
  },
  getUsername: async () => {
    throw new Error('Not implemented');
  },
  getUserPublicProfileByUuid: async () => {
    throw new Error('Not implemented');
  },
  getUserPublicPage: async () => {
    throw new Error('Not implemented');
  },
};

export default query;
