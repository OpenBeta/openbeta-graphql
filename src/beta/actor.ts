import { UUIDTypes } from 'uuid';
import { EntityAddressable } from './entity_model';

export interface ActorIdentifiable {
  uuid: UUIDTypes;
}

export interface Actor extends ActorIdentifiable {
  mayEdit: (ent: EntityAddressable) => Promise<boolean>;
  mayDelete: (ent: EntityAddressable) => Promise<boolean>;
  mayRestore: (ent: EntityAddressable) => Promise<boolean>;
  maySetLock: (ent: EntityAddressable) => Promise<boolean>;
}

export class ActorError extends Error {}
