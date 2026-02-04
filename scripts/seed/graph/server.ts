import { EntityId } from 'beta/entity_model';
export type GraphNode = {
  author: EntityId;
  id: EntityId | string;
  name: string;
  type: 'area' | 'climb' | 'media' | 'content';
  children: GraphNode[];
};

export function graphServer(port: number, graph: GraphNode) {
  Bun.serve({
    port: port,
    fetch(request) {
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
        // Serve the graph data as JSON
        return new Response(JSON.stringify(graph), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(
    `Graph visualizer running at http://localhost:${port}.`
      + ` Open this URL in your browser manually to see the graph.`,
  );
}
