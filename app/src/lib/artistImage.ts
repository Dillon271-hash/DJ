// Looks up a real photo for an artist via Wikipedia's public, keyless,
// CORS-enabled API. There's no image-search API we can call from a
// browser without a paid key and a backend to hide it behind, so this is
// the closest honest equivalent: search Wikipedia for the artist, then
// pull the lead image off the best-matching page. Callers should treat a
// null result (no page, no image, network error) as "show a fallback
// avatar," not as an error to surface.

const NON_BIO_TITLE = /:|discography|\(album\)|\(ep\)|\(song\)|\(mixtape\)|\(film\)|\(tv series\)/i;

const cache = new Map<string, string | null>();

export async function fetchArtistImage(name: string, signal?: AbortSignal): Promise<string | null> {
  const query = name.trim();
  if (!query) return null;

  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const result = await lookup(query, signal);
  // Only cache a settled result — never cache an in-flight abort as "no image."
  if (!signal?.aborted) cache.set(key, result);
  return result;
}

async function lookup(query: string, signal?: AbortSignal): Promise<string | null> {
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
