const map = L.map("map").setView([28.61, 77.23], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

fetch("http://localhost:5000/green-zones")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: "green",
        fillOpacity: 0.5
      }
    }).addTo(map);
  });
