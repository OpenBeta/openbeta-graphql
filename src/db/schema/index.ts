import { InferSelectModel, Table } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { areaGradeContext, areaTable } from './areaTable';
import { climbTable, safetyEnum } from './climbTable';
import { contentTable } from './content';
import {
  EntityCompBaseTable,
  EntityKind,
  entityKind,
  entityTable,
} from './entitiy';
import { entityAncestorsTable } from './entityAncestors';
import { disciplineEnum, gradeSystemTable, gradeTable } from './gradeTable';
import { historyEventEnum, historyTable } from './history';
import { mediaTable } from './mediaTable';
import {
  organizationAreaTable,
  organizationMemberTable,
  organizationTable,
} from './organizationTable';
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
  areaGradeContext,
  areaTable as area,
  climbTable as climb,
  contentTable as content,
  entityAncestorsTable as entityAncestors,
  entityTable as entity,
  enums,
  gradeSystemTable as gradeSystem,
  gradeTable as grade,
  historyEventEnum,
  historyTable as history,
  mediaTable as media,
  organizationAreaTable as organizationArea,
  organizationMemberTable as organizationMember,
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
