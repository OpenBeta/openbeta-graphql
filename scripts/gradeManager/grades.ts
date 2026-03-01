import { GradeType } from '@gql';
import { Database } from '@schema';
import { Spinner } from '@topcli/spinner';
import { disciplineEnum } from 'db/schema/gradeTable';
import * as schema from '../../src/db/schema';

export async function seedDefaultGrades(
  db: Database,
) {
  for (const systemName in GradesWithNoPegs) {
    const values = GradesWithNoPegs[systemName];

    const [system] = await db
      .insert(schema.gradeSystem)
      .values({
        name: systemName,
      })
      .returning();

    for (const [grade, idx] of values.map((i, i2) => [i, i2] as const)) {
      const [reified] = await db
        .insert(schema.grade)
        .values({
          system: system.id,
          value: grade,
          pegValueLow: idx * 20,
        })
        .returning();

      await db.insert(schema.gradePeg).values({
        system: system.id,
        grade: reified.id,
        peg: idx,
      });
    }
  }
}

export const GradesWithNoPegs: Record<string, string[]> = {
  font: Array(9)
    .fill(0)
    .map((_, idx) => `${idx + 1}`)
    .map((number) => 'abc'.split('').map((letter) => number + letter))
    .map((letters) =>
      letters.map((baseGrade) => [baseGrade, baseGrade + '+']).flatMap((x) => x)
    )
    .flatMap((inner) => inner),
  vscale: [
    'VB-',
    'VB',
    'VB+',
    ...Array(19)
      .fill(0)
      .map((
        i,
        idx,
      ) => [`V${idx}-`, `V${idx}`, `V${idx}+`])
      .flatMap((i) => i),
  ],
  yds: [
    '5.0',
    '5.1',
    '5.2',
    '5.3',
    '5.4',
    '5.5',
    '5.6',
    '5.7',
    '5.8',
    '5.9',
    ...Array(6)
      .fill(0)
      .map((_, idx) => idx + 10)
      .map((number) => 'abcd'.split('').map((letter) => `5.${number}${letter}`))
      .flatMap((i) => i),
  ],
  ydsLost: [
    '3rd',
    '4th',
    'Easy 5th',
    '5.0',
    '5.1',
    '5.2',
    '5.3',
    '5.4',
    '5.5',
    '5.6',
    ...Array(15 - 6)
      .fill(0)
      .map((_, idx) => idx + 7)
      .map((idx) => [`5.${idx}-`, `5.${idx}`, `5.${idx}+`])
      .flatMap((i) => i),
  ],
  french: Array(9)
    .fill(0)
    .map((_, idx) => `${idx + 1}`)
    .map((number) => 'abc'.split('').map((letter) => number + letter))
    .map((letters) =>
      letters.map((baseGrade) => [baseGrade, baseGrade + '+']).flatMap((x) => x)
    )
    .flatMap((inner) => inner),
  uiaa: [
    'II',
    'III',
    'IV-',
    'IV',
    'IV+',
    'V-',
    'V',
    'V+',
    'VI-',
    'VI',
    'VI+',
    'VII-',
    'VII',
    'VII+',
    'VIII-',
    'VIII',
    'VIII+',
    'IX-',
    'IX',
    'IX+',
    'X-',
    'X',
    'X+',
    'XI-',
    'XI',
    'XI+',
  ],
  ewbank: new Array(40).fill(0).map((_, idx) => String(idx)),
  south_african: new Array(40).fill(0).map((_, idx) => String(idx)),
  brazilianCrux: [],
  wi: [],
  band: ['Beginner', 'Intermediate', 'Experienced', 'Expert', 'Elite'],
};
