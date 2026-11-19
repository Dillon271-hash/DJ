// Looks up a real photo for a new artist, trying three tiers in order:
//
// 1. Spotify's artist search — checked first because it's specifically a
//    profile picture (not just any editorial photo) and has far better
//    coverage of working club DJs than Wikipedia ever will. Spotify
//    requires authentication even for basic search, so this can't be
//    called directly from the browser (the app's client secret can't
//    safely live in client-side code) — routed through this app's own
//    /api/artist-image endpoint, which holds the credentials
//    server-side and does the Spotify auth + search there. Only live
//    when this app is running somewhere that serves it (Vercel in
//    production, `npm run dev` locally, both configured with
//    SPOTIFY_CLIENT_ID/SECRET — see .env.example).
// 2. Wikipedia's infobox thumbnail and 3. Wikidata's separate P18
//    ("image") claim for the same page, as a fallback for legacy/
//    crossover artists Spotify's search misses — both public, keyless,
//    and genuinely CORS-enabled, so they're called directly from the
//    browser regardless of whether the Spotify proxy is configured.
//
// Callers should treat a null result (no page, no image, no route,
// network error) as "show a fallback avatar," not as an error to surface.

import { findWikipediaSummary } from "./wikipedia";

// Caches the in-flight promise, not just the settled result, so a list
// that shows the same artist several times (or a StrictMode double
// mount) shares one lookup instead of racing duplicate requests.
const cache = new Map<string, Promise<string | null>>();

export function fetchArtistImage(name: string): Promise<string | null> {
  const query = name.trim();
  if (!query) return Promise.resolve(null);

  const key = query.toLowerCase();
  let pending = cache.get(key);
  if (!pending) {
    pending = lookupProxy(query).then((hit) => hit ?? lookupWikipedia(query));
    cache.set(key, pending);
  }
  return pending;
}

async function lookupProxy(query: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/artist-image?name=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.image === "string" ? json.image : null;
  } catch {
    return null;
  }
}

async function lookupWikipedia(query: string): Promise<string | null> {
  const summary = await findWikipediaSummary(query);
  if (!summary) return null;

  const img = summary.originalimage?.source ?? summary.thumbnail?.source ?? null;
  if (img) return img;

  // Wikipedia's own infobox thumbnail is empty, but this is confirmed
  // to be the right page — Wikidata's P18 claim for the same item is
  // set independently and sometimes has a photo Wikipedia doesn't.
  return lookupWikidataImage(summary.wikibase_item);
}

async function lookupWikidataImage(qid: string | undefined): Promise<string | null> {
  if (!qid) return null;
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${encodeURIComponent(qid)}&property=P18&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const filename = json?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!filename || typeof filename !== "string") return null;
    // Special:FilePath redirects to the actual Commons file — safe to
    // drop straight into an <img src>, no extra lookup needed.
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  } catch {
    return null;
  }
}
