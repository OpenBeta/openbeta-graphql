import { faker } from '@faker-js/faker';
import { Database, user } from '@schema';
import * as turf from '@turf/turf';
import { range } from '__tests__/faker';
import { Actor } from 'beta/actor';
import { EntityAddressable } from 'beta/entity_model';
import { InferSelectModel } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import process from 'process';
import { UUIDTypes } from 'uuid';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const argv = yargs(hideBin(process.argv))
  .scriptName('seed')
  .usage('Usage: bun scripts/fake-seed.ts [options]')
  .option('graph', {
    describe: 'Run graph server',
    type: 'boolean',
    default: false,
  })
  .option('map', {
    describe: 'Run map server',
    type: 'boolean',
    default: false,
  })
  .option('verbose', {
    describe: 'Enable verbose logging',
    type: 'boolean',
    default: false,
    alias: 'v',
  })
  .option('querylog', {
    describe: 'Enable query logging',
    type: 'boolean',
    default: false,
  })
  .option('alphabetical', {
    describe: 'Sort countries alphabetically',
    type: 'boolean',
    default: false,
    alias: 'a',
  })
  .option('depth', {
    describe: 'Maximum depth for area tree generation',
    type: 'number',
    default: 5,
    alias: 'd',
  })
  .option('randomness', {
    describe: 'Randomness factor for area tree generation (0-1)',
    type: 'number',
    default: 0.7,
    alias: 'r',
  })
  .option('port', {
    describe: 'Port for graph/map server',
    type: 'number',
    default: 3000,
    alias: 'p',
  })
  .option('bredth', {
    describe: 'Maximum breadth for area tree generation',
    type: 'number',
    default: 10,
    alias: 'b',
  })
  .option('countries', {
    describe: 'Limit number of countries to generate',
    type: 'number',
    default: null,
    alias: 'c',
  })
  .option('initial-scatter-radius', {
    describe: 'Initial scatter radius for area generation (km)',
    type: 'number',
    default: 10,
    alias: 's',
  })
  .help('help')
  .alias('help', 'h')
  .parseSync();

// Validate graph and map options
if (argv.graph && argv.map) {
  console.error(
    'Error: --graph and --map are mutually exclusive. Please use only one.',
  );
  process.exit(1);
}

/**
 * Choose a random element from an array
 * @param from The array to choose from
 * @returns A random element from the array
 */
export function choose<T>(from: T[]): T {
  return from[Math.floor(Math.random() * from.length)];
}

/**
 * Logging function that only logs when verbose mode is enabled
 * @param message The message to log
 */
export function log(message: string) {
  if (argv.verbose) {
    console.log(message);
  }
}

/**
 * Calculate a point near the given center within a specified distance range
 * @param center The center point with x (longitude) and y (latitude)
 * @param minKm Minimum distance from the center
 * @param maxKm Maximum distance from the center
 * @returns A new point near the center
 */
export function getPointNearby(
  center: { x: number; y: number },
  minKm: number,
  maxKm: number,
) {
  const R = 6371; // Earth Radius in km
  const r = (minKm + Math.random() * (maxKm - minKm)) / R; // Angular distance in radians
  const t = Math.random() * 2 * Math.PI; // Random bearing

  const lat1 = (center.y * Math.PI) / 180;
  const lon1 = (center.x * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(r) + Math.cos(lat1) * Math.sin(r) * Math.cos(t),
  );
  const lon2 = lon1
    + Math.atan2(
      Math.sin(t) * Math.sin(r) * Math.cos(lat1),
      Math.cos(r) - Math.sin(lat1) * Math.sin(lat2),
    );

  const res = {
    x: (lon2 * 180) / Math.PI,
    y: (lat2 * 180) / Math.PI,
  };

  if (!res.x || !res.y) throw new Error('Bad nearby point');

  return res;
}

/**
 * Ensure country centroids are calculated and cached
 * @param worldGeoPath Path to the world geography JSON file
 * @returns A record of country centroids
 */
export async function ensureCentroids(
  worldGeoPath = './scripts/seed/map/world.geo.json',
): Promise<Record<string, { x: number; y: number }>> {
  const data = JSON.parse(await readFile(worldGeoPath, 'utf-8'));
  const countryCentroids: Record<string, { x: number; y: number }> = {};

  for (const feature of data.features) {
    if (feature.properties.iso_a3) {
      const center = turf.centerOfMass(feature);
      countryCentroids[feature.properties.iso_a2] = {
        x: center.geometry.coordinates[0],
        y: center.geometry.coordinates[1],
      };
    }
  }

  log(
    `Loaded centroids for ${Object.keys(countryCentroids).length} countries.`,
  );

  return countryCentroids;
}

class SeedingActor implements Actor {
  uuid: UUIDTypes;
  id: number;
  constructor(data: InferSelectModel<typeof user>) {
    this.uuid = data.uuid;
    this.id = data.id;
  }
  async mayEdit(ent: EntityAddressable) {
    return true;
  }
  async mayDelete(ent: EntityAddressable) {
    return true;
  }
  async mayRestore(ent: EntityAddressable) {
    return true;
  }
  async maySetLock(ent: EntityAddressable) {
    return true;
  }
}

export async function makeUsers(db: Database) {
  return await db
    .insert(user)
    .values(
      range(20).map((_) => ({
        username: faker.internet.username(),
        displayName: faker.internet.displayName(),
        email: faker.internet.email(),
      })),
    )
    .returning()
    .then((rows) => rows.map((d) => new SeedingActor(d)));
}
