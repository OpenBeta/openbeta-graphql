import { area } from '@schema';
import { Entity, EntityRecord } from 'beta/entity_model';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { EntityRepository } from './base';

type AreaTable = typeof area;
type Area = InferSelectModel<AreaTable> & Entity;
type AreaSelect = InferSelectModel<AreaTable>;

export class AreaRepo extends EntityRepository<Area, AreaTable> {
  readonly kind = 'area';
  readonly table = area;

  mapJoinedToCombined(
    { entity, parts }: {
      entity: EntityRecord;
      parts: AreaSelect;
    },
  ): Area {
    return { ...entity, ...parts };
  }

  captureBaseFields(
    from: InferInsertModel<AreaTable>,
  ): Partial<Omit<EntityRecord, 'entityType'>> {
    return {
      name: from.name,
    };
  }
}
