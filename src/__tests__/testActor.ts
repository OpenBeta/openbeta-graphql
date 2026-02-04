import { user } from '@schema';
import { Actor } from 'beta/actor';
import { EntityAddressable, EntityStructure } from 'beta/entity_model';
import { InferSelectModel } from 'drizzle-orm';
import { UUIDTypes } from 'uuid';

export class TestActor implements Actor {
  uuid: UUIDTypes;
  id: number;
  constructor(data: InferSelectModel<typeof user>) {
    this.uuid = data.uuid;
    this.id = data.id;
  }
  async mayEdit(ent: EntityAddressable) {
    return true;
  }
  async mayDelete(ent: EntityAddressable) {
    return true;
  }
  async mayRestore(ent: EntityAddressable) {
    return true;
  }
  async maySetLock(ent: EntityAddressable) {
    return true;
  }
  async mayCreate(ent: EntityStructure) {
    return true;
  }
}
