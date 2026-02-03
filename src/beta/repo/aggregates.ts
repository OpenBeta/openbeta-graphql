import { Database } from '@schema';
import * as schema from '@schema';
import { EntityId } from 'beta/entity_model';
import { eq } from 'drizzle-orm';
import { descendants } from './entity_cte';

export async function computeByDiscipline(
  db: Database,
  ent: EntityId,
  include: schema.Discipline[],
) {
}
