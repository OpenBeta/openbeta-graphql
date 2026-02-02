// This script will run in the browser to render the D3.js graph

const canvas = d3
  .select('#graphCanvas')
  .attr('width', window.innerWidth)
  .attr('height', window.innerHeight);

const ctx = canvas.node().getContext('2d');

let simulation;
let d3Nodes = [];
let d3Edges = [];

let typeData = {
  'area': { color: '#ee5253', size: 7 },
  'climb': { color: '#f368e0', size: 5 },
  'user': { color: '#54a0ff', size: 7 },
  'world': { color: '#1dd1a1', size: 15 },
};

function userid(node) {
  return `user-${node.author}`
}

// Function to convert GraphNode to D3 Data format
function convertToD3Data(graphNode) {
  const links = [];
  const nodeMap = new Map(); // To ensure unique nodes and easy lookup

  const traverse = (node) => {
    // if (node.name == 'world') {
    //   return node.children.forEach((child) => traverse(child));
    // }

    if (!nodeMap.has(userid(node))) {
      nodeMap.set(userid(node), {
        id: userid(node),
        label: 'user',
        type: 'user',
        // Initialize position for new nodes,
        // if not already set by simulation
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      });
    }

    if (!nodeMap.has(node.id.toString())) {
      nodeMap.set(node.id.toString(), {
        id: node.id.toString(),
        label: node.name,
        type: node.type,
        // Initialize position for new nodes, if not already set by simulation
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      });
    }

    links.push({
      source: userid(node),
      target: node.id.toString(),
      type: 'user',
    });

    node.children.forEach((child) => {
      links.push({
        source: node.id.toString(),
        target: child.id.toString(),
        type: 'entity'
      });
      traverse(child);
    });
  };

  traverse(graphNode);
  return { nodes: Array.from(nodeMap.values()), edges: links };
}

function updateGraph(graphData) {
  const { nodes: newNodes, edges: newEdges } = convertToD3Data(graphData);

  // Update d3Nodes and d3Edges to reflect new data
  // Use a merge strategy to preserve existing node positions
  const oldNodesMap = new Map(d3Nodes.map((d) => [d.id, d]));
  d3Nodes = newNodes.map((newNode) => ({
    ...newNode,
    ...(oldNodesMap.get(newNode.id) || {}),
  }));

  // Update edges - simple replacement for now
  d3Edges = newEdges;

  if (!simulation) {
    simulation = d3
      .forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Edges).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force(
        'center',
        d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2),
      )
      .on('tick', ticked);
  } else {
    // Update simulation with new data
    simulation.nodes(d3Nodes);
    simulation.force('link')
      .links(d3Edges)
      .strength((d) => d.type == 'user' ? 0.01 : 1);
    simulation.alpha(1).restart(); // Reheat simulation
  }
}

function ticked() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Calculate bounding box of all nodes
  d3Nodes.forEach((node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  });

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;
  const padding = 50; // Padding around the graph

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (d3Nodes.length > 0) {
    const scaleX = (window.innerWidth - padding * 2) / graphWidth;
    const scaleY = (window.innerHeight - padding * 2) / graphHeight;
    scale = Math.min(scaleX, scaleY);
    // Handle cases where graphWidth or graphHeight might be zero (e.g., single node or linear graph)
    if (isNaN(scale) || !isFinite(scale)) scale = 1; // Fallback if division by zero or infinity

    // Ensure a minimum scale if the graph is very small, to prevent excessive zooming in
    scale = Math.min(scale, 1);

    translateX = window.innerWidth / 2 - (minX + graphWidth / 2) * scale;
    translateY = window.innerHeight / 2 - (minY + graphHeight / 2) * scale;
  }

  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);

  // Draw links
  ctx.beginPath();
  d3Edges.forEach((link) => {
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
  });
  ctx.strokeStyle = '#feca57';
  ctx.lineWidth = 1 / scale; // Adjust line width based on scale
  ctx.stroke();

  // Draw nodes
  d3Nodes.forEach((node) => {
    const nodeRadius = typeData[node.type].size / scale;

    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = typeData[node.type].color;
    ctx.fill();
    ctx.strokeStyle = '#222f3e';
    ctx.lineWidth = 1 / scale;
    ctx.stroke();

    // Draw node labels
    // ctx.fillStyle = "black";
    // ctx.font = `${10 / scale}px sans-serif`; // Adjust font size based on scale
    // ctx.textAlign = "center";
    // ctx.textBaseline = "middle";
    // ctx.fillText(node.label, node.x, node.y + (10 / scale)); // Offset label slightly below node
  });

  ctx.restore();
}

// Fetch graph data periodically
async function fetchGraphData() {
  try {
    const response = await fetch('/graph-data');
    const data = await response.json();
    updateGraph(data);
  } catch (error) {
    console.error('Error fetching graph data:', error);
  }
}

// Initial fetch and then refresh every 100ms
fetchGraphData();
setInterval(fetchGraphData, 100);

// Handle window resize
window.addEventListener('resize', () => {
  canvas.attr('width', window.innerWidth).attr('height', window.innerHeight);
  if (simulation) {
    simulation.force(
      'center',
      d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2),
    );
  }

  ticked();
});
