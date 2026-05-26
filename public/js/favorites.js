let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function getFavorites() {
  return favorites;
}

function isFavorite(source, id) {
  return favorites.some((fav) => fav.source === source && fav.id === id);
}

function addArtworkToFavorites(artwork) {
  if (!artwork) return;

  const exists = isFavorite(artwork.source, artwork.id);

  if (!exists) {
    favorites.push(artwork);
    saveFavorites();
  }
}

function removeArtworkFromFavorites(source, id) {
  favorites = favorites.filter(
    (fav) => !(fav.source === source && fav.id === id),
  );

  saveFavorites();
}
