import { area } from '@schema';
import { Entity, EntityRecord } from 'beta/entity_model';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { EntityRepository } from './base';

type AreaTable = typeof area;
type AreaSelect = InferSelectModel<AreaTable>;
export type AreaPrimitive = InferSelectModel<AreaTable> & Entity;

export class AreaRepo extends EntityRepository<AreaPrimitive, AreaTable> {
  readonly kind = 'area';
  readonly table = area;

  mapJoinedToCombined(
    { entity, parts }: {
      entity: EntityRecord;
      parts: AreaSelect;
    },
  ): AreaPrimitive {
    return { ...entity, ...parts };
  }
}
