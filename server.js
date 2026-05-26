const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

const HARVARD_API_KEY = process.env.HARVARD_API_KEY;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend is working!",
  });
});

// Normalize Met Museum object data
function normalizeMetArtwork(obj) {
  return {
    source: "met",
    id: String(obj.objectID),
    title: obj.title || "Untitled",
    artist: obj.artistDisplayName || "Unknown Artist",
    date: obj.objectDate || "Unknown Date",
    image: obj.primaryImageSmall || obj.primaryImage || "",
    museum: "The Metropolitan Museum of Art",
    medium: obj.medium || "Unknown Medium",
    dimensions: obj.dimensions || "Unknown Dimensions",
    department: obj.department || "Unknown Department",
    objectUrl: obj.objectURL || "",
  };
}

// Normalize Harvard object data
function normalizeHarvardArtwork(obj) {
  const imageUrl =
    obj.primaryimageurl ||
    (obj.images && obj.images.length > 0 ? obj.images[0].baseimageurl : "");

  return {
    source: "harvard",
    id: String(obj.id),
    title: obj.title || "Untitled",
    artist:
      obj.people && obj.people.length > 0
        ? obj.people[0].name
        : "Unknown Artist",
    date: obj.dated || "Unknown Date",
    image: imageUrl || "",
    museum: "Harvard Art Museums",
    medium: obj.medium || "Unknown Medium",
    dimensions: obj.dimensions || "Unknown Dimensions",
    department: obj.department || "Unknown Department",
    objectUrl: obj.url || "",
  };
}

// Search Met Museum
async function searchMet(query, page, hasImage) {
  const pageSize = 20;

  let searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(
    query,
  )}`;

  if (hasImage === "true") {
    searchUrl += "&hasImages=true";
  }

  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();

  const objectIDs = searchData.objectIDs || [];
  const total = objectIDs.length;

  const startIndex = (page - 1) * pageSize;
  const pageIDs = objectIDs.slice(startIndex, startIndex + pageSize);

  const detailPromises = pageIDs.map(async (id) => {
    try {
      const detailResponse = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
      );

      if (!detailResponse.ok) return null;

      const detailData = await detailResponse.json();
      const artwork = normalizeMetArtwork(detailData);

      if (hasImage === "true" && !artwork.image) {
        return null;
      }

      return artwork;
    } catch (error) {
      return null;
    }
  });

  const artworks = (await Promise.all(detailPromises)).filter(Boolean);

  return {
    results: artworks,
    total,
  };
}

// Search Harvard Art Museums
async function searchHarvard(query, page, hasImage) {
  if (!HARVARD_API_KEY) {
    console.warn("Missing HARVARD_API_KEY environment variable.");
    return {
      results: [],
      total: 0,
    };
  }

  let harvardUrl = `https://api.harvardartmuseums.org/object?keyword=${encodeURIComponent(
    query,
  )}&apikey=${HARVARD_API_KEY}&size=20&page=${page}`;

  if (hasImage === "true") {
    harvardUrl += "&hasimage=1";
  }

  const response = await fetch(harvardUrl);
  const data = await response.json();

  const records = data.records || [];

  const artworks = records.map(normalizeHarvardArtwork).filter((artwork) => {
    if (hasImage === "true") {
      return artwork.image;
    }
    return true;
  });

  return {
    results: artworks,
    total: data.info ? data.info.totalrecords : artworks.length,
  };
}

// Main search endpoint
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    const page = parseInt(req.query.page || "1", 10);
    const source = req.query.source || "both";
    const hasImage = req.query.hasImage || "false";

    if (!q || q.trim() === "") {
      return res.status(400).json({
        error: "Search query is required.",
      });
    }

    let results = [];
    let total = 0;

    if (source === "met") {
      const metData = await searchMet(q, page, hasImage);
      results = metData.results;
      total = metData.total;
    } else if (source === "harvard") {
      const harvardData = await searchHarvard(q, page, hasImage);
      results = harvardData.results;
      total = harvardData.total;
    } else {
      const [metData, harvardData] = await Promise.all([
        searchMet(q, page, hasImage),
        searchHarvard(q, page, hasImage),
      ]);

      results = [...metData.results, ...harvardData.results];
      total = metData.total + harvardData.total;
    }

    res.json({
      query: q,
      page,
      source,
      hasImage,
      total,
      results,
    });
  } catch (error) {
    console.error("Search API error:", error);

    res.status(500).json({
      error: "Failed to search artworks.",
    });
  }
});

// Get artwork detail by source and id
app.get("/api/artwork/:source/:id", async (req, res) => {
  try {
    const { source, id } = req.params;

    let artwork = null;

    if (source === "met") {
      const response = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
      );

      if (!response.ok) {
        return res.status(404).json({ error: "Met artwork not found." });
      }

      const data = await response.json();
      artwork = normalizeMetArtwork(data);

      artwork.museumLat = 40.7794;
      artwork.museumLng = -73.9632;
      artwork.museumAddress = "1000 5th Ave, New York, NY 10028";
    } else if (source === "harvard") {
      if (!HARVARD_API_KEY) {
        return res.status(500).json({
          error: "Missing Harvard API key.",
        });
      }

      const response = await fetch(
        `https://api.harvardartmuseums.org/object/${id}?apikey=${HARVARD_API_KEY}`,
      );

      if (!response.ok) {
        return res.status(404).json({ error: "Harvard artwork not found." });
      }

      const data = await response.json();
      artwork = normalizeHarvardArtwork(data);

      artwork.museumLat = 42.3744;
      artwork.museumLng = -71.1143;
      artwork.museumAddress = "32 Quincy St, Cambridge, MA 02138";
    } else {
      return res.status(400).json({
        error: "Invalid artwork source.",
      });
    }

    res.json(artwork);
  } catch (error) {
    console.error("Artwork detail API error:", error);

    res.status(500).json({
      error: "Failed to load artwork detail.",
    });
  }
});

