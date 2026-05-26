const searchView = document.getElementById("searchView");
const detailView = document.getElementById("detailView");
const favoritesView = document.getElementById("favoritesView");

const navSearch = document.getElementById("navSearch");
const navFavorites = document.getElementById("navFavorites");
const brandLink = document.getElementById("brandLink");

const searchInput = document.getElementById("searchInput");
const sourceSelect = document.getElementById("sourceSelect");
const hasImageCheck = document.getElementById("hasImageCheck");
const searchBtn = document.getElementById("searchBtn");

const resultCount = document.getElementById("resultCount");
const resultsArea = document.getElementById("resultsArea");
const loadingArea = document.getElementById("loadingArea");
const paginationArea = document.getElementById("paginationArea");
const pageIndicator = document.getElementById("pageIndicator");

const detailContent = document.getElementById("detailContent");
const backToResultsBtn = document.getElementById("backToResultsBtn");

const favoritesArea = document.getElementById("favoritesArea");
const emptyFavorites = document.getElementById("emptyFavorites");
const favoritesCount = document.getElementById("favoritesCount");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let previousView = "search";
let currentPage = 1;
let currentResults = [];
let currentQuery = "";
let currentSource = "both";
let currentHasImage = true;
let totalResults = 0;
let currentDetailArtwork = null;
let debounceTimer = null;

function debounceSearch() {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    const query = searchInput.value.trim();

    if (query.length >= 2) {
      performSearch(1);
    }
  }, 300);
}

function showSearchView() {
  searchView.classList.remove("d-none");
  detailView.classList.add("d-none");
  favoritesView.classList.add("d-none");

  navSearch.classList.add("active");
  navFavorites.classList.remove("active");
}

function showDetailView() {
  searchView.classList.add("d-none");
  detailView.classList.remove("d-none");
  favoritesView.classList.add("d-none");

  navSearch.classList.remove("active");
  navFavorites.classList.remove("active");
}

function showFavoritesView() {
  searchView.classList.add("d-none");
  detailView.classList.add("d-none");
  favoritesView.classList.remove("d-none");

  navSearch.classList.remove("active");
  navFavorites.classList.add("active");

  renderFavorites();
}

function getBadgeClass(source) {
  return source === "harvard" ? "badge-harvard" : "badge-met";
}

function getSourceLabel(source) {
  return source === "harvard" ? "HARVARD" : "MET";
}

function renderArtworkCard(artwork, isFavoritePage = false) {
  const imageHtml = artwork.image
    ? `<img src="${artwork.image}" alt="${artwork.title}" class="art-image">`
    : `<div class="no-image">No Image Available</div>`;

  const favoriteDeleteButton = isFavoritePage
    ? `
      <button
        class="favorite-delete-btn"
        onclick="event.stopPropagation(); removeFavorite('${artwork.source}', '${artwork.id}')"
        title="Remove from Favorites"
      >
        ×
      </button>
    `
    : "";

  return `
    <div class="col-6 col-md-4 col-lg-3">
      <div 
        class="card art-card ${isFavoritePage ? "favorite-card" : ""}" 
        onclick="openDetail('${artwork.source}', '${artwork.id}', '${isFavoritePage ? "favorites" : "search"}')"
      >
        <div class="art-image-wrapper">
          ${imageHtml}

          <span class="badge source-badge ${getBadgeClass(artwork.source)}">
            ${getSourceLabel(artwork.source)}
          </span>

          ${favoriteDeleteButton}
        </div>

        <div class="art-card-body">
          <div class="art-title">${artwork.title || "Untitled"}</div>
          <div class="art-artist">${artwork.artist || "Unknown Artist"}</div>
          <div class="art-date">${artwork.date || "Unknown Date"}</div>
        </div>
      </div>
    </div>
  `;
}

