import { user } from '@schema';
import { InferSelectModel } from 'drizzle-orm';
import { UUIDTypes } from 'uuid';
import { Actor } from './actor';
import { EntityAddressable, EntityStructure } from './entity_model';

export class UserActor implements Actor {
  uuid: UUIDTypes;
  id: number;
  private userData: InferSelectModel<typeof user>;

  constructor(userData: InferSelectModel<typeof user>) {
    this.userData = userData;
    this.uuid = userData.uuid;
    this.id = userData.id;
  }

  // Initial implementation: Users can perform actions.
  // In a real system, you might check roles or specific permissions here.
  async mayEdit(ent: EntityAddressable): Promise<boolean> {
    return true;
  }

  async mayDelete(ent: EntityAddressable): Promise<boolean> {
    return true;
  }

  async mayRestore(ent: EntityAddressable): Promise<boolean> {
    return true;
  }

  async maySetLock(ent: EntityAddressable): Promise<boolean> {
    return true;
  }

  async mayCreate(parent: EntityStructure): Promise<boolean> {
    return true;
  }
}
