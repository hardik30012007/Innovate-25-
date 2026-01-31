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
  maxBoundsViscosity: 1.0
});

// ---- Panes (layer priority control) ----
map.createPane("greenZonesPane");
map.getPane("greenZonesPane").style.zIndex = 600; // Anchors on top

map.createPane("corridorsPane");
map.getPane("corridorsPane").style.zIndex = 550; // Corridors below

map.createPane("userPane");
map.getPane("userPane").style.zIndex = 750;

// ---- Base Map ----
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19
  }
).addTo(map);

map.getPane("tilePane").style.filter = "brightness(0.96) contrast(0.95)";

// ---- Shared Layer Control (IMPORTANT) ----
const overlayLayers = {};
const layerControl = L.control.layers(null, overlayLayers, {
  collapsed: false
}).addTo(map);

// ===============================
// 2. Existing Green Zones (Anchors)
// ===============================
fetch("http://127.0.0.1:5001/green-zones")
  .then(res => res.json())
  .then(data => {
    if (!data?.features?.length) return;

    const greenLayer = L.geoJSON(data, {
      pane: "greenZonesPane",
      style: {
        fillColor: "#2e7d32",    // Dark forest green
        color: "#1b5e20",        // Very dark green border
        weight: 1,
        fillOpacity: 0.75
      },
      onEachFeature: (feature, layer) => {
        // No tooltip for green anchors - user doesn't want anchor details
        layer.on({
          mouseover: e =>
            e.target.setStyle({ weight: 2, fillOpacity: 0.95 }),
          mouseout: e => greenLayer.resetStyle(e.target)
        });
      }
    }).addTo(map);

    overlayLayers["Green Anchors"] = greenLayer;
    layerControl.addOverlay(greenLayer, "Green Anchors");

    const bounds = greenLayer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  });

// ===============================
// 3. AI Suggested Corridors
// ===============================
fetch("http://127.0.0.1:5001/corridors")
  .then(res => res.json())
  .then(data => {
    if (!data?.features?.length) return;

    // Hardcoded existing green zones (already implemented)
    // User refers to zones as 1-indexed (Zone 14, 7, 5)
    // But IDs are 0-indexed (zone_13, zone_6, zone_4)
    const existingZoneIds = ['zone_13', 'zone_6', 'zone_4'];

    // Style for existing green zones (bright green, solid, thick border)
    const existingZoneStyle = {
      fillColor: "#00c853",    // Bright green (same as old Green Anchors)
      fillOpacity: 0.8,
      color: "#1b5e20",        // Dark green border
      weight: 3
    };

    // Style for AI suggested corridors (yellow, dashed)
    const corridorStyle = (feature) => {
      return {
        fillColor: "#ffea00",   // Bright Yellow
        fillOpacity: 0.5,
        color: "#ff9100",       // Orange-Yellow border
        weight: 2,
        dashArray: "10, 10"     // Dashed border = Proposal
      };
    };

    // Separate features into existing and suggested
    const existingFeatures = data.features.filter(f =>
      existingZoneIds.includes(f.properties.id)
    );
    const suggestedFeatures = data.features.filter(f =>
      !existingZoneIds.includes(f.properties.id)
    );

    // Create Existing Green Zones layer
    if (existingFeatures.length > 0) {
      const existingZonesLayer = L.geoJSON({
        type: "FeatureCollection",
        features: existingFeatures
      }, {
        pane: "corridorsPane",
        style: existingZoneStyle,
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          const zoneNum = parseInt(p.id.split('_')[1]) + 1;

          // Check if connects to priority location (has landmarks)
          const hasPriorityLocation = p.nearby_landmarks && p.nearby_landmarks.length > 0;
          const priorityStatus = hasPriorityLocation ? "Yes" : "No";

          layer.bindTooltip(
            `<b>Zone ${zoneNum}</b> <span style="color:#4caf50">●</span><br>
             Area: ${p.area_sqkm} sq km<br>
             Connects: ${p.connected_anchors} parks<br>
             Priority Location: ${priorityStatus}<br>
             Score: ${p.score}<br>
             <small><i>Status: Implemented</i></small>`,
            { sticky: true }
          );
        }
      }).addTo(map);

      overlayLayers["Existing Green Zones"] = existingZonesLayer;
      layerControl.addOverlay(existingZonesLayer, "Existing Green Zones");
    }

    // Create AI Suggested Corridors layer
    if (suggestedFeatures.length > 0) {
      const corridorLayer = L.geoJSON({
        type: "FeatureCollection",
        features: suggestedFeatures
      }, {
        pane: "corridorsPane",
        style: corridorStyle,
        onEachFeature: (feature, layer) => {
          console.log("Adding corridor feature:", feature.properties.id);
          const p = feature.properties;
          const zoneNum = parseInt(p.id.split('_')[1]) + 1;

          // Check if connects to priority location (has landmarks)
          const hasPriorityLocation = p.nearby_landmarks && p.nearby_landmarks.length > 0;
          const priorityStatus = hasPriorityLocation ? "Yes" : "No";

          layer.bindTooltip(
            `<b>Zone ${zoneNum}</b><br>
             Area: ${p.area_sqkm} sq km<br>
             Connects: ${p.connected_anchors} parks<br>
             Priority Location: ${priorityStatus}<br>
             Score: ${p.score}`,
            { sticky: true }
          );
        }
      }).addTo(map);

      overlayLayers["AI Suggested Corridors"] = corridorLayer;
      layerControl.addOverlay(corridorLayer, "AI Suggested Corridors");
    }
  });

// ===============================
// 4. User Suggestion Mode
// ===============================
let suggestionMode = false;
let suggestionPoints = [];
const suggestionLayer = L.layerGroup({ pane: "userPane" }).addTo(map);

const suggestControl = L.control({ position: "topright" });
suggestControl.onAdd = function () {
  const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
  div.innerHTML = "✍️";
  div.title = "Suggest a Green Corridor";
  div.style.cssText =
    "background:white;width:34px;height:34px;line-height:34px;text-align:center;cursor:pointer;font-size:18px";

  div.onclick = e => {
    e.preventDefault();
    suggestionMode = !suggestionMode;
    div.style.background = suggestionMode ? "#4caf50" : "white";
    div.style.color = suggestionMode ? "white" : "black";
    map.getContainer().style.cursor = suggestionMode ? "crosshair" : "";

    if (!suggestionMode) {
      suggestionPoints = [];
      suggestionLayer.clearLayers();
    } else {
      alert("Click TWO points to suggest a corridor");
    }
  };
  return div;
};
suggestControl.addTo(map);

map.on("click", e => {
  if (!suggestionMode) return;

  suggestionPoints.push(e.latlng);

  L.circleMarker(e.latlng, {
    pane: "userPane",
    radius: 5,
    color: "#9c27b0",
    fillOpacity: 1
  }).addTo(suggestionLayer);

  if (suggestionPoints.length === 2) {
    L.polyline(suggestionPoints, {
      pane: "userPane",
      color: "#9c27b0",
      weight: 4,
      dashArray: "6,8"
    })
      .addTo(suggestionLayer)
      .bindPopup("<b>User Suggested Corridor</b><br>Status: Under Review")
      .openPopup();

    suggestionPoints = [];
    suggestionMode = false;
    map.getContainer().style.cursor = "";
  }
});