function renderResults(artworks, total = artworks.length) {
  resultCount.textContent = `${total} results found`;
  resultCount.classList.remove("d-none");

  if (!artworks || artworks.length === 0) {
    resultsArea.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        No results found.
      </div>
    `;
    paginationArea.classList.add("d-none");
    return;
  }

  resultsArea.innerHTML = artworks
    .map((art) => renderArtworkCard(art))
    .join("");

  paginationArea.classList.remove("d-none");

  const totalPages = Math.max(1, Math.ceil(total / 20));
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

async function performSearch(page = 1) {
  const query = searchInput.value.trim();
  const source = sourceSelect.value;
  const hasImage = hasImageCheck.checked;

  if (!query) {
    alert("Please enter a search keyword.");
    return;
  }

  currentPage = page;
  currentQuery = query;
  currentSource = source;
  currentHasImage = hasImage;

  showLoadingSkeleton();

  try {
    const data = await searchArtworks(query, page, source, hasImage);

    currentResults = data.results || [];
    totalResults = data.total || 0;

    renderResults(currentResults, totalResults);
  } catch (error) {
    console.error(error);

    resultsArea.innerHTML = `
      <div class="col-12 text-center text-danger py-5">
        Failed to load search results. Please try again.
      </div>
    `;

    resultCount.classList.add("d-none");
    paginationArea.classList.add("d-none");
  } finally {
    hideLoadingSkeleton();
  }
}

async function openDetail(source, id, fromView = "search") {
  previousView = fromView;

  backToResultsBtn.textContent =
    previousView === "favorites" ? "← Back to Favorites" : "← Back to Results";

  detailContent.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading artwork details...</p>
    </div>
  `;

  showDetailView();

  try {
    const artwork = await fetchArtworkDetail(source, id);
    currentDetailArtwork = artwork;

    const imageHtml = artwork.image
      ? `<img src="${artwork.image}" alt="${artwork.title}" class="detail-image">`
      : `<div class="detail-no-image">No Image Available</div>`;

    const favoriteButtonClass = isFavorite(artwork.source, artwork.id)
      ? "btn-danger"
      : "btn-outline-danger";

    const favoriteButtonText = isFavorite(artwork.source, artwork.id)
      ? "♥ Remove from Favorites"
      : "♡ Add to Favorites";

    const museumLinkHtml = artwork.objectUrl
      ? `
        <a href="${artwork.objectUrl}" target="_blank" class="btn btn-outline-primary btn-sm mt-3">
          View on Museum Website
        </a>
      `
      : "";

    detailContent.innerHTML = `
      <div class="detail-layout">
        <div class="detail-image-panel">
          ${imageHtml}

          <button
            id="detailFavoriteBtn"
            class="btn ${favoriteButtonClass} favorite-detail-btn"
            onclick="toggleFavoriteFromDetail('${artwork.source}', '${artwork.id}')"
          >
            ${favoriteButtonText}
          </button>
        </div>

        <div>
          <h1 class="detail-title">${artwork.title || "Untitled"}</h1>
          <p class="detail-artist">${artwork.artist || "Unknown Artist"}</p>

          <ul class="nav nav-tabs" id="artworkTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#overviewTab" type="button">
                Overview
              </button>
            </li>

            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" data-bs-target="#bioTab" type="button">
                Artist Biography
              </button>
            </li>

            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" data-bs-target="#relatedTab" type="button">
                Related Works
              </button>
            </li>

            <li class="nav-item" role="presentation">
              <button class="nav-link" data-bs-toggle="tab" data-bs-target="#mapTab" type="button">
                Museum Location
              </button>
            </li>
          </ul>

          <div class="tab-content">
            <div class="tab-pane fade show active" id="overviewTab">
              <table class="detail-table">
                <tr>
                  <th>Date</th>
                  <td>${artwork.date || "Unknown Date"}</td>
                </tr>
                <tr>
                  <th>Medium</th>
                  <td>${artwork.medium || "Unknown Medium"}</td>
                </tr>
                <tr>
                  <th>Dimensions</th>
                  <td>${artwork.dimensions || "Unknown Dimensions"}</td>
                </tr>
                <tr>
                  <th>Department</th>
                  <td>${artwork.department || "Unknown Department"}</td>
                </tr>
                <tr>
                  <th>Museum</th>
                  <td>${artwork.museum || "Unknown Museum"}</td>
                </tr>
              </table>

              ${museumLinkHtml}
            </div>

            <div class="tab-pane fade" id="bioTab">
              <p>Loading artist biography...</p>
            </div>

            <div class="tab-pane fade" id="relatedTab">
              <p>Loading related works...</p>
            </div>

            <div class="tab-pane fade" id="mapTab">
              <div id="map"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    loadArtistBiography(artwork.artist);
    loadRelatedWorks(artwork.artist, artwork.source, artwork.id);
    setupMapTab(artwork);
  } catch (error) {
    console.error(error);

    detailContent.innerHTML = `
      <div class="alert alert-danger">
        Failed to load artwork details. Please go back and try again.
      </div>
    `;
  }
}

async function loadArtistBiography(artistName) {
  const bioTab = document.getElementById("bioTab");

  if (!bioTab) return;

  if (!artistName || artistName === "Unknown Artist") {
    bioTab.innerHTML = `<p class="text-muted">Biography not available.</p>`;
    return;
  }

  bioTab.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading artist biography...</p>
    </div>
  `;

  try {
    const data = await fetchArtistBiography(artistName);

    const thumbnailHtml = data.thumbnail
      ? `
        <img 
          src="${data.thumbnail}" 
          alt="${data.name}" 
          class="bio-thumbnail"
        />
      `
      : "";

    const linkHtml = data.url
      ? `
        <a href="${data.url}" target="_blank" class="btn btn-outline-primary btn-sm mt-3">
          View Full Wikipedia Article
        </a>
      `
      : "";

    bioTab.innerHTML = `
      <div class="artist-bio">
        ${thumbnailHtml}

        <div>
          <h5>${data.name || artistName}</h5>
          <p>${data.extract || "Biography not available."}</p>
          ${linkHtml}
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);

    bioTab.innerHTML = `
      <p class="text-muted">Biography not available.</p>
    `;
  }
}

async function loadRelatedWorks(artistName, currentSource, currentId) {
  const relatedTab = document.getElementById("relatedTab");

  if (!relatedTab) return;

  if (!artistName || artistName === "Unknown Artist") {
    relatedTab.innerHTML = `<p class="text-muted">No related works found.</p>`;
    return;
  }

  relatedTab.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3 text-muted">Loading related works...</p>
    </div>
  `;

  try {
    const data = await fetchRelatedWorks(artistName);

    let works = data.results || [];

    works = works.filter(
      (work) => !(work.source === currentSource && work.id === currentId),
    );

    if (works.length === 0) {
      relatedTab.innerHTML = `
        <p class="text-muted">No related works found.</p>
      `;
      return;
    }

    relatedTab.innerHTML = `
      <div class="row g-3">
        ${works.map((work) => renderRelatedWorkCard(work)).join("")}
      </div>
    `;
  } catch (error) {
    console.error(error);

    relatedTab.innerHTML = `
      <p class="text-muted">No related works found.</p>
    `;
  }
}

function renderRelatedWorkCard(artwork) {
  const imageHtml = artwork.image
    ? `<img src="${artwork.image}" alt="${artwork.title}" class="related-image">`
    : `<div class="related-no-image">No Image</div>`;

  return `
    <div class="col-sm-6 col-lg-4">
      <div 
        class="related-card"
        onclick="openDetail('${artwork.source}', '${artwork.id}', 'search')"
      >
        <div class="related-image-wrapper">
          ${imageHtml}
          <span class="badge source-badge ${getBadgeClass(artwork.source)}">
            ${getSourceLabel(artwork.source)}
          </span>
        </div>

        <div class="related-body">
          <div class="related-title">${artwork.title || "Untitled"}</div>
          <div class="related-date">${artwork.date || "Unknown Date"}</div>
        </div>
      </div>
    </div>
  `;
}

function addFavorite(source, id) {
  let artwork = null;

  if (
    currentDetailArtwork &&
    currentDetailArtwork.source === source &&
    currentDetailArtwork.id === id
  ) {
    artwork = currentDetailArtwork;
  } else {
    artwork = currentResults.find(
      (art) => art.source === source && art.id === id,
    );
  }

  if (!artwork) return;

  addArtworkToFavorites(artwork);
  updateFavoritesCount();
}

function removeFavorite(source, id, shouldRenderFavorites = true) {
  removeArtworkFromFavorites(source, id);
  updateFavoritesCount();

  if (shouldRenderFavorites) {
    renderFavorites();
  }
}

function toggleFavoriteFromDetail(source, id) {
  if (isFavorite(source, id)) {
    removeFavorite(source, id, false);
  } else {
    addFavorite(source, id);
  }

  const btn = document.getElementById("detailFavoriteBtn");

  if (btn) {
    if (isFavorite(source, id)) {
      btn.classList.remove("btn-outline-danger");
      btn.classList.add("btn-danger");
      btn.textContent = "♥ Remove from Favorites";
    } else {
      btn.classList.remove("btn-danger");
      btn.classList.add("btn-outline-danger");
      btn.textContent = "♡ Add to Favorites";
    }
  }
}

function renderFavorites() {
  const favorites = getFavorites();

  if (favorites.length === 0) {
    favoritesArea.innerHTML = "";
    emptyFavorites.classList.remove("d-none");
    return;
  }

  emptyFavorites.classList.add("d-none");
  favoritesArea.innerHTML = favorites
    .map((art) => renderArtworkCard(art, true))
    .join("");
}

function updateFavoritesCount() {
  const favorites = getFavorites();

  if (favorites.length > 0) {
    favoritesCount.textContent = favorites.length;
    favoritesCount.classList.remove("d-none");
  } else {
    favoritesCount.classList.add("d-none");
  }
}

function showLoadingSkeleton() {
  resultCount.classList.add("d-none");
  resultsArea.innerHTML = "";
  loadingArea.classList.remove("d-none");
  paginationArea.classList.add("d-none");

  loadingArea.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    loadingArea.innerHTML += `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="skeleton-card">
          <div class="skeleton-img"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `;
  }
}

function hideLoadingSkeleton() {
  loadingArea.classList.add("d-none");
}

searchBtn.addEventListener("click", () => performSearch(1));

searchInput.addEventListener("input", debounceSearch);

navSearch.addEventListener("click", showSearchView);

brandLink.addEventListener("click", showSearchView);

navFavorites.addEventListener("click", showFavoritesView);

backToResultsBtn.addEventListener("click", () => {
  if (previousView === "favorites") {
    showFavoritesView();
  } else {
    showSearchView();
  }
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    performSearch(currentPage - 1);
  }
});

nextBtn.addEventListener("click", () => {
  performSearch(currentPage + 1);
});

sourceSelect.addEventListener("change", () => {
  if (searchInput.value.trim().length >= 2) {
    performSearch(1);
  }
});

hasImageCheck.addEventListener("change", () => {
  if (searchInput.value.trim().length >= 2) {
    performSearch(1);
  }
});

updateFavoritesCount();
