// ===============================
// 1. Map Initialization
// ===============================
const map = L.map("map", {
  center: [28.61, 77.23],
  zoom: 11,
  minZoom: 10,
  maxBounds: [
    [28.30, 76.80], // South-West
    [28.90, 77.70]  // North-East
  ],
  maxBoundsViscosity: 1.0,
  zoomControl: false,
  attributionControl: false
});

// window map for external access
window.map = map;

// ---- Panes (layer priority control) ----
map.createPane("greenZonesPane");
map.getPane("greenZonesPane").style.zIndex = 600;

map.createPane("corridorsPane");
map.getPane("corridorsPane").style.zIndex = 550;

map.createPane("userPane");
map.getPane("userPane").style.zIndex = 750;

// ---- Base Map ----
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    subdomains: "abcd",
    maxZoom: 19
  }
).addTo(map);

map.getPane("tilePane").style.filter = "brightness(0.96) contrast(0.95)";

// Shared layers for external control
window.overlayLayers = {};

// ===============================
// 2 & 3. Data Integration (Anchors & Corridors)
// ===============================
Promise.all([
  fetch("http://127.0.0.1:5001/green-zones").then(res => res.json()),
  fetch("http://127.0.0.1:5001/corridors").then(res => res.json())
]).then(([anchorsData, corridorsData]) => {
  if (!anchorsData?.features || !corridorsData?.features) return;

  // --- Process Anchors (Base Parks - Visual Only) ---
  const greenLayer = L.geoJSON(anchorsData, {
    pane: "greenZonesPane",
    style: {
      fillColor: "#2e7d32",
      color: "#1b5e20",
      weight: 1,
      fillOpacity: 0.75
    }
  }).addTo(map);
  window.overlayLayers["Green Anchors"] = greenLayer;

  // --- Process Corridors ---
  const existingZoneIds = ['zone_13', 'zone_6', 'zone_4']; // User Zones 14, 7, 5
  const suggestedFeatures = corridorsData.features.filter(f => !existingZoneIds.includes(f.properties.id));
  const existingFeatures = corridorsData.features.filter(f => existingZoneIds.includes(f.properties.id));

  // 1. Collect all points of Existing Green Zones
  const implementedPoints = [];
  if (existingFeatures.length > 0) {
    const existingZonesLayer = L.geoJSON({ type: "FeatureCollection", features: existingFeatures }, {
      pane: "corridorsPane",
      style: { fillColor: "#00c853", fillOpacity: 0.8, color: "#1b5e20", weight: 3 },
      onEachFeature: (feature, layer) => {
        const zoneNum = parseInt(feature.properties.id.split('_')[1]) + 1;

        // Extract all points for edge-to-edge distance calculation
        const coords = feature.geometry.coordinates[0];
        coords.forEach(c => {
          implementedPoints.push(L.latLng(c[1], c[0]));
        });

        layer.bindTooltip(`<b>Zone ${zoneNum}</b> <span style="color:#4caf50">●</span><br>Status: Implemented`, { sticky: true });
      }
    }).addTo(map);
    window.overlayLayers["Existing Green Zones"] = existingZonesLayer;
  }

  // 2. AI Suggestions with Correct Perimeter Distance
  if (suggestedFeatures.length > 0) {
    const corridorLayer = L.geoJSON({ type: "FeatureCollection", features: suggestedFeatures }, {
      pane: "corridorsPane",
      style: { fillColor: "#ffea00", fillOpacity: 0.5, color: "#ff9100", weight: 2, dashArray: "10, 10" },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const zoneNum = parseInt(p.id.split('_')[1]) + 1;

        let minDistance = Infinity;
        const suggestedCoords = feature.geometry.coordinates[0];

        // Calculate the shortest distance between any vertex of the suggestion and any vertex of implemented zones
        // This simulates edge-to-edge proximity more accurately than center-to-center
        suggestedCoords.forEach(c_sug => {
          const sugPt = L.latLng(c_sug[1], c_sug[0]);
          implementedPoints.forEach(implPt => {
            const dist = sugPt.distanceTo(implPt);
            if (dist < minDistance) minDistance = dist;
          });
        });

        // Apply Penalty Logic (Distances < 500, 1000, 2000)
        let penalty = 0;
        if (minDistance < 500) penalty = 25;
        else if (minDistance < 1000) penalty = 15;
        else if (minDistance < 2000) penalty = 5;

        p.adjustedScore = Math.max(0, p.score - penalty);
        p.proximityPenalty = penalty;
        p.minDistance = minDistance;

        const distStr = minDistance === Infinity ? "N/A" : `${(minDistance / 1000).toFixed(2)} km`;

        layer.bindTooltip(
          `<b>Zone ${zoneNum}</b><br>
           AI Base Score: ${p.score}<br>
           Edge-to-Edge Dist: ${distStr}<br>
           Proximity Penalty: -${p.proximityPenalty}<br>
           <b>Final Priority: ${p.adjustedScore}</b>`,
          { sticky: true }
        );
      }
    }).addTo(map);

    window.overlayLayers["AI Suggested Corridors"] = corridorLayer;

    // Calculate Adjusted Priority Zone
    let highestAdjustedScore = -1;
    let priorityLayer = null;

    corridorLayer.getLayers().forEach(layer => {
      if (layer.feature.properties.adjustedScore > highestAdjustedScore) {
        highestAdjustedScore = layer.feature.properties.adjustedScore;
        priorityLayer = layer;
      }
    });

    if (priorityLayer) {
      const p = priorityLayer.feature.properties;
      window.priorityZone = {
        name: `Zone ${parseInt(p.id.split('_')[1]) + 1} (Score: ${p.adjustedScore})`,
        bounds: priorityLayer.getBounds()
      };
      window.dispatchEvent(new CustomEvent('priorityReady'));
    }
  }
});
