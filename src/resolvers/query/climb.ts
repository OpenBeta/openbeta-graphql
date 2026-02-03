import { Resolvers } from '@gql';

const query: Resolvers['Query'] = {
  climb: async (parent, args, context) => {
    if (!args.uuid) throw new Error('Oops the schema lied! uuid is required');
    return context.repo.climb.get(args.uuid);
  },
};

export default query;
