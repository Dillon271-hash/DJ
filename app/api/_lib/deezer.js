// Deezer's public artist search has real coverage for working club DJs
// who don't have a Wikipedia bio page yet, but its API doesn't send
// Access-Control-Allow-Origin, so browsers block it via CORS no matter
// what. This runs server-side (Vercel function in prod, Vite dev
// middleware locally) specifically to get around that — server-to-server
// requests aren't subject to CORS at all.
export async function lookupDeezerImage(name) {
  const query = (name ?? "").trim();
  if (!query) return null;

  try {
    const url = "https://api.deezer.com/search/artist?limit=10&q=" + encodeURIComponent(query);
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const results = Array.isArray(json?.data) ? json.data : [];

    const q = query.toLowerCase();
    // Same policy as the client-side Wikipedia matcher: only an exact
    // (case-insensitive) name match is trusted, so this can't resolve to
    // a different artist who happens to share a stage name. Ties broken
    // by fan count, favoring the more likely "the famous one."
    const exact = results
      .filter((r) => r?.name?.trim().toLowerCase() === q && (r.picture_big || r.picture_medium))
      .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0));

    return exact[0]?.picture_big ?? exact[0]?.picture_medium ?? null;
  } catch {
    return null;
  }
}
