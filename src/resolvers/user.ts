import { Resolvers } from '@gql';

export const userResolvers: Resolvers['UserPublicProfile'] = {
  userUuid: async (parent) => {
    throw new Error('Not implemented');
  },
  username: async (parent) => {
    throw new Error('Not implemented');
  },
  displayName: async (parent) => {
    throw new Error('Not implemented');
  },
  bio: async (parent) => {
    throw new Error('Not implemented');
  },
  website: async (parent) => {
    throw new Error('Not implemented');
  },
  avatar: async (parent) => {
    throw new Error('Not implemented');
  },
};
