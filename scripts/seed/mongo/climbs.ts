import * as schema from '@schema';
import {
  and,
  DrizzleError,
  DrizzleQueryError,
  eq,
  inArray,
  InferInsertModel,
  or,
} from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { UUIDTypes } from 'uuid';
import { GradesWithNoPegs } from '../../gradeManager/grades';
import { slc } from '../utils';
import { argv } from './args';
import { forEachRow, uuidToPsql } from './utils';

const unknown = ['?', 'V?'];
const slashGradeTokens = ['/', '-'];

type Grade = { system: string; value: string };
type GradeBand = { lower: Grade; upper?: Grade };
class GradeError extends Error {}
class GradeMatchesExplicitUnknown extends Error {}

const mapToKnown: Record<string, GradeBand> = {
  // It truly should not be so complicated since it's just a v and a number.
  // ... ... ... sadly we do not live in a perfect world.
  // As far as i can make out, v-easy is a fuzzy kind of thing
  'V-easy': {
    lower: { system: 'vscale', value: 'VB-' },
    upper: { system: 'vscale', value: 'V0' },
  },
};

function simpleGradeFind(value: string): Grade | undefined {
  for (const system of Object.keys(GradesWithNoPegs)) {
    if (GradesWithNoPegs[system].includes(value)) {
      return {
        system,
        value,
      };
    }
  }
}

function slashGradeFind(value: string): GradeBand {
  if (value in mapToKnown) {
    return mapToKnown[value];
  }

  let lowerval: string = '';
  let upperval: string = '';
  let lower: Grade | undefined;
  let upper: Grade | undefined;

  for (const token of slashGradeTokens) {
    const [l, u] = value.split(token);

    if (l && u) {
      // slash grades are occasionaly simple, for the strictest yds like
      // 5.5/6 you could quite easily collapse the / and pop off the last
      // digit. However, grades like
      // 5.5/100
      // are technically lexically sound, and should resolve to a grade band
      // of some significant margin that THEN fails to resolve in the simpleGradeFind
      let trailingDigits = l.match(/\d+$/)?.[0];

      lowerval = l;
      upperval = l.substring(0, l.length - (trailingDigits?.length || 1)) + u;
      break;
    }
  }

  lower = simpleGradeFind(lowerval);
  upper = simpleGradeFind(upperval);

  if (lower === undefined || upper === undefined) {
    throw new GradeError(
      `${value} Failed to become slash grade. best attempt:
      ${value} -> ${lowerval},${upperval} -> ${JSON.stringify(lower)} / ${
        JSON.stringify(upper)
      }`,
    );
  }

  return { lower, upper };
}

function resolveGrade(mongoClimb: any): GradeBand {
  const yds = mongoClimb.yds as string;
  if (unknown.includes(yds)) throw new GradeMatchesExplicitUnknown();

  let naive = simpleGradeFind(yds);
  if (naive) return { lower: naive };
  return slashGradeFind(yds);
}

// Run ahead of the climb reification and ensure that grades will be totally
// resolvable with new maps
export async function checkGrades(db: schema.Database) {
  const invalidGrades = new Set<string>();
  const validGrades = new Set(
    await db.select().from(schema.grade).then((d) => d.map((i) => i.value)),
  );

  await forEachRow<any>('climbs', async (mongoClimb) => {
    try {
      resolveGrade(mongoClimb);
    } catch (error) {
      if (error instanceof GradeMatchesExplicitUnknown) {
        // This is legal for checking purposes
        return;
      }

      if (!(error instanceof GradeError)) {
        throw error;
      }

      invalidGrades.add(mongoClimb.yds);
      console.error(error);
    }
  });

  if (invalidGrades.size > 0) {
    console.error({ invalidGrades });
    throw new Error('Grade mapping would be degraded.');
  }
}

export async function seedClimbEntities(db: schema.Database) {
  await forEachRow<any>('climbs', async (row) => {
    const areaUuid = row.metadata?.areaRef;
    if (!areaUuid) {
      throw new Error('Climb should ALWAYS have an area parent in mongo doc');
    }

    const areaId = uuidToPsql.get(areaUuid);
    const climbUuid: string = row._id;

    if (!areaId) {
      console.log(
        `${climbUuid} seems to reference an area that does not exist in mongo?`
          + ' this may indicate an improper deletion leaving this node orphaned?',
      );
      return;
    }

    try {
      const [reified] = await db
        .insert(schema.entity)
        .values(
          {
            uuid: climbUuid,
            entityType: 'climb',
            name: row.name,
            parent: areaId,
            created: row.createdAt || new Date(),
          },
        )
        .returning({ id: schema.entity.id, uuid: schema.entity.uuid });

      uuidToPsql.set(reified.uuid, reified.id);
    } catch (err) {
      const [extant] = await db.select().from(schema.entity).where(
        eq(schema.entity.uuid, climbUuid),
      );

      if (extant.name == row.name) return;
      throw err;
    }
  });
}

export async function seedClimbDetails(db: schema.Database) {
  await forEachRow<any>('climbs', async (mongoClimb) => {
    const postgresId = uuidToPsql.get(mongoClimb._id);
    if (!postgresId) return;

    const band = resolveGrade(mongoClimb);
    const [gradeLower, gradeUpper] = await db
      .select({ id: schema.grade.id })
      .from(schema.grade)
      .innerJoin(
        schema.gradeSystem,
        eq(
          schema
            .gradeSystem
            .id,
          schema.grade.system,
        ),
      )
      .where(
        or(
          and(
            eq(schema.gradeSystem.name, band.lower.system),
            eq(schema.grade.value, band.lower.value),
          ),
          and(
            eq(schema.gradeSystem.name, band.upper?.system ?? ''),
            eq(schema.grade.value, band.upper?.value ?? ''),
          ),
        ),
      );

    if (!gradeLower) {
      console.error(mongoClimb);
      console.error({ searchedFor: Object.values(mongoClimb.grades) });
      throw new Error('This climb row did not have a valid grade');
    }

    await db.insert(schema.climb).values({
      id: postgresId,
      name: mongoClimb.name,
      type: mapClimbType(mongoClimb.type),
      fa: mongoClimb.fa,
      length: mongoClimb.length || 0,
      boltsCount: mongoClimb.boltsCount || null,
      safety: mongoClimb.safety === 'UNSPECIFIED'
        ? 'UNSPECIFIED'
        : (mongoClimb.safety || 'UNSPECIFIED'),
      location: mongoClimb.metadata?.lnglat
        ? {
          x: mongoClimb.metadata.lnglat.coordinates[0],
          y: mongoClimb.metadata.lnglat.coordinates[1],
        }
        : null,
      canonicalGrade: gradeLower.id,
      canonicalGradeUpper: gradeUpper?.id,
    });
  });
}

function mapClimbType(mongoType: any): any {
  if (mongoType?.trad) return 'trad';
  if (mongoType?.bouldering) return 'bouldering';
  if (mongoType?.alpine) return 'trad';
  if (mongoType?.ice) return 'ice';
  if (mongoType?.mixed) return 'ice';
  if (mongoType?.aid) return 'aid';
  if (mongoType?.tr) return 'top_rope';
  if (mongoType?.dws) return 'dws';
  return 'sport'; // Default
}
