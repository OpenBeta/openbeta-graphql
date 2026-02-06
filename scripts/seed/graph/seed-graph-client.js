/**
 * Openbeta Seed Graph Client
 * Uses Sigma.js and Graphology for high-performance WebGL graph rendering.
 * Dependencies are loaded via importmap in index.html.
 */

import forceAtlas2 from 'https://esm.sh/graphology-layout-forceatlas2@0.10.1';
import FA2Layout from 'https://esm.sh/graphology-layout-forceatlas2@0.10.1/worker';
import Graph from 'https://esm.sh/graphology@0.26.0';
import { Sigma } from 'https://esm.sh/sigma@3.0.2';

let lastProcessedId = 0;
const graph = new Graph();
const pendingEdges = []; // Store edges where parent hasn't been seen yet
let renderer;
let fa2Layout;

const COLORS = {
  area: '#e67e22',
  climb: '#f1c40f',
  pitch: '#3498db',
  content: '#2980b9',
  organization: '#9b59b6',
  default: '#a4b0be',
};

/**
 * Fetches all new data from the server and updates the graphology instance.
 */
async function fetchAllData(statusEl) {
  try {
    let hasMore = true;
    let newNodesCount = 0;

    while (hasMore) {
      const url = `/graph-data?lastProcessedId=${lastProcessedId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      if (data.length === 0) {
        hasMore = false;
        break;
      }

      // Add nodes first
      data.forEach((item) => {
        const id = String(item.id);
        if (item.id > lastProcessedId) lastProcessedId = item.id;

        if (!graph.hasNode(id)) {
          let size = 2;
          if (item.type === 'area') size = 6;
          else if (item.type === 'climb') size = 4;
          else if (item.type === 'organization') size = 8;

          graph.addNode(id, {
            label: item.name || `Node ${id}`,
            x: Math.random() * 2000 - 1000,
            y: Math.random() * 2000 - 1000,
            size: size,
            color: COLORS[item.type] || COLORS.default,
            itemType: item.type,
          });
          newNodesCount++;
        }
      });

      // Track edges
      data.forEach((item) => {
        if (item.parent !== null && item.parent !== undefined) {
          pendingEdges.push({
            source: String(item.parent),
            target: String(item.id),
          });
        }
      });

      // Try to resolve pending edges
      for (let i = pendingEdges.length - 1; i >= 0; i--) {
        const { source, target } = pendingEdges[i];
        if (graph.hasNode(source) && graph.hasNode(target)) {
          if (!graph.hasEdge(source, target)) {
            graph.addEdge(source, target, { color: '#666', size: 1 });
          }
          pendingEdges.splice(i, 1);
        }
      }

      statusEl.innerText =
        `Loading: ${graph.order} nodes, ${graph.size} edges, ${pendingEdges.length} pending edges...`;

      if (data.length < 5000) {
        hasMore = false;
      }
    }

    if (newNodesCount > 0 || pendingEdges.length > 0) {
      statusEl.innerText = `Total: ${graph.order} nodes, ${graph.size} edges.`;
      if (!renderer) {
        initSigma();
      } else if (fa2Layout && !fa2Layout.isRunning()) {
        fa2Layout.start();
        setTimeout(() => fa2Layout.stop(), 5000);
      }
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
    statusEl.innerText = 'Error fetching data.';
  }
}

/**
 * Initializes the Sigma.js renderer and ForceAtlas2 layout.
 */
function initSigma() {
  const container = document.getElementById('sigma-container');

  renderer = new Sigma(graph, container, {
    renderEdgeLabels: false,
    labelThreshold: 10,
    labelSize: 12,
    labelWeight: 'bold',
    defaultEdgeColor: '#555',
    labelColor: { color: '#ffffff' },
  });

  // Setup ForceAtlas2 layout
  const settings = forceAtlas2.inferSettings(graph);
  fa2Layout = new FA2Layout(graph, {
    settings: {
      ...settings,
      gravity: 0.01,
      scalingRatio: 20,
      barnesHutOptimize: true,
      barnesHutTheta: 1.2,
      strongGravityMode: false,
      adjustSizes: false,
      slowDown: 1,
    },
  });

  fa2Layout.start();
}

async function init() {
  const statusEl = document.getElementById('status');
  await fetchAllData(statusEl);

  // Search functionality
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.oninput = () => {
      const query = searchInput.value.toLowerCase();
      if (query.length > 2) {
        const node = graph.nodes().find((n) =>
          (graph.getNodeAttribute(n, 'label') || '').toLowerCase().includes(
            query,
          )
        );
        if (node) {
          const nodeData = renderer.getNodeDisplayData(node);
          renderer.getCamera().animate({
            x: nodeData.x,
            y: nodeData.y,
            ratio: 0.1,
          }, { duration: 500 });
        }
      }
    };
  }

  // Add some controls to the legend area
  const controls = document.getElementById('controls');
  const btn = document.createElement('button');
  btn.innerText = 'Restart Layout';
  btn.style.marginTop = '10px';
  btn.style.display = 'block';
  btn.style.cursor = 'pointer';
  btn.onclick = () => {
    if (fa2Layout) {
      fa2Layout.start();
      setTimeout(() => fa2Layout.stop(), 10000);
    }
  };
  controls.appendChild(btn);
}

window.addEventListener('DOMContentLoaded', init);
