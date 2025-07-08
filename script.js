const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImE0OTAzMjUwYjA2YzRhZjY4NzViNzYxMmUwYjRjYjhmIiwiaCI6Im11cm11cjY0In0="; // Replace with your key

let map = L.map('map').setView([20.5937, 78.9629], 5);
let routeLayer;
window.userLocation = null;

// Load map tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Get current location
navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  window.userLocation = { lat, lng: lon };

  map.setView([lat, lon], 15);
  L.marker([lat, lon]).addTo(map).bindPopup("📍 You are here").openPopup();
  searchNearby(lat, lon);
}, () => {
  alert("Could not get your location.");
});

// Search nearby pharmacies using Nominatim
function searchNearby(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=pharmacy&limit=10&bounded=1&viewbox=${lon-0.01},${lat+0.01},${lon+0.01},${lat-0.01}`;
  fetch(url, {
    headers: {
      'User-Agent': 'MedicalMapApp (student project)'
    }
  })
  .then(res => res.json())
  .then(data => {
    data.forEach(place => {
      const marker = L.marker([place.lat, place.lon]).addTo(map);
      marker.bindPopup(`🏥 ${place.display_name}`);

      marker.on('click', () => {
        if (window.userLocation) {
          getRoute(
            [window.userLocation.lng, window.userLocation.lat],
            [place.lon, place.lat],
            place.display_name
          );
        }
      });
    });
  });
}

// Manual location search
document.getElementById('search-btn').addEventListener('click', () => {
  const query = document.getElementById('search-box').value;
  if (!query) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
    .then(res => res.json())
    .then(results => {
      if (results.length === 0) return alert("Location not found.");
      const lat = parseFloat(results[0].lat);
      const lon = parseFloat(results[0].lon);
      map.setView([lat, lon], 15);
      searchNearby(lat, lon);
    });
});

// Get route and directions
function getRoute(startCoords, endCoords, destinationName) {
  if (routeLayer) map.removeLayer(routeLayer);

  const body = {
    coordinates: [
      startCoords.map(Number),
      endCoords.map(Number)
    ],
    instructions: true
  };

  fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  .then(res => res.json())
  .then(data => {
    // Draw route
    routeLayer = L.geoJSON(data, {
      style: {
        color: 'blue',
        weight: 4
      }
    }).addTo(map);

    // Show directions
    const steps = data.features[0].properties.segments[0].steps;
    const stepsList = document.getElementById('steps-list');
    stepsList.innerHTML = "";

    steps.forEach(step => {
      const li = document.createElement("li");
      li.innerText = `${step.instruction} (${Math.round(step.distance)} m)`;
      stepsList.appendChild(li);
    });

    // Optional alert
    const summary = data.features[0].properties.summary;
    alert(`Route to ${destinationName}\nDistance: ${(summary.distance / 1000).toFixed(2)} km\nTime: ${(summary.duration / 60).toFixed(1)} min`);
  })
  .catch(err => {
    console.error("Routing error:", err);
    alert("Could not fetch directions.");
  });
}
