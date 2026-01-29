import { exec } from 'child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as path from 'path';

interface ClimbData {
  climb_id: string;
  climb_name: string;
  grade_yds: string | null;
  grade_vscale: string | null;
  grade_french: string | null;
  is_sport: boolean | null;
  is_trad: boolean | null;
  is_boulder: boolean | null;
  is_alpine: boolean | null;
  is_top_rope: boolean | null;
  country: string | null;
  state_province: string | null;
  region: string | null;
  area: string | null;
  crag: string | null;
  latitude: number | null;
  longitude: number | null;
  length_meters: number | null;
  bolts_count: number | null;
  first_ascent: string | null;
  safety: string | null;
  description: string | null;
}

async function execAsync<T>(command: string, empty: T) {
  return await new Promise<T>((resolve, reject) => {
    exec(command, { maxBuffer: 5 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        return reject(
          new Error(`DuckDB CLI execution failed: ${error.message}`),
        );
      }

      try {
        // The output is a JSON array string
        const data = JSON.parse(stdout) as T;
        resolve(data);
      } catch (parseError) {
        if (stdout.trim().length == 0) {
          resolve(empty);
        } else {
          reject(new Error(`Failed to parse DuckDB JSON output, ${stdout}`));
        }
      }
    });
  });
}

async function loadClimbsData(): Promise<ClimbData[]> {
  // openbeta-climbs.parquet is expected at the project root.
  // We use path.resolve to ensure the path is absolute regardless of the execution directory.
  const parquetFilePath = path.resolve(
    process.cwd(),
    './openbeta-climbs.parquet',
  );

  let collected: ClimbData[] = [];
  const pageSize = 1000;
  var done = false;
  var offset = 0;

  while (!done) {
    const sqlQuery =
      `SELECT * FROM read_parquet('${parquetFilePath}') LIMIT ${pageSize} OFFSET ${offset}`;
    const command = `duckdb -json -c "${sqlQuery}"`;

    const data = await execAsync(command, []);
    collected.push(...data);

    if (data.length < 10) {
      done = true;
    }

    offset += pageSize;
  }

  return collected;
}

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  console.log('Loading climbs data from parquet (This may take some time)...');
  const climbs = await loadClimbsData();
  console.log(`Successfully loaded ${climbs.length} climbs.`);
  for (const climb of climbs) {
    console.log(climb);
    process.exit(1);
  }
}

await main();
