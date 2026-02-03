import { InferSelectModel, Table } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { areaTable } from './areaTable';
import { climbTable, safetyEnum } from './climbTable';
import {
  EntityCompBaseTable,
  EntityKind,
  entityKind,
  entityTable,
} from './entitiy';
import { entityAncestorsTable } from './entityAncestors';
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

type Database = ReturnType<typeof drizzle>;
type Transaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
type Discipline = (typeof disciplineEnum.enumValues)[number];

export {
  areaTable as area,
  climbTable as climb,
  entityAncestorsTable as entityAncestors,
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

export type {
  Database,
  Discipline,
  EntityCompBaseTable,
  EntityKind,
  Transaction,
};
