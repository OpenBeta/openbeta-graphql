import * as schema from '@schema';
import { EntityAddressable, EntityId, EntityRecord } from 'beta/entity_model';
import { eq } from 'drizzle-orm';

export function matchOnAddressable(ent: EntityAddressable) {
  if (typeof ent == 'number') {
    return eq(schema.entity.id, ent);
  }

  if (typeof ent == 'string') {
    return eq(schema.entity.uuid, ent);
  }

  if (typeof ent === 'object' && 'id' in ent) {
    return matchOnAddressable(ent.id);
  }

  if (typeof ent === 'object' && 'uuid' in ent) {
    return matchOnAddressable(ent.uuid as any);
  }

  throw new Error(
    `we don't have a code path to collapse < ${ent} > into an sql match clause`,
  );
}

export async function collapseAddressable(
  db: schema.Transaction | schema.Database,
  ent: EntityAddressable,
): Promise<EntityId> {
  if (typeof ent == 'number') {
    return ent;
  }

  if (typeof ent === 'object' && 'id' in ent) {
    return ent.id;
  }

  return await db
    .select({ id: schema.entity.id })
    .from(schema.entity)
    .where(matchOnAddressable(ent))
    .limit(1)
    .then((d) => d[0].id);
}
