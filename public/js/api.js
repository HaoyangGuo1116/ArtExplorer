async function searchArtworks(query, page, source, hasImage) {
  const url = `/api/search?q=${encodeURIComponent(query)}&page=${page}&source=${source}&hasImage=${hasImage}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Search request failed.");
  }

  return await response.json();
}

async function fetchArtworkDetail(source, id) {
  const response = await fetch(`/api/artwork/${source}/${id}`);

  if (!response.ok) {
    throw new Error("Failed to load artwork detail.");
  }

  return await response.json();
}

async function fetchArtistBiography(artistName) {
  const response = await fetch(`/api/artist/${encodeURIComponent(artistName)}`);

  if (!response.ok) {
    throw new Error("Failed to load biography.");
  }

  return await response.json();
}

async function fetchRelatedWorks(artistName) {
  const response = await fetch(
    `/api/artist/${encodeURIComponent(artistName)}/works`,
  );

  if (!response.ok) {
    throw new Error("Failed to load related works.");
  }

  return await response.json();
}
