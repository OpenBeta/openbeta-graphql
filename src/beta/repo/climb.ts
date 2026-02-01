import { climb } from '@schema';
import { Entity, EntityRecord, EntityStructure } from 'beta/entity_model';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { EntityRepository } from './base';

type ClimbTable = typeof climb;
type ClimbSelect = InferSelectModel<ClimbTable>;
export type ClimbPrimitive =
  & InferSelectModel<ClimbTable>
  & Entity
  & EntityStructure;

type ClimbCreation = Pick<
  ClimbPrimitive,
  | 'name'
  | 'parent'
  | 'fa'
  | 'length'
  | 'boltsCount'
  | 'type'
  | 'safety'
  | 'canonicalGrade'
>;

export class ClimbRepo extends EntityRepository<
  ClimbPrimitive,
  ClimbTable,
  ClimbPrimitive,
  ClimbCreation
> {
  readonly kind = 'climb';
  readonly table = climb;

  mapJoinedToCombined(
    { entity, parts }: {
      entity: EntityRecord;
      parts: ClimbSelect;
    },
  ): ClimbPrimitive {
    return { ...entity, ...parts };
  }
}
