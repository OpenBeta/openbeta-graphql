import { UUIDTypes } from 'uuid';

export interface ActorIdentifiable {
  uuid: UUIDTypes;
}

export interface Actor extends ActorIdentifiable {
}
