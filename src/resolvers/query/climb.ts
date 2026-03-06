import { Resolvers } from '@gql';
import { preloadAncestry, shouldLoadAncestry } from 'beta/lookahead';

const query: Resolvers['Query'] = {
  climb: async (parent, args, context, info) => {
    if (!args.uuid) throw new Error('Oops the schema lied! uuid is required');
    const res = await context.repo.climb.get(args.uuid);
    if (res && shouldLoadAncestry(info)) {
      await preloadAncestry(res, context);
    }
    return res;
  },
};

export default query;
