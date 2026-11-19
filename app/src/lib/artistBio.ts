// Artist bios come from Wikipedia only — Spotify's Web API has never
// exposed biography text (a long-standing gap developers have asked
// Spotify to fill: https://github.com/spotify/web-api/issues/643), so
// there's no first tier to try before falling back here, unlike photos.
//
// Coverage will be much spottier than photos: plenty of working club
// DJs have a Spotify presence but no Wikipedia article at all. A null
// result just means "no bio available" — callers should hide the
// section entirely rather than showing an error.

import { findWikipediaSummary } from "./wikipedia";

// In-flight promises are cached too (see artistImage.ts for why).
const cache = new Map<string, Promise<string | null>>();

export function fetchArtistBio(name: string): Promise<string | null> {
  const query = name.trim();
  if (!query) return Promise.resolve(null);

  const key = query.toLowerCase();
  let pending = cache.get(key);
  if (!pending) {
    pending = findWikipediaSummary(query).then((summary) => summary?.extract?.trim() || null);
    cache.set(key, pending);
  }
  return pending;
}
