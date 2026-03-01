import { faker } from '@faker-js/faker';
import { Database, user } from '@schema';
import { Spinner } from '@topcli/spinner';
import * as turf from '@turf/turf';
import {
  bbox,
  booleanPointInPolygon,
  featureCollection,
  randomPoint,
} from '@turf/turf';
import { range } from '__tests__/faker';
import { Actor } from 'beta/actor';
import { EntityAddressable, EntityStructure } from 'beta/entity_model';
import { countries, TCountryCode } from 'countries-list';
import { InferSelectModel } from 'drizzle-orm';
import { Feature, FeatureCollection, Polygon } from 'geojson';
import { exists, readFile } from 'node:fs/promises';
import process from 'process';
import { UUIDTypes } from 'uuid';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { argv } from './args';

const big = './scripts/seed/map/big.geo.json';
const small = './scripts/seed/map/world.geo.json';
export const geoFile = await exists(big) ? big : small;

// Validate graph and map options
if (argv.graph && argv.map) {
  console.error(
    'Error: --graph and --map are mutually exclusive. Please use only one.',
  );
  process.exit(1);
}

export function loadCountryCodes() {
  let countryCodes = Object.keys(countries) as TCountryCode[];
  if (argv.alphabetical) {
    countryCodes.sort((a, b) =>
      countries[a].name.localeCompare(countries[b].name)
    );
  } else {
    // Randomize if not alphabetical
    countryCodes = countryCodes.sort(() => Math.random() - 0.5);
  }

  if (argv.countries !== null) {
    countryCodes = countryCodes.slice(0, argv.countries);
  }
  return countryCodes;
}

export function generateRandomPointsInPolygon(polygon: Polygon, count: number) {
  const box = bbox(polygon);
  const points = [];
  let attempts = 0;

  while (points.length < count && attempts < count * 10) {
    // Generate a random point within the bbox
    const randomPt = randomPoint(1, { bbox: box }).features[0];
    if (booleanPointInPolygon(randomPt, polygon)) {
      points.push(randomPt);
    }
    attempts++;
  }

  return featureCollection(points);
}

export function subdividePolygonFeature(
  polygon: Polygon,
  numSubfeatures: number,
): Polygon[] {
  // Validate input
  if (numSubfeatures < 1) {
    return [polygon];
  }
  const randomPoints = generateRandomPointsInPolygon(polygon, numSubfeatures);
  // Create Voronoi polygons from these points, clipped to the original feature
  const voronoi = turf.voronoi(randomPoints, {
    bbox: turf.bbox(polygon),
  });
  // Map Voronoi polygons
  return voronoi.features.map((subPolygon) => subPolygon.geometry);
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
 * Ensure country centroids are calculated and cached
 * @param worldGeoPath Path to the world geography JSON file
 * @returns A record of country centroids
 */
export async function ensureCentroids(
  worldGeoPath = geoFile,
): Promise<Record<string, { x: number; y: number }>> {
  const data = JSON.parse(await readFile(worldGeoPath, 'utf-8'));
  const countryCentroids: Record<string, { x: number; y: number }> = {};

  for (const feature of data.features) {
    if (feature.properties.iso_a2) {
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
  async mayCreate(ent: EntityStructure) {
    return true;
  }
}

function flip<T>(maybe: T) {
  if (Math.random() > 0.5) return maybe;
}

export async function makeUsers(db: Database) {
  return await db
    .insert(user)
    .values(
      range(50).map((_) => ({
        username: faker.internet.username(),
        email: faker.internet.email(),
        displayName: flip(faker.internet.displayName()),
        website: flip(faker.internet.url()),
        bio: flip(faker.lorem.paragraph()),
        avatar: flip(faker.image.avatar()),
      })),
    )
    .returning()
    .then((rows) => rows.map((d) => new SeedingActor(d)));
}

export async function slc(
  db: Database,
  func: (db: Database) => Promise<any>,
) {
  let spinner = new Spinner().start(func.name);
  return await func(db)
    .then(() => spinner.succeed())
    .catch((err) => {
      spinner.failed(`${func.name}: ${err}`);
      throw err;
    });
}
