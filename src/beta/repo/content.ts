import { content } from '@schema';
import { Entity, EntityRecord, EntityStructure } from 'beta/entity_model';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { EntityRepository } from './base';

type ContentTable = typeof content;
type ContentSelect = InferSelectModel<ContentTable>;
export type ContentPrimitive =
  & InferSelectModel<ContentTable>
  & Entity
  & EntityStructure;

type ContentCreation = Pick<ContentPrimitive, 'name' | 'parent' | 'text'>;

export class ContentRepo extends EntityRepository<
  ContentPrimitive,
  ContentTable,
  ContentPrimitive,
  ContentCreation
> {
  readonly kind = 'content';
  readonly table = content;

  mapJoinedToCombined(
    { entity, parts }: {
      entity: EntityRecord;
      parts: ContentSelect;
    },
  ): ContentPrimitive {
    return { ...entity, ...parts };
  }
}
