import { QueryResolvers } from '@gql';

const query: QueryResolvers = {
  media: async () => {
    throw new Error('Not implemented');
  },
  getMediaForFeed: async () => {
    throw new Error('Not implemented');
  },
  getUserMedia: async () => {
    throw new Error('Not implemented');
  },
  getUserMediaPagination: async () => {
    throw new Error('Not implemented');
  },
  areaMediaPagination: async () => {
    throw new Error('Not implemented');
  },
  climbMediaPagination: async () => {
    throw new Error('Not implemented');
  },
  getTagsLeaderboard: async () => {
    throw new Error('Not implemented');
  },
};

export default query;
