import { AuthorMetadata } from '@gql';
import * as schema from '@schema';
import { and, desc, eq } from 'drizzle-orm';
import { GraphQLResolveInfo } from 'graphql';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import { Context } from 'server/context';
import { EntityIdentifiable } from './entity_model';

export async function authorMetadata(
  parent: EntityIdentifiable,
  _: unknown,
  context: Context,
  info: GraphQLResolveInfo,
) {
  const data: AuthorMetadata = {};
  const selection = parseResolveInfo(info)?.fieldsByTypeName?.AuthorMetadata
    || {};

  if (
    'createdAt' in selection
    || 'createdBy' in selection
    || 'createdByUser' in selection
  ) {
    await context
      .db
      .select()
      .from(schema.history)
      .innerJoin(
        schema.user,
        eq(schema.user.id, schema.history.author),
      )
      .where(and(
        eq(schema.history.entity, parent.id),
        eq(schema.history.eventType, 'ENTITY_CREATED'),
      ))
      .then(([user]) => {
        if (!user) return;
        data.updatedAt = user.entity_history.editTime;
        data.updatedBy = user.user.uuid;
        data.updatedByUser = user.user.username;
      });
  }

  if (
    'updatedAt' in selection
    || 'updatedBy' in selection
    || 'updatedByUser' in selection
  ) {
    await context
      .db
      .select()
      .from(schema.history)
      .innerJoin(
        schema.user,
        eq(schema.user.id, schema.history.author),
      )
      .where(and(
        eq(schema.history.entity, parent.id),
        eq(schema.history.eventType, 'ENTITY_EDITED'),
      ))
      .orderBy(desc(schema.history.id))
      .limit(1)
      .then(([user]) => {
        if (!user) return;
        data.updatedAt = user.entity_history.editTime;
        data.updatedBy = user.user.uuid;
        data.updatedByUser = user.user.username;
      });
  }

  return data;
}
