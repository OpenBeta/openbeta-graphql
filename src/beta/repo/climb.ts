import { climb } from '@schema';
import {
  Entity,
  EntityError,
  EntityRecord,
  EntityStructure,
  EntityWithParent,
  validateParent,
} from 'beta/entity_model';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { EntityRepository } from './base';

type ClimbTable = typeof climb;
type ClimbSelect = InferSelectModel<ClimbTable>;
export type ClimbPrimitive =
  & InferSelectModel<ClimbTable>
  & Entity
  & EntityWithParent;

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
  | 'location'
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
    if (!validateParent(entity)) {
      throw new EntityError('Climbs MUST have parents');
    }

    return { ...entity, ...parts };
  }
}
