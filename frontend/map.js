const map = L.map("map").setView([28.61, 77.23], 11);
map.createPane("greenZonesPane");
map.getPane("greenZonesPane").style.zIndex = 700;
map.getPane("greenZonesPane").style.pointerEvents = "auto";

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 19
  }
).addTo(map);
map.getPane('tilePane').style.filter = 'brightness(0.97) contrast(0.95)';
fetch("http://127.0.0.1:5000/green-zones")
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    console.log("Data received:", data);
    if (!data || !data.features || data.features.length === 0) {
      console.warn("No features found in GeoJSON data");
      return;
    }

    const greenLayer = L.geoJSON(data, {
      pane: "greenZonesPane",
      style: {
        fillColor: "#00c853",
        color: "#004d40",
        weight: 0,
        fillOpacity: 0.85
      },
      onEachFeature: function (feature, layer) {
        if (feature.properties) {
          const name = feature.properties.name || "Green Zone";
          const type = feature.properties.type || "Vegetation";
          layer.bindTooltip(`<b>${name}</b><br><span style="font-size:0.8em">${type}</span>`, {
            permanent: false,
            sticky: true,   // Follow the mouse
            offset: [20, 0], // Move to the right of the cursor
            className: "green-zone-label",
            opacity: 1
          });
        }

        layer.on({
          mouseover: function (e) {
            const layer = e.target;
            layer.setStyle({
              weight: 2,
              color: '#66bb6a',
              fillOpacity: 0.9
            });
          },
          mouseout: function (e) {
            const layer = e.target;
            greenLayer.resetStyle(layer);
          }
        });
      }
    }).addTo(map);

    // Important Locations (Hardcoded)
    const landmarks = [
      { name: "Connaught Place", lat: 28.6304, lon: 77.2177, type: "Commercial Hub" },
      { name: "India Gate", lat: 28.6129, lon: 77.2295, type: "Tourist Spot" },
      { name: "Lodhi Garden", lat: 28.5933, lon: 77.2219, type: "Green Zone" },
      { name: "Red Fort", lat: 28.6562, lon: 77.2410, type: "Heritage" },
      { name: "Qutub Minar", lat: 28.5244, lon: 77.1855, type: "Heritage" },
      { name: "Lotus Temple", lat: 28.5535, lon: 77.2588, type: "Tourist Spot" }
    ];

    /* 
    // Markers removed as per user request
    landmarks.forEach(loc => {
        L.marker([loc.lat, loc.lon])
         .bindTooltip(`<b>${loc.name}</b><br>${loc.type}`, { permanent: false, direction: "top", offset: [0, -10] })
         .addTo(map);
    });
    */

    const bounds = greenLayer.getBounds();
    console.log("Layer bounds:", bounds);
    if (bounds.isValid()) {
      map.fitBounds(bounds);
    } else {
      console.warn("Invalid bounds for green layer");
    }

    // 3. Add Layer Control
    const overlays = {
      "Existing Green Zones": greenLayer,
    };
    L.control.layers(null, overlays, { collapsed: false }).addTo(map);


    // --- User Suggestion Mode ---
    let suggestionMode = false;
    let suggestionPoints = [];
    const suggestionLayer = L.layerGroup().addTo(map);

    const checkBtn = L.control({ position: 'topright' });
    checkBtn.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      div.innerHTML = '<a href="#" title="Suggest a Corridor" style="font-size:18px; line-height:30px;">✍️</a>';
      div.style.backgroundColor = 'white';
      div.style.width = '30px';
      div.style.height = '30px';
      div.style.textAlign = 'center';
      div.style.cursor = 'pointer';

      div.onclick = function (e) {
        e.preventDefault();
        suggestionMode = !suggestionMode;
        if (suggestionMode) {
          div.style.backgroundColor = '#4caf50';
          div.style.color = 'white';
          map.getContainer().style.cursor = 'crosshair';
          alert("Mode Active: Click two points on the map to propose a corridor.");
        } else {
          div.style.backgroundColor = 'white';
          div.style.color = 'black';
          map.getContainer().style.cursor = '';
          suggestionPoints = [];
        }
      };
      return div;
    };
    checkBtn.addTo(map);

    map.on('click', function (e) {
      if (!suggestionMode) return;

      suggestionPoints.push(e.latlng);

      L.marker(e.latlng).addTo(suggestionLayer);

      if (suggestionPoints.length === 2) {
        const line = L.polyline(suggestionPoints, {
          color: '#9c27b0', // Purple for user suggestions
          weight: 4,
          dashArray: '5, 10'
        }).addTo(suggestionLayer);

        line.bindPopup("<b>User Proposal</b><br>Status: Under Review").openPopup();

        // Reset
        suggestionPoints = [];
        suggestionMode = false;
        map.getContainer().style.cursor = '';
        document.querySelector('.leaflet-control a[title="Suggest a Corridor"]').parentNode.style.backgroundColor = 'white';
        document.querySelector('.leaflet-control a[title="Suggest a Corridor"]').parentNode.style.color = 'black';
      }
    });
  })
  .catch(error => console.error("Error loading green zones:", error));
