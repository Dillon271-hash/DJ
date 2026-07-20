// Looks up a real photo for an artist from two public, keyless,
// CORS-enabled APIs. There's no image-search API we can call from a
// browser without a paid key and a backend to hide it behind, so this is
// the closest honest equivalent: check Wikipedia first (usually better
// for legacy/crossover artists), then Deezer's artist catalog (usually
// better for newer club-circuit DJs who don't have a Wikipedia bio yet
// but do have a promo photo on every streaming service). Callers should
// treat a null result (no page, no image, network error) as "show a
// fallback avatar," not as an error to surface.

const cache = new Map<string, string | null>();

export async function fetchArtistImage(name: string, signal?: AbortSignal): Promise<string | null> {
  const query = name.trim();
  if (!query) return null;

  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const result = (await lookupWikipedia(query, signal)) ?? (await lookupDeezer(query, signal));
  // Only cache a settled result — never cache an in-flight abort as "no image."
  if (!signal?.aborted) cache.set(key, result);
  return result;
}

const NON_BIO_TITLE = /:|discography|\(album\)|\(ep\)|\(song\)|\(mixtape\)|\(film\)|\(tv series\)/i;

async function lookupWikipedia(query: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const searchUrl =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=" +
      encodeURIComponent(query);
    const searchRes = await fetch(searchUrl, { signal });
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const titles: string[] = (searchJson?.query?.search ?? []).map((r: { title: string }) => r.title);
    if (titles.length === 0) return null;

    for (const title of rankCandidates(query, titles)) {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryRes = await fetch(summaryUrl, { signal });
      if (!summaryRes.ok) continue;
      const summaryJson = await summaryRes.json();
      if (summaryJson?.type === "disambiguation") continue;
      if (!looksLikeMusicBio(summaryJson?.description)) continue;
      const img = summaryJson?.originalimage?.source ?? summaryJson?.thumbnail?.source ?? null;
      if (img) return img;
    }
    return null;
  } catch {
    return null;
  }
}

interface DeezerArtist {
  name: string;
  picture_big?: string;
  picture_medium?: string;
  nb_fan?: number;
}

// Deezer's catalog search is scoped to music artists already, so it
// doesn't have Wikipedia's "same word, totally different topic" problem
// — but two different artists can still share a stage name, so this
// only trusts an exact (case-insensitive) name match, and picks the one
// with the most fans if there's more than one.
async function lookupDeezer(query: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const url = "https://api.deezer.com/search/artist?limit=10&q=" + encodeURIComponent(query);
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    const results: DeezerArtist[] = json?.data ?? [];

    const q = query.trim().toLowerCase();
    const exact = results
      .filter((r) => r.name?.trim().toLowerCase() === q && (r.picture_big || r.picture_medium))
      .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0));

    return exact[0]?.picture_big ?? exact[0]?.picture_medium ?? null;
  } catch {
    return null;
  }
}

// Guards against a title that happens to normalize to an exact name match
// but is a completely unrelated topic (e.g. "Fisher" the DJ vs. "Fisher"
// the animal). Wikipedia's REST summary includes a short Wikidata-derived
// description; if it's present and clearly not about a musician, skip the
// candidate. An absent description isn't evidence either way, so let it
// through rather than rejecting a page we simply can't verify.
const MUSIC_BIO_HINT =
  /\bdj\b|musician|producer|singer|rapper|composer|songwriter|\bband\b|\bduo\b|artist|entertainer|vocalist|remixer/i;

function looksLikeMusicBio(description: string | undefined): boolean {
  if (!description) return true;
  return MUSIC_BIO_HINT.test(description);
}

// Wikipedia's free-text search ranks by relevance, not "is this a person's
// bio page" — a same-named album, single, or compilation often outranks
// the artist's own article, and a fuzzy/substring match can land on a
// completely different real person (e.g. querying "Fisher" the DJ and
// getting back "Eddie Fisher," a 1950s singer — a confidently wrong photo
// under the right name, which is worse than no photo). So this only
// trusts titles that normalize to the artist's *exact* name, allowing a
// trailing qualifier like "(musician)," and skips anything that looks
// like a release/media page rather than a biography.
function rankCandidates(query: string, titles: string[]): string[] {
  const q = query.trim().toLowerCase();
  const normalize = (t: string) =>
    t
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim()
      .toLowerCase();

  return titles.filter((t) => !NON_BIO_TITLE.test(t) && normalize(t) === q).slice(0, 3);
}
