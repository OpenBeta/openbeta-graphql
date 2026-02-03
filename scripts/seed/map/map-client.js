
console.log("Map client loaded.");

const width = window.innerWidth;
const height = window.innerHeight;

const canvas = d3.select("#map-canvas")
  .attr("width", width)
  .attr("height", height)
  .node();

const context = canvas.getContext("2d");

const projection = d3.geoMercator()
  .scale(width / 2 / Math.PI)
  .translate([width / 2, height / 2]);

const path = d3.geoPath()
  .projection(projection)
  .context(context);

let lastProcessedId = 0;

async function loadWorldMap() {
  try {
    const worldData = await d3.json("/scripts/seed/map/world.geo.json");

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#e55039"; // Background color
    context.fillRect(0, 0, width, height);

    context.beginPath();
    path(worldData);
    context.fillStyle = "#b71540"; // Fill color for countries
    context.strokeStyle = "#e55039"; // Border color for countries
    context.lineWidth = 0.5;
    context.fill();
    context.stroke();

  } catch (error) {
    console.error("Error loading the world map data:", error);
    document.getElementById('map-canvas').innerText = "Error loading world map.";
  }
}

function drawNewEntities(newEntities) {
  newEntities.forEach(entity => {
    if (entity.location) {
      const [x, y] = [entity.location.x, entity.location.y];
      const [lon, lat] = projection([x, y]);

      if (lon && lat) {
        context.beginPath();
        context.arc(lon, lat, 1, 0, 2 * Math.PI);
        context.fillStyle = "#f6b93b";
        context.globalAlpha = 0.2;
        context.fill();
      }
    }
  });
}

async function fetchMapData() {
  try {
    const response = await fetch(`/map-data?lastProcessedId=${lastProcessedId}`);
    const newEntities = await response.json();

    if (newEntities.length > 0) {
      drawNewEntities(newEntities);

      const maxId = Math.max(...newEntities.map(e => e.id));
      if (isFinite(maxId)) {
        lastProcessedId = maxId;
      }
      console.log(`Loaded ${newEntities.length} new entities. New lastProcessedId: ${lastProcessedId}`);
    }
  } catch (error) {
    console.error("Error fetching map data:", error);
  }
}

loadWorldMap();
setInterval(fetchMapData, 1000); // Fetch new data every second
