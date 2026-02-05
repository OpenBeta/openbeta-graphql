import { Resolvers } from '@gql';
import { authorMetadata } from 'beta/authorMetadataResolver';
import { resolveContent } from 'beta/contentResolvers';
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
  ancestors: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.uuid))
    ),

  pathTokens: async (parent, _, context) =>
    await requireAncestry(parent, context).then((d) =>
      d.map((o) => String(o.name))
    ),

  parent: async (parent, _, context) => context.repo.area.get(parent.parent!),

  pitches: async () => {
    throw new Error('Not implemented');
  },

  grades: async () => {
    throw new Error('Not implemented');
  },

  gradeContext: async () => {
    throw new Error('Not implemented');
  },

  type: async () => {
    throw new Error('Not implemented');
  },

  safety: async () => {
    throw new Error('Not implemented');
  },

  mediaPagination: async () => {
    throw new Error('Not implemented');
  },

  yds: async () => {
    throw new Error('Not implemented');
  },

  ticks: async () => {
    throw new Error('Not implemented');
  },

  content: resolveContent('Content'),
  media: async (parent, _, context) => context.repo.area.media(parent),
  authorMetadata,
};
