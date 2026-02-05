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

async function loadWorldMap() {
  try {
    const worldData = await d3.json('/scripts/seed/map/world.geo.json');

    context.globalAlpha = 1;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#6F1E51'; // Background color
    context.fillRect(0, 0, width, height);

    context.beginPath();
    path(worldData);
    context.fillStyle = '#B53471'; // Fill color for countries
    context.strokeStyle = '#833471'; // Border color for countries
    context.lineWidth = 0.5;
    context.fill();
    context.stroke();

    // for (const point of await fetch('/centroids').then(r => r.json()).then(d => Object.values(d))) {
    //   const [lon, lat] = projection([point.x, point.y]);
    //     context.beginPath();
    //     context.arc(lon, lat, 2, 0, 2 * Math.PI);
    //     context.fillStyle = "#0c2461";
    //     context.globalAlpha = 0.5;
    //     context.fill();
    // }
  } catch (error) {
    console.error('Error loading the world map data:', error);
    document.getElementById('map-canvas').innerText =
      'Error loading world map.';
  }
}

async function drawNewEntities(newEntities) {
  const colors = ['#F79F1F'];
  for (const entity of newEntities) {
    if (entity.location) {
      const [x, y] = [entity.location.x, entity.location.y];
      const [lon, lat] = projection([x, y]);

      if (!x || !y || !lat || !lon) {
        console.error('MISSING COORDS', { entity, x, y, lon, lat });
      }

      if (lon && lat) {
        context.beginPath();
        context.arc(lon, lat, 1, 0, 2 * Math.PI);
        context.fillStyle = colors[entity.id % colors.length];
        context.globalAlpha = 0.3;
        context.fill();
        await new Promise((res, _) => res());
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
