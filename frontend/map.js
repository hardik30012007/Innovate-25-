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
map.getPane("greenZonesPane").style.zIndex = 600; // Anchors on top

map.createPane("corridorsPane");
map.getPane("corridorsPane").style.zIndex = 550; // Corridors below

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

    window.overlayLayers["Green Anchors"] = greenLayer;

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

      window.overlayLayers["Existing Green Zones"] = existingZonesLayer;
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

      window.overlayLayers["AI Suggested Corridors"] = corridorLayer;
    }
  });

// ===============================
// 4. Map Polish & UX
// ===============================
// (Removed User Suggestion Mode as per requirements)
