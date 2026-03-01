import { disciplineEnum } from 'db/schema/gradeTable';
import * as dotenv from 'dotenv';
import { asc, eq, lt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as schema from '../src/db/schema';
import { seedDefaultGrades } from './gradeManager/grades';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

const argv = yargs(hideBin(process.argv))
  .option('defaults', {
    type: 'boolean',
    description: 'Seed default grade systems and grades',
  })
  .option('port', {
    type: 'number',
    default: 3000,
    description: 'Port to run the server on',
  })
  .parseSync();

async function main() {
  if (argv.defaults) {
    await seedDefaultGrades(db);
  }

  const port = argv.port;

  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === '/api/grades' && request.method === 'GET') {
        const systems = await db.select().from(schema.gradeSystem);
        const grades = await db
          .select()
          .from(schema.grade)
          .orderBy(asc(schema.grade.system));
        const pegs = await db.select().from(schema.gradePeg);
        const disciplines = schema.enums.Discipline.enumValues;

        return new Response(
          JSON.stringify({ systems, grades, pegs, disciplines }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (url.pathname === '/api/pegs' && request.method === 'POST') {
        const body = (await request.json()) as {
          systemId: number;
          gradeId: number;
          peg: string;
        };
        const { systemId, gradeId, peg } = body;

        if (peg === '') {
          return new Response(
            JSON.stringify({ success: false, error: 'Peg cannot be empty' }),
            { status: 400 },
          );
        }

        await db
          .insert(schema.gradePeg)
          .values({ system: systemId, grade: gradeId, peg: parseInt(peg) })
          .onConflictDoUpdate({
            target: [schema.gradePeg.system, schema.gradePeg.grade],
            set: { peg: parseInt(peg) },
          });

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (
        url.pathname === '/api/grades/upload'
        && request.method === 'POST'
      ) {
        const body = (await request.json()) as {
          id: number;
          systemId: number;
          pegValueLow: number;
        }[];

        await db.transaction(async (tx) => {
          // Pass 1: Move to temporary negative values to avoid unique constraint violations
          for (const item of body) {
            await tx
              .update(schema.grade)
              .set({ pegValueLow: -1 * item.id })
              .where(eq(schema.grade.id, item.id));
          }

          // Pass 2: Set final values and update peg table
          for (const item of body) {
            await tx
              .update(schema.grade)
              .set({ pegValueLow: item.pegValueLow })
              .where(eq(schema.grade.id, item.id));

            await tx
              .insert(schema.gradePeg)
              .values({
                system: item.systemId,
                grade: item.id,
                peg: item.pegValueLow,
              })
              .onConflictDoUpdate({
                target: [schema.gradePeg.system, schema.gradePeg.grade],
                set: { peg: item.pegValueLow },
              });
          }
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (
        url.pathname === '/api/grades/update-peg-low'
        && request.method === 'POST'
      ) {
        const body = (await request.json()) as {
          id: number;
          pegValueLow: number;
        };
        const { id, pegValueLow } = body;

        await db
          .update(schema.grade)
          .set({ pegValueLow })
          .where(eq(schema.grade.id, id));

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/') {
        return new Response(Bun.file('./scripts/gradeManager/index.html'));
      }

      if (url.pathname === '/grade-client.js') {
        return new Response(Bun.file('./scripts/gradeManager/grade-client.js'));
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log('Grade Manager running at http://localhost:' + port);
}

main().catch((err) => {
  console.error('Error starting Grade Manager:', err);
  process.exit(1);
});
