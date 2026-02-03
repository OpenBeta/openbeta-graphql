import { Resolvers } from '@gql';
import { HasCacheableLineage, requireAncestry } from 'beta/lineage';
import { ClimbPrimitive } from 'beta/repo/climb';

export type PartiallyResolvedClimb =
  & ClimbPrimitive
  & Partial<HasCacheableLineage>;

export const climbResolvers: Resolvers['Climb'] = {
  id: async (parent) => parent.uuid,
  metadata: async (parent, _, context) => {
    return {
      climbId: parent.uuid,
      climb_id: parent.uuid,
    };
  },
  content: async (parent, _, context) => {
    return {
      description: '',
      location: '',
      protection: '',
    };
  },
  ancestors: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.uuid))
    ),

  pathTokens: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.name))
    ),
};
