import { area, climb, Database, entity } from '@schema';
import { EntityId } from 'beta/entity_model';
import { and, eq, gt, or, sql } from 'drizzle-orm';
import { ensureCentroids, geoFile } from '../utils';

export function mapServer(port: number, db: Database) {
  Bun.serve({
    port: port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === '/') {
        return new Response(Bun.file('./scripts/seed/map/index.html'));
      }

      if (url.pathname === '/map-client.js') {
        return new Response(Bun.file('./scripts/seed/map/map-client.js'));
      }

      if (url.pathname === '/centroids') {
        return new Response(JSON.stringify(await ensureCentroids()), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (url.pathname === '/scripts/seed/map/world.geo.json') {
        return new Response(Bun.file(geoFile));
      }

      if (url.pathname === '/map-data') {
        const lastProcessedId = parseInt(
          url.searchParams.get('lastProcessedId') || '0',
        );
        const data = await db
          .select({
            location:
              sql`json_build_object('x', ST_X(coalesce(${area.location}, ${climb.location})), 'y', ST_Y(coalesce(${area.location}, ${climb.location})))`,
            id: entity.id,
          })
          .from(entity)
          .leftJoin(area, eq(entity.id, area.id))
          .leftJoin(climb, eq(entity.id, climb.id))
          .where(
            and(
              gt(entity.id, lastProcessedId),
              or(
                eq(entity.entityType, 'area'),
                eq(entity.entityType, 'climb'),
              ),
            ),
          )
          .limit(500);

        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(
    `Map visualizer running at http://localhost:${port}.`
      + ` Open this URL in your browser manually to see the map.`,
  );
}
