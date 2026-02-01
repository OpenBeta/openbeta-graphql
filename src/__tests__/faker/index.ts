import { faker } from '@faker-js/faker';
import * as schema from '@schema';

export function range(len: number): number[] {
  return Array(Math.floor(len)).fill(0).map((_, idx) => idx);
}

export const gradeSystems = [
  'VScale',
  'Number',
  'Font',
  'Special Test Grade',
] as const;

export type GradeSystemName = (typeof gradeSystems)[number];

export const legalGrades: Record<GradeSystemName, string[]> = {
  'VScale': range(15).map((i) => `V${i}`),
  'Number': range(32 - 10).map((i) => `${10 + i}`),
  'Font': range(5)
    .map((idx) => range(3).map((le) => `${idx}${'abc'[le]}`))
    .map((collections) => collections.map((grade) => [grade, grade + '+']))
    .flatMap((x) => x)
    .flatMap((x) => x),
  'Special Test Grade': range(6).map(() => faker.animal.dog()),
};

export const maxGradeDiscretion = Math.max(
  ...Object.values(legalGrades).map((i) => i.length),
);

// standard fisher yates algo
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  let replace: T[] = Array(array.length);

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [replace[currentIndex], replace[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function enumerateLinearPegMap(target: GradeSystemName) {
  return legalGrades[target]
    .map((grade, idx) => ({
      value: grade,
      peg: Math.floor(
        (idx / legalGrades[target].length)
          * maxGradeDiscretion,
      ),
    }));
}

type GradeSystemFake = Record<
  typeof schema.enums.Discipline.enumValues[number],
  Partial<Record<GradeSystemName, { value: string; peg: number }[]>>
>;

function initializeGradeSystems(): GradeSystemFake {
  const gradeDisiplineMap: Partial<GradeSystemFake> = {};

  for (const discipline of schema.enums.Discipline.enumValues) {
    gradeDisiplineMap[discipline] = {};
    // Shuffle a copy of our grade systems so we can consume them
    // sequentially.
    const g = shuffle([...gradeSystems]);

    // Each discipline needs 0 or more grade systems
    for (
      const idx in range(
        faker.number.int({ min: 0, max: g.length - 1 }),
      )
    ) {
      const system = g[idx];
      gradeDisiplineMap[discipline][system] = enumerateLinearPegMap(system);
    }
  }
  return gradeDisiplineMap as GradeSystemFake;
}

export const GradeDisiplineMap = initializeGradeSystems();
