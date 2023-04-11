import { MUUID } from 'uuid-mongodb'

export const muuidToString = (m: MUUID): string => m.toUUID().toString();
