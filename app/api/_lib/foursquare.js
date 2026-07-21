// Foursquare's Places API, used server-side for venue autocomplete.
// Requires a free developer account for FOURSQUARE_API_KEY (see
// .env.example) — silently returns an empty list if it's missing, same
// as any other "no suggestions available" case.
// Substring keywords matched against each place's category name(s), which
// Foursquare includes on every result — avoids depending on the exact
// numeric category IDs in their newer taxonomy, which aren't reliably
// documented and would silently break matching if guessed wrong.
const NIGHTLIFE_KEYWORDS = [
  "night club",
  "nightclub",
  "dance club",
  "music venue",
  "concert",
  "festival",
];

function isNightlifeOrFestival(place) {
  const categories = Array.isArray(place?.categories) ? place.categories : [];
  return categories.some((c) => {
    const name = (c?.name ?? "").toLowerCase();
    return NIGHTLIFE_KEYWORDS.some((kw) => name.includes(kw));
  });
}

export async function searchVenues(query) {
  const q = (query ?? "").trim();
  if (!q) return [];

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    console.error("[venue-search] FOURSQUARE_API_KEY is not set");
    return [];
  }

  try {
    // Fetch a wider pool (limit 20) and a much larger radius (100km, the
    // API max) than we actually show, since narrowing to nightlife/festival
    // categories after the fact can otherwise leave very few results in a
    // small town.
    const url =
      "https://places-api.foursquare.com/places/search?limit=20&radius=100000&query=" +
      encodeURIComponent(q);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Places-Api-Version": "2025-06-17",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[venue-search] Foursquare returned ${res.status}: ${body}`);
      return [];
    }
    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];

    // Prefer nightlife/festival matches, but if that leaves nothing (e.g.
    // the user typed an exact venue name that's categorized oddly), fall
    // back to the unfiltered results rather than showing an empty list.
    const filtered = results.filter(isNightlifeOrFestival);
    const pool = filtered.length > 0 ? filtered : results;

    return pool
      .slice(0, 8)
      .map((place) => {
        const city = place?.location?.locality || place?.location?.region || "";
        const country = place?.location?.country || "";
        const place_label = [city, country].filter(Boolean).join(", ");
        return {
          name: place?.name ?? "",
          city: place_label,
        };
      })
      .filter((v) => v.name);
  } catch (err) {
    console.error("[venue-search] request failed:", err);
    return [];
  }
}