// Get artist biography from Wikipedia
app.get("/api/artist/:name", async (req, res) => {
  try {
    const artistName = req.params.name;

    if (!artistName || artistName === "Unknown Artist") {
      return res.json({
        name: artistName,
        extract: "Biography not available.",
        url: "",
        thumbnail: "",
      });
    }

    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      artistName,
    )}`;

    const response = await fetch(wikiUrl);

    if (!response.ok) {
      return res.json({
        name: artistName,
        extract: "Biography not available.",
        url: "",
        thumbnail: "",
      });
    }

    const data = await response.json();

    res.json({
      name: data.title || artistName,
      extract: data.extract || "Biography not available.",
      url: data.content_urls?.desktop?.page || "",
      thumbnail: data.thumbnail?.source || "",
    });
  } catch (error) {
    console.error("Wikipedia API error:", error);

    res.status(500).json({
      error: "Failed to load artist biography.",
    });
  }
});

// Get other works by artist
app.get("/api/artist/:name/works", async (req, res) => {
  try {
    const artistName = req.params.name;

    if (!artistName || artistName === "Unknown Artist") {
      return res.json({
        artist: artistName,
        results: [],
      });
    }

    const page = 1;
    const hasImage = "true";

    const [metData, harvardData] = await Promise.all([
      searchMet(artistName, page, hasImage),
      searchHarvard(artistName, page, hasImage),
    ]);

    let results = [...metData.results, ...harvardData.results];

    // Keep results that seem related to this artist
    const normalizedArtist = artistName.toLowerCase();

    results = results.filter((artwork) => {
      const artworkArtist = (artwork.artist || "").toLowerCase();
      return (
        artworkArtist.includes(normalizedArtist) ||
        normalizedArtist.includes(artworkArtist)
      );
    });

    // Limit related works
    results = results.slice(0, 8);

    res.json({
      artist: artistName,
      results,
    });
  } catch (error) {
    console.error("Related works API error:", error);

    res.status(500).json({
      error: "Failed to load related works.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
