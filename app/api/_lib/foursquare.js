// Foursquare's Places API, used server-side for venue autocomplete.
// Requires a free developer account for FOURSQUARE_API_KEY (see
// .env.example) — silently returns an empty list if it's missing, same
// as any other "no suggestions available" case.
export async function searchVenues(query) {
  const q = (query ?? "").trim();
  if (!q) return [];

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = "https://api.foursquare.com/v3/places/search?limit=8&query=" + encodeURIComponent(q);
    const res = await fetch(url, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];

    return results
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
  } catch {
    return [];
  }
}
