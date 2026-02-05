import * as schema from '@schema';
import { Database } from '@schema';
import { EntityId } from 'beta/entity_model';
import { and, eq, gt, ne } from 'drizzle-orm';
export type GraphNode = {
  author: EntityId;
  id: EntityId | string;
  name: string;
  type: 'area' | 'climb' | 'media' | 'content';
  children: GraphNode[];
};

export function graphServer(port: number, db: Database) {
  Bun.serve({
    port: port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === '/') {
        return new Response(Bun.file('./scripts/seed/graph/index.html'));
      }

      if (url.pathname === '/seed-graph-client.js') {
        return new Response(
          Bun.file('./scripts/seed/graph/seed-graph-client.js'),
        );
      }

      if (url.pathname === '/graph-data') {
        const lastProcessedId = parseInt(
          url.searchParams.get('lastProcessedId') || '0',
        );
        // Serve the graph data as JSON
        return new Response(
          JSON.stringify(
            await db
              .select({
                id: schema.entity.id,
                parent: schema.entity.parent,
                name: schema.entity.name,
                type: schema.entity.entityType,
              })
              .from(schema.entity)
              .where(
                and(
                  gt(
                    schema
                      .entity
                      .id,
                    lastProcessedId,
                  ),
                  ne(schema.entity.entityType, 'content'),
                ),
              ),
          ),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(
    `Graph visualizer running at http://localhost:${port}.`
      + ` Open this URL in your browser manually to see the graph.`,
  );
}
