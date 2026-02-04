import { UUIDTypes } from 'uuid';
import { EntityAddressable, EntityId, EntityStructure } from './entity_model';

export interface ActorIdentifiable {
  id: number;
  uuid: UUIDTypes;
}

export interface Actor extends ActorIdentifiable {
  mayEdit: (ent: EntityAddressable) => Promise<boolean>;
  mayDelete: (ent: EntityAddressable) => Promise<boolean>;
  mayRestore: (ent: EntityAddressable) => Promise<boolean>;
  maySetLock: (ent: EntityAddressable) => Promise<boolean>;
  mayCreate: (parent: EntityStructure) => Promise<boolean>;
}

export class ActorError extends Error {}
