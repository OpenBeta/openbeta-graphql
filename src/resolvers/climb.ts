import { SchemaManager } from '@apollo/server/dist/esm/utils/schemaManager';
import { Resolvers, SafetyEnum } from '@gql';
import * as schema from '@schema';
import { authorMetadata } from 'beta/authorMetadataResolver';
import { resolveContent } from 'beta/contentResolvers';
import { HasCacheableLineage, requireAncestry } from 'beta/lineage';
import { ClimbPrimitive } from 'beta/repo/climb';
import { mediaConnection } from 'beta/repo/media';
import { eq } from 'drizzle-orm';

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
    // TODO: Pitch should be an entity subordinate to climb
    throw new Error('Not Implemented');
  },

  grades: async (parent, _, context) => {
    if (parent.canonicalGrade === null) return null;

    const entry = await context
      .db
      .select()
      .from(schema.grade)
      .innerJoin(
        schema.gradeSystem,
        eq(schema.grade.system, schema.gradeSystem.id),
      )
      .where(eq(schema.grade.id, parent.canonicalGrade))
      .then((d) => d[0]);

    return {
      [entry.grade_system.name]: entry.grade.value,
    };
  },

  gradeContext: async (parent, _, context) => {
    return await context
      .db
      .select({ name: schema.gradeSystem.name })
      .from(schema.areaGradeContext)
      .innerJoin(
        schema.gradeSystem,
        eq(schema.areaGradeContext.context, schema.gradeSystem.id),
      )
      .where(eq(schema.areaGradeContext.area, parent.parent))
      .limit(1)
      .then((
        data,
      ) => data[0]?.name);
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

  yds: async (parent, _, ctx) => {
    // TODO: join along the grade pegboard
    return null;
  },

  ticks: async (parent, _, ctx) =>
    ctx.db.select().from(schema.tick).where(eq(schema.tick.climb, parent.id)),

  content: resolveContent('Content'),
  authorMetadata,
};
