import { Resolvers, SafetyEnum } from '@gql';
import { authorMetadata } from 'beta/authorMetadataResolver';
import { resolveContent } from 'beta/contentResolvers';
import { HasCacheableLineage, requireAncestry } from 'beta/lineage';
import { ClimbPrimitive } from 'beta/repo/climb';
import { mediaConnection } from 'beta/repo/media';

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

  type: async (parent) => {
    // in mongodb it sometimes makes sense to have these kinds of complex
    // indecies but it makes little sense in postgres - so we map the type
    // with its flag to a simple 'true'
    return { [parent.type]: true };
  },

  safety: async (parent) => {
    return parent.safety as SafetyEnum;
  },

  media: async (parent, _, context) => context.repo.area.media(parent),
  mediaPagination: async (parent, { input }, context) => {
    const connection = await mediaConnection(context.db, parent, {
      first: input?.first,
      after: input?.after,
    });
    return {
      climbUuid: parent.uuid,
      mediaConnection: connection,
    };
  },

  yds: async () => {
    throw new Error('Not implemented');
  },

  ticks: async () => {
    throw new Error('Not implemented');
  },

  content: resolveContent('Content'),
  authorMetadata,
};
