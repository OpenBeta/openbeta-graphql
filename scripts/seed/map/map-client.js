console.log('Map client loaded.');

const width = window.innerWidth;
const height = window.innerHeight;

const canvas = d3
  .select('#map-canvas')
  .attr('width', width)
  .attr('height', height)
  .node();

const context = canvas.getContext('2d');

const projection = d3
  .geoMercator()
  .scale(width / 2 / Math.PI)
  .translate([width / 2, height / 2]);

const path = d3
  .geoPath()
  .projection(projection)
  .context(context);

let lastProcessedId = 0;
const entityMap = new Map();

async function loadWorldMap() {
  try {
    const worldData = await d3.json('/scripts/seed/map/world.geo.json');

    context.globalAlpha = 1;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#1e272e'; // Darker background
    context.fillRect(0, 0, width, height);

    context.beginPath();
    path(worldData);
    context.fillStyle = '#2f3542'; // Darker countries
    context.strokeStyle = '#57606f'; // Muted borders
    context.lineWidth = 0.5;
    context.fill();
    context.stroke();
  } catch (error) {
    console.error('Error loading the world map data:', error);
    document.getElementById('map-canvas').innerText =
      'Error loading world map.';
  }
}

async function drawNewEntities(newEntities) {
  const colors = {
    area: '#e67e22',
    climb: '#f1c40f',
    default: '#F79F1F',
  };

  for (const entity of newEntities) {
    const loc = entity.location;
    if (loc && typeof loc.x === 'number' && typeof loc.y === 'number') {
      let [lon, lat] = projection([loc.x, loc.y]);

      if (isFinite(lon) && isFinite(lat)) {
        entityMap.set(String(entity.id), entity);
        entity.screenPos = [lon, lat];

        // Draw edge to parent with very high transparency
        if (entity.parent && entityMap.has(String(entity.parent))) {
          const parent = entityMap.get(String(entity.parent));
          if (parent.screenPos) {
            context.beginPath();
            context.moveTo(lon, lat);
            context.lineTo(parent.screenPos[0], parent.screenPos[1]);
            context.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            context.lineWidth = 0.3;
            context.stroke();
          }
        }

        // Draw entity node - smaller and more transparent
        context.beginPath();
        context.arc(lon, lat, 0.6, 0, 2 * Math.PI);
        context.fillStyle = colors.default;
        context.globalAlpha = 0.2;
        context.fill();
      }
    }
  }
}

async function fetchMapData() {
  try {
    const response = await fetch(
      `/map-data?lastProcessedId=${lastProcessedId}`,
    );
    const newEntities = await response.json();

    if (newEntities.length > 0) {
      drawNewEntities(newEntities);

      const maxId = Math.max(...newEntities.map((e) => e.id));
      if (isFinite(maxId)) {
        lastProcessedId = maxId;
      }
      console.log(
        `Loaded ${newEntities.length} new entities. New lastProcessedId: ${lastProcessedId}`,
      );
    }
  } catch (error) {
    console.error('Error fetching map data:', error);
  }
}

loadWorldMap();
setInterval(fetchMapData, 100);
