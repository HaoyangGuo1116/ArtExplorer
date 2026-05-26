let museumMap = null;

function setupMapTab(artwork) {
  const mapTabButton = document.querySelector('[data-bs-target="#mapTab"]');

  if (!mapTabButton) return;

  mapTabButton.addEventListener("shown.bs.tab", () => {
    initializeMuseumMap(artwork);

    setTimeout(() => {
      if (museumMap) {
        museumMap.invalidateSize();
      }
    }, 100);
  });
}

function initializeMuseumMap(artwork) {
  const mapContainer = document.getElementById("map");

  if (!mapContainer) return;

  const lat = artwork.museumLat;
  const lng = artwork.museumLng;

  if (!lat || !lng) {
    mapContainer.innerHTML = `
      <p class="text-muted p-3">Museum location not available.</p>
    `;
    return;
  }

  if (museumMap) {
    museumMap.remove();
    museumMap = null;
  }

  museumMap = L.map("map").setView([lat, lng], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(museumMap);

  const popupContent = `
  <strong>${artwork.museum || "Museum"}</strong><br>
  <span>${artwork.museumAddress || "Address not available"}</span>
`;

  L.marker([lat, lng]).addTo(museumMap).bindPopup(popupContent).openPopup();
}
