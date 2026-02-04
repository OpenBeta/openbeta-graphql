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
  'area': { charge: -1000, color: '#ee5253', size: 7 },
  'climb': { charge: -500, color: '#f368e0', size: 5 },
  'media': { charge: -500, color: '#00d2d3', size: 3 },
  'content': { charge: -500, color: '#ecf0f1', size: 3 },
  'user': { charge: -200, color: '#54a0ff', size: 7 },
  'world': { charge: -20_000, color: '#1dd1a1', size: 15 },
};

const enabledNodeTypes = new Set(Object.keys(typeData));

function renderCheckboxes() {
  const container = d3.select('#nodeTypeCheckboxes');
  container.selectAll('*').remove(); // Clear existing checkboxes

  Object.keys(typeData).forEach((type) => {
    const label = container
      .append('label')
      .attr('for', `checkbox-${type}`);

    label
      .append('input')
      .attr('type', 'checkbox')
      .attr('id', `checkbox-${type}`)
      .attr('checked', true)
      .on('change', (event) => {
        if (event.target.checked) {
          enabledNodeTypes.add(type);
        } else {
          enabledNodeTypes.delete(type);
        }
        ticked(); // Re-render graph with updated filters
      });

    label.append('span').text(type);
  });
}

function userid(node) {
  return `user-${node.author}`
}

// Function to convert GraphNode to D3 Data format
function convertToD3Data(graphNode) {
  const links = [];
  const nodeMap = new Map(); // To ensure unique nodes and easy lookup

  const traverse = (node) => {
    if (node.name == 'world') {
      node.type = 'world'
    }

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

  const nodeTypeMap = new Map(d3Nodes.map((node) => [node.id, node.type]));

  const currentFilteredNodes = d3Nodes.filter((node) =>
    enabledNodeTypes.has(node.type),
  );
  const currentFilteredEdges = d3Edges.filter(
    (link) =>
      enabledNodeTypes.has(nodeTypeMap.get(link.source)) &&
      enabledNodeTypes.has(nodeTypeMap.get(link.target)),
  );

  if (!simulation) {
    simulation = d3
      .forceSimulation(currentFilteredNodes)
      .force('link', d3.forceLink(currentFilteredEdges).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength((node) => typeData[node.type].charge))
      .force('collide', d3.forceCollide().radius((node) => node.type === 'area' ? typeData[node.type].size * 2 : typeData[node.type].size))
      .force(
        'center',
        d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2),
      )
      .on('tick', ticked);
  } else {
    // Update simulation with new data
    simulation.nodes(currentFilteredNodes);
    simulation.force('link')
      .links(currentFilteredEdges)
      .strength((d) => {
        const sourceNodeType = nodeTypeMap.get(d.source.id);
        const targetNodeType = nodeTypeMap.get(d.target.id);
        if (sourceNodeType === 'user' || targetNodeType === 'user') {
          return 0.05;
        } else if (sourceNodeType === 'world' || targetNodeType === 'world') {
          return 0.35; // Weaker strength for world connections
        }
        return 0.7;
      });
    simulation.force('charge')
      .strength((node) => typeData[node.type].charge);
    simulation.force('collide')
      .radius((node) => node.type === 'area' ? typeData[node.type].size * 2 : typeData[node.type].size);

    simulation.alpha(1).restart(); // Reheat simulation
  }

}

function ticked() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const filteredNodes = d3Nodes.filter((node) =>
    enabledNodeTypes.has(node.type),
  );
  const filteredEdges = d3Edges.filter(
    (link) =>
      enabledNodeTypes.has(link.source.type) &&
      enabledNodeTypes.has(link.target.type),
  );

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Calculate bounding box of all nodes
  filteredNodes.forEach((node) => {
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

  if (filteredNodes.length > 0) {
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
  filteredEdges.forEach((link) => {
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
  });
  ctx.strokeStyle = '#feca57';
  ctx.lineWidth = 1 / scale; // Adjust line width based on scale
  ctx.stroke();

  // Draw nodes
  filteredNodes.forEach((node) => {
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

// Initial render of checkboxes
window.addEventListener('DOMContentLoaded', renderCheckboxes);

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
