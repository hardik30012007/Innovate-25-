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
        fillColor: "#00c853",
        color: "#1b5e20",
        weight: 1,
        fillOpacity: 0.85
      },
      onEachFeature: (feature, layer) => {
        const area = feature.properties?.area_sqm
          ? `${Math.round(feature.properties.area_sqm / 10000)} ha`
          : "Large Green Area";

        layer.bindTooltip(
          `<b>Green Anchor</b><br><small>${area}</small>`,
          { sticky: true }
        );

        layer.on({
          mouseover: e =>
            e.target.setStyle({ weight: 2, fillOpacity: 0.95 }),
          mouseout: e => greenLayer.resetStyle(e.target)
        });
      }
    }).addTo(map);

    overlayLayers["Existing Green Zones"] = greenLayer;
    layerControl.addOverlay(greenLayer, "Existing Green Zones");

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

    function corridorStyle(feature) {
      // Yellow/Gold "Proposal Zone" style
      return {
        fillColor: "#ffea00",   // Bright Yellow
        fillOpacity: 0.5,       // Increased opacity for visibility check
        color: "#ff9100",       // Orange-Yellow border
        weight: 2,
        dashArray: "10, 10"     // Dashed border = Proposal
      };
    }

    const corridorLayer = L.geoJSON(data, {
      pane: "corridorsPane",
      style: corridorStyle,
      onEachFeature: (feature, layer) => {
        console.log("Adding corridor feature:", feature.properties.id);
        const p = feature.properties;
        layer.bindTooltip(
          `<b>AI Green Corridor</b><br>
           Distance: ${p.distance_m} m<br>
           Score: ${p.score}<br>
           Serves: ${p.served_locations?.join(", ") || "General Area"}`,
          { sticky: true }
        );
      }
    }).addTo(map);

    overlayLayers["AI Suggested Corridors"] = corridorLayer;
    layerControl.addOverlay(corridorLayer, "AI Suggested Corridors");
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
