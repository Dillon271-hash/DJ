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

const cache = new Map<string, string | null>();

export async function fetchArtistBio(name: string, signal?: AbortSignal): Promise<string | null> {
  const query = name.trim();
  if (!query) return null;

  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const summary = await findWikipediaSummary(query, signal);
  const bio = summary?.extract?.trim() || null;
  if (!signal?.aborted) cache.set(key, bio);
  return bio;
}
