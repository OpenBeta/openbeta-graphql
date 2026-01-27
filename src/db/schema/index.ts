import { entityKind } from 'drizzle-orm';
import { areaTable } from './areaTable';
import { climbTable, safetyEnum } from './climbTable';
import { entityTable } from './entitiy';
import { disciplineEnum, gradeSystemTable, gradeTable } from './gradeTable';
import { mediaTable } from './mediaTable';
import { organizationTable } from './organizationTable';
import { tagTable } from './tagTable';
import {
  tickAttemptTypeEnum,
  tickSourceEnum,
  tickStyleEnum,
  tickTable,
} from './tickTable';
import { userTable } from './userTable';

const enums = {
  EntityKind: entityKind,
  Safety: safetyEnum,
  TickSource: tickSourceEnum,
  TickAttemptType: tickAttemptTypeEnum,
  TickStyle: tickStyleEnum,
  Discipline: disciplineEnum,
};

export {
  areaTable as area,
  climbTable as climb,
  entityTable as entity,
  enums,
  gradeSystemTable as gradeSystem,
  gradeTable as grade,
  mediaTable as media,
  organizationTable as organization,
  tagTable as tag,
  tickTable as tick,
  userTable as user,
};
