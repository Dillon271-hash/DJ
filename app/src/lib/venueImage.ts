// Photos for venues/festivals, from Wikipedia — there's no Spotify-like
// source for venues. Same strict exact-title matching as artist photos
// (see wikipedia.ts), with a venue-shaped description check instead of a
// musician one. The search adds "nightclub"/"festival" so the venue's
// page isn't crowded out by same-named things ("Amnesia" the condition,
// "Tomorrowland" the film). Plenty of smaller clubs have no article;
// callers fall back to a styled placeholder on null.

import { findWikipediaSummary, looksLikeVenue } from "./wikipedia";
import { SEED_VENUES } from "./venues";

const cache = new Map<string, Promise<string | null>>();

export function fetchVenueImage(venueName: string): Promise<string | null> {
  const query = venueName.trim();
  if (!query) return Promise.resolve(null);

  const key = query.toLowerCase();
  let pending = cache.get(key);
  if (!pending) {
    const kind = SEED_VENUES.find((v) => v.name.toLowerCase() === key)?.kind;
    const hint = kind === "festival" ? "festival" : "nightclub";
    pending = findWikipediaSummary(query, looksLikeVenue, hint)
      .then((s) => s ?? findWikipediaSummary(query, looksLikeVenue))
      .then((s) => s?.originalimage?.source ?? s?.thumbnail?.source ?? null);
    cache.set(key, pending);
  }
  return pending;
}
