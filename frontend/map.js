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
// window map for external access
window.map = map;

// -----------------------------
// Custom Map Controls Logic
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Zoom In
  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) btnZoomIn.onclick = () => map.zoomIn();

  // Zoom Out
  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) btnZoomOut.onclick = () => map.zoomOut();

  // My Location
  const btnLocate = document.getElementById('btn-location');
  if (btnLocate) {
    btnLocate.onclick = () => {
      btnLocate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Loading state
      map.locate({ setView: true, maxZoom: 15 });
    };

    // Location Found Event
    map.on('locationfound', (e) => {
      btnLocate.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>'; // Reset icon

      // Show marker
      L.circle(e.latlng, {
        color: '#1b5e20',
        fillColor: '#4caf50',
        fillOpacity: 0.5,
        radius: e.accuracy / 2
      }).addTo(map);

      L.popup()
        .setLatLng(e.latlng)
        .setContent("You are here")
        .openOn(map);
    });

    // Location Error Event
    map.on('locationerror', (e) => {
      btnLocate.innerHTML = '<i class="fa-solid fa-location-slash"></i>'; // Error icon
      alert("Location access denied or unavailable.");
      setTimeout(() => {
        btnLocate.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>'; // Reset after delay
      }, 3000);
    });
  }
});

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
  // Status-based classification
  const hardcodedExistingIds = ['zone_13', 'zone_6', 'zone_4']; // Original Hackathon User Zones

  const completedFeatures = [];
  const wipFeatures = [];
  const suggestedFeatures = [];

  corridorsData.features.forEach(f => {
    const p = f.properties;
    // Default to pending if undefined
    const status = p.status || 'pending';

    if (hardcodedExistingIds.includes(p.id) || status === 'completed') {
      completedFeatures.push(f);
    } else if (status === 'work-in-progress') {
      wipFeatures.push(f);
    } else {
      suggestedFeatures.push(f);
    }
  });

  // 1. Collect all points of Existing/Completed Green Zones for calculation
  const implementedPoints = [];
  if (completedFeatures.length > 0) {
    const existingZonesLayer = L.geoJSON({ type: "FeatureCollection", features: completedFeatures }, {
      pane: "corridorsPane", // Keep in corridors pane so it renders above base parks
      style: { fillColor: "#00c853", fillOpacity: 0.8, color: "#1b5e20", weight: 3 },
      onEachFeature: (feature, layer) => {
        const zoneNum = parseInt(feature.properties.id.split('_')[1]) + 1;

        // Extract all points for edge-to-edge distance calculation
        if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
          // Simplify point extraction
          const coords = feature.geometry.coordinates.flat(Infinity);
          for (let i = 0; i < coords.length; i += 2) {
            // simplistic flattening can be risky but works for extraction if uniform
            implementedPoints.push(L.latLng(coords[i + 1], coords[i]));
          }
        }

        layer.bindTooltip(`<b>${feature.properties.name || `Zone ${zoneNum}`}</b> <span style="color:#4caf50">●</span><br>Status: Existing/Completed`, { sticky: true });
      }
    }).addTo(map);
    window.overlayLayers["Existing Green Zones"] = existingZonesLayer;
  }

  // 2. Work In Progress Green Zones (NEW LAYER)
  if (wipFeatures.length > 0) {
    const wipLayer = L.geoJSON({ type: "FeatureCollection", features: wipFeatures }, {
      pane: "corridorsPane",
      style: {
        fillColor: "#69f0ae", // Lighter Green
        fillOpacity: 0.6,
        color: "#00e676",
        weight: 4,
        dashArray: "15, 15",
        dashOffset: "0"
      },
      onEachFeature: (feature, layer) => {
        const zoneNum = parseInt(feature.properties.id.split('_')[1]) + 1;
        layer.bindTooltip(`<b>${feature.properties.name || `Zone ${zoneNum}`}</b> <span style="color:#00e676">●</span><br>Status: Work In Progress`, { sticky: true });

        // Add Pulse Animation CSS Class if possible (requires advanced Leaflet or CSS trick)
        // For now just standard popup
        layer.bindPopup(`
            <div class="popup-content">
                <h3 style="color:#00e676"><i class="fa-solid fa-hammer"></i> Work In Progress</h3>
                <p><strong>${feature.properties.name || `Zone ${zoneNum}`}</strong> is currently being developed.</p>
                <div class="popup-stats">
                    <div><span>Area:</span> <strong>${feature.properties.area_sqkm} sq km</strong></div>
                </div>
            </div>
        `, { className: 'zone-popup' });
      }
    }).addTo(map);
    window.overlayLayers["Work In Progress"] = wipLayer;
  }

  // 3. AI Suggestions (Yellow/Orange)
  if (suggestedFeatures.length > 0) {
    const corridorLayer = L.geoJSON({ type: "FeatureCollection", features: suggestedFeatures }, {
      pane: "corridorsPane",
      style: { fillColor: "#ffea00", fillOpacity: 0.5, color: "#ff9100", weight: 2, dashArray: "5, 5" },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const zoneNum = parseInt(p.id.split('_')[1]) + 1;

        let minDistance = Infinity;

        // --- Distance Calculation Logic ---
        // Iterate through all points of this recommended zone
        const coords = feature.geometry.coordinates.flat(Infinity);
        for (let i = 0; i < coords.length; i += 2) {
          const sugPt = L.latLng(coords[i + 1], coords[i]);
          // Compare with Implemented Points
          // Performance note: fast brute force for <5 zones is fine.
          implementedPoints.forEach(implPt => {
            const dist = sugPt.distanceTo(implPt);
            if (dist < minDistance) minDistance = dist;
          });
        }


        // Apply Penalty Logic (Distances < 500, 1000, 2000)
        let penalty = 0;
        if (minDistance < 500) penalty = 25;
        else if (minDistance < 1000) penalty = 15;
        else if (minDistance < 2000) penalty = 5;

        p.adjustedScore = Math.max(0, p.score - penalty);
        p.proximityPenalty = penalty;
        p.minDistance = minDistance;



        const distStr = minDistance === Infinity ? "N/A" : `${(minDistance / 1000).toFixed(2)} km`;

        // Build Interventions List
        let interventionsHtml = "";
        if (p.recommendations && p.recommendations.length > 0) {
          interventionsHtml += `<div class="popup-interventions">
            <h4>Recommended Interventions</h4>
            <ul>`;
          p.recommendations.forEach(rec => {
            interventionsHtml += `
              <li>
                <strong>${rec.title}</strong>
                <p>${rec.description}</p>
              </li>`;
          });
          interventionsHtml += `</ul></div>`;
        }

        // Determine Priority Color
        let priorityColor = "#ff9800"; // Medium (Orange)
        if (p.priority_level === "High") priorityColor = "#f44336"; // Red
        else if (p.priority_level === "Low") priorityColor = "#4caf50"; // Green

        // Create interactive popup content
        const popupContent = `
          <div class="popup-content">
            <h3 class="popup-title">
              <span>${p.name || `Zone ${zoneNum}`}</span>
              <span class="priority-badge" style="background:${priorityColor}">${p.priority_level} Priority</span>
            </h3>
            
            <div class="popup-stats">
              <div>
                <span>Score: <i class="fa-solid fa-circle-info info-icon">
                    <span class="tooltip-text">
                        <span class="tooltip-title">AI Site Suitability Matrix</span>
                        <div style="margin-top:6px; line-height:1.6">
                            <div><b style="color:#4caf50">Spatial Viability:</b> Max 30pts</div>
                            <div><b style="color:#4caf50">Eco-Connectivity:</b> Max 30pts</div>
                            <div><b style="color:#4caf50">Urban Integration:</b> Max 25pts</div>
                            <div style="margin-topWW:4px; border-top:1px solid #555; padding-top:4px">
                                <b style="color:#ffeb3b">Social Impact Bonus:</b> +15pts
                            </div>
                        </div>
                    </span>
                </i></span> 
                <strong>${p.score}</strong>
              </div>
              <div><span>Adjusted:</span> <strong>${p.adjustedScore}</strong></div>
              <div><span>Distance:</span> ${distStr}</div>
              <div>
                <span>Penalty: <i class="fa-solid fa-circle-info info-icon">
                    <span class="tooltip-text">
                        <span class="tooltip-title">Proximity Penalty</span>
                        • < 500m to green zone: -25<br>
                        • < 1km to green zone: -15<br>
                        • < 2km to green zone: -5<br>
                        (Deducted from Base Score)
                    </span>
                </i></span> 
                -${p.proximityPenalty}
              </div>
            </div>

            ${interventionsHtml}
            
            <button class="btn-upvote" onclick="window.handleUpvote('${p.id}', this)">
              <i class="fa-solid fa-thumbs-up"></i> 
              Upvote 
              <span id="vote-count-${p.id}" class="vote-badge">${p.upvotes || 0}</span>
            </button>
          </div>
        `;

        layer.bindPopup(popupContent, {
          className: 'zone-popup',
          minWidth: 350
        });

        // Also keep a simpler tooltip for quick hover
        layer.bindTooltip(`<b>${p.name || `Zone ${zoneNum}`}</b><br>Score: ${p.adjustedScore}`, {
          sticky: true,
          direction: 'top',
          className: 'zone-tooltip'
        });


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
        name: `${p.name || `Zone ${parseInt(p.id.split('_')[1]) + 1}`} (Score: ${p.adjustedScore})`,
        bounds: priorityLayer.getBounds()
      };
      window.dispatchEvent(new CustomEvent('priorityReady'));
    }
  }
});
// ===============================
// 4. Map Interactions (Upvote)
// ===============================
window.handleUpvote = function (zoneId, btnElement) {
  // Visual feedback
  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Voting...';
  btnElement.disabled = true;

  fetch(`http://127.0.0.1:5001/upvote/${zoneId}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'upvoted') {
        // Update count in UI
        const countSpan = document.getElementById(`vote-count-${zoneId}`);
        if (countSpan) countSpan.innerText = data.count;

        // Update button state
        btnElement.innerHTML = `<i class="fa-solid fa-check"></i> Voted <span class="vote-badge">${data.count}</span>`;
        btnElement.classList.add('voted');

        // Update underlying data so it persists if popup reopens
        const layer = window.overlayLayers["AI Suggested Corridors"].getLayers().find(l => l.feature.properties.id === zoneId);
        if (layer) {
          layer.feature.properties.upvotes = data.count;
        }
      } else {
        alert("Failed to upvote. Try again.");
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
      }
    })
    .catch(err => {
      console.error(err);
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
    });
};



// ==========================================
// 5. User Zone Reporting (Polygon Drawing)
// ==========================================
let drawingMode = false;
let drawPoints = [];
let drawLinesLayer = null;
let drawMarkersLayer = L.layerGroup().addTo(map);

const btnReport = document.getElementById('btn-report-zone');
if (btnReport) {
  btnReport.onclick = toggleDrawingMode;
}

function toggleDrawingMode() {
  drawingMode = !drawingMode;
  const btn = document.getElementById('btn-report-zone');

  if (drawingMode) {
    // Enable
    btn.classList.add('active-tool');
    btn.innerHTML = '<i class="fa-solid fa-times"></i>'; // Change to cancel icon
    map.getContainer().style.cursor = 'crosshair';

    // Instructions
    L.popup()
      .setLatLng(map.getCenter())
      .setContent('<div style="text-align:center"><b>Click on the map</b> to add points.<br>Click the <b>first point</b> again to finish.<br>Click Cancel button to stop.</div>')
      .openOn(map);

    map.on('click', onMapClick);
  } else {
    // Disable / Reset
    resetDrawing();
  }
}

function resetDrawing() {
  drawingMode = false;
  drawPoints = [];
  if (drawLinesLayer) map.removeLayer(drawLinesLayer);
  drawLinesLayer = null;
  drawMarkersLayer.clearLayers();

  map.off('click', onMapClick);
  map.getContainer().style.cursor = '';

  const btn = document.getElementById('btn-report-zone');
  if (btn) {
    btn.classList.remove('active-tool');
    btn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
  }
}

function onMapClick(e) {
  const latlng = e.latlng;

  // Add point
  drawPoints.push([latlng.lat, latlng.lng]); // Leaflet format [lat, lng]

  // Add marker at point
  const marker = L.circleMarker(latlng, {
    color: '#1b5e20',
    fillColor: '#fff',
    fillOpacity: 1,
    radius: 4
  }).addTo(drawMarkersLayer);

  // Check for closing loop (if > 2 points and clicking near start)
  // Actually, simpler: Make the first marker clickable to close
  if (drawPoints.length === 1) {
    marker.setStyle({ color: 'red', radius: 6 });
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e); // Prevent map click
      finishDrawing();
    });
    marker.bindTooltip("Click here to close shape", { permanent: true, direction: 'top' }).openTooltip();
  }

  // Update Polyline
  if (drawLinesLayer) map.removeLayer(drawLinesLayer);
  drawLinesLayer = L.polyline(drawPoints, { color: '#1b5e20', dashArray: '5, 5' }).addTo(map);
}

function finishDrawing() {
  if (drawPoints.length < 3) {
    alert("Please select at least 3 points to define an area.");
    return;
  }

  // Open Modal
  document.getElementById('report-modal').style.display = 'flex';
}

// Modal Logic
window.closeReportModal = function () {
  document.getElementById('report-modal').style.display = 'none';
};

document.getElementById('report-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('report-name').value;
  const contact = document.getElementById('report-contact').value;
  const desc = document.getElementById('report-desc').value;

  // Convert Leaflet [lat, lng] to GeoJSON [lng, lat]
  // Also insure loop is closed
  const coords = drawPoints.map(p => [p[1], p[0]]);
  coords.push(coords[0]); // Close loop

  const geometry = {
    type: "Polygon",
    coordinates: [coords]
  };

  const payload = {
    name: name,
    contact: contact,
    description: desc,
    geometry: geometry
  };

  // Show loading
  const btnSubmit = e.target.querySelector('.btn-submit');
  const originalText = btnSubmit.innerText;
  btnSubmit.innerText = "Submitting...";
  btnSubmit.disabled = true;

  fetch('http://127.0.0.1:5001/report-zone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        alert("Report submitted successfully! It will appear as 'Pending' in the dashboard.");
        window.closeReportModal();
        resetDrawing();
        e.target.reset(); // Clear form
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Failed to submit report. Check console.");
    })
    .finally(() => {
      btnSubmit.innerText = originalText;
      btnSubmit.disabled = false;
    });
});
