// Initialize map centered on Delhi
const map = L.map("map").setView([28.6139, 77.2090], 12);

// OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Example existing green zone
L.circle([28.6129, 77.2295], {
  color: "green",
  fillColor: "#3cb371",
  fillOpacity: 0.5,
  radius: 300
}).addTo(map).bindPopup("Existing Green Zone");

// Click event for suggesting new green zone
map.on("click", function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  const popupContent = `
    <b>Suggest Green Zone</b><br/>
    Lat: ${lat.toFixed(4)}<br/>
    Lng: ${lng.toFixed(4)}<br/>
    <button class="popup-btn" onclick="getAISuggestion(${lat}, ${lng})">
      AI Suggest Reason
    </button>
    <div id="ai-response"></div>
  `;

  L.popup()
    .setLatLng(e.latlng)
    .setContent(popupContent)
    .openOn(map);
});