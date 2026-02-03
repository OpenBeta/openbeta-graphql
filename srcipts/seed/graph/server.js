"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphServer = graphServer;
function graphServer(port, graph) {
    // @ts-ignore
    Bun.serve({
        port: port,
        // @ts-ignore
        fetch: function (request) {
            var url = new URL(request.url);
            if (url.pathname === '/') {
                // @ts-ignore
                return new Response(Bun.file('./scripts/seed/graph/index.html'));
            }
            if (url.pathname === '/seed-graph-client.js') {
                // @ts-ignore
                return new Response(Bun.file('./scripts/seed/seed-graph-client.js'));
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
    console.log("Graph visualizer running at http://localhost:".concat(port, ".")
        + " Open this URL in your browser manually to see the graph.");
}
